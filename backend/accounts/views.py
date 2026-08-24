from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import RetrieveAPIView
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import (
    CURRENCY_CHOICES, PlanChangeRequest, Restaurant, Role,
    generate_temp_password, get_user_restaurant, get_user_role,
)
from .permissions import CanManageUsers, IsSuperAdmin
from .serializers import (
    CustomTokenObtainPairSerializer,
    MeSerializer,
    PlanChangeRequestSerializer,
    RestaurantSerializer,
    RoleSerializer,
    UserAdminSerializer,
)


class ProfileAvatarView(APIView):
    """Sube o quita la foto de perfil del usuario autenticado."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def _url(self, request, prof):
        from .serializers import _media
        return _media(prof.avatar.name, {'request': request}) if prof.avatar else None

    def post(self, request):
        prof = getattr(request.user, 'profile', None)
        if prof is None:
            return Response({'detail': 'Sin perfil.'}, status=400)
        f = request.FILES.get('avatar')
        if not f:
            return Response({'avatar': 'Falta el archivo.'}, status=400)
        prof.avatar = f
        prof.save(update_fields=['avatar'])
        return Response({'avatar': self._url(request, prof)})

    def delete(self, request):
        prof = getattr(request.user, 'profile', None)
        if prof and prof.avatar:
            prof.avatar.delete(save=False)
            prof.avatar = None
            prof.save(update_fields=['avatar'])
        return Response({'avatar': None})


class PlanChangeRequestViewSet(viewsets.ModelViewSet):
    """Solicitudes de cambio de plan. El OWNER de un restaurante crea la suya;
    el superadmin las ve todas y las marca como aplicadas/rechazadas."""

    serializer_class = PlanChangeRequestSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        u = self.request.user
        if u.is_superuser:
            qs = PlanChangeRequest.objects.select_related('restaurant').all()
            rid = self.request.query_params.get('restaurant')
            if rid:
                qs = qs.filter(restaurant_id=rid)
            status = self.request.query_params.get('status')
            return qs.filter(status=status) if status else qs
        r = get_user_restaurant(u)
        return PlanChangeRequest.objects.filter(restaurant=r) if r else PlanChangeRequest.objects.none()

    def perform_create(self, serializer):
        u = self.request.user
        if u.is_superuser:
            restaurant = Restaurant.objects.filter(pk=self.request.data.get('restaurant')).first()
        else:
            if get_user_role(u) != 'owner':
                raise PermissionDenied('Solo el dueño puede solicitar un cambio de plan.')
            restaurant = get_user_restaurant(u)
        if not restaurant:
            raise ValidationError('Sin restaurante.')
        # El estado siempre nace pendiente (solo el superadmin lo resuelve).
        serializer.save(restaurant=restaurant, created_by=u, status=PlanChangeRequest.STATUS_PENDING)

    def perform_update(self, serializer):
        if not self.request.user.is_superuser:
            raise PermissionDenied('Solo el administrador puede resolver solicitudes.')
        instance = serializer.save()
        if instance.status != PlanChangeRequest.STATUS_PENDING and instance.resolved_at is None:
            instance.resolved_at = timezone.now()
            instance.save(update_fields=['resolved_at'])


class ChangePasswordView(APIView):
    """El usuario autenticado cambia su propia contraseña (usada también para el
    cambio obligatorio tras entrar con una contraseña temporal)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        current = request.data.get('current_password') or ''
        new = request.data.get('new_password') or ''
        if not user.check_password(current):
            return Response({'current_password': 'La contraseña actual no es correcta.'}, status=400)
        try:
            validate_password(new, user)
        except DjangoValidationError as e:
            return Response({'new_password': list(e.messages)}, status=400)
        user.set_password(new)
        user.save()
        prof = getattr(user, 'profile', None)
        if prof and prof.must_change_password:
            prof.must_change_password = False
            prof.save(update_fields=['must_change_password'])
        return Response({'detail': 'Contraseña actualizada.'})


class LoginView(TokenObtainPairView):
    """POST usuario/contraseña -> access + refresh + rol + restaurante."""

    serializer_class = CustomTokenObtainPairSerializer


class MeView(RetrieveAPIView):
    """GET datos del usuario autenticado."""

    permission_classes = [IsAuthenticated]
    serializer_class = MeSerializer

    def get_object(self):
        return self.request.user


class RestaurantSettingsView(APIView):
    """Ajustes del restaurante que el DUEÑO puede cambiar desde el cliente
    (de momento, la moneda). Solo el owner de su propio restaurante (o el
    superadmin). El admin de plataforma cambia esto desde RestaurantViewSet."""

    permission_classes = [IsAuthenticated]

    def patch(self, request):
        if get_user_role(request.user) not in ('owner', 'superadmin'):
            raise PermissionDenied('Solo el dueño puede cambiar los ajustes del restaurante.')
        r = get_user_restaurant(request.user)
        if not r:
            raise PermissionDenied('No tienes un restaurante asignado.')
        currency = request.data.get('currency')
        if currency not in {c[0] for c in CURRENCY_CHOICES}:
            return Response({'currency': 'Moneda no válida.'}, status=400)
        r.currency = currency
        r.save(update_fields=['currency'])
        return Response({'currency': r.currency})


class UserAdminViewSet(viewsets.ModelViewSet):
    """CRUD de usuarios. El Super Admin gestiona cualquier restaurante; un owner
    con `can_manage_users` gestiona SOLO el suyo (nunca superadmins ni otros
    tenants). El scoping se aplica en get_queryset (lectura/objeto) y en los
    overrides de create/update (escritura)."""

    serializer_class = UserAdminSerializer
    permission_classes = [CanManageUsers]

    def get_queryset(self):
        u = self.request.user
        qs = User.objects.prefetch_related(
            'memberships__restaurant', 'memberships__role',
        ).order_by('id')
        # Owner (no superadmin): SOLO usuarios de su restaurante, nunca superadmins.
        if not u.is_superuser:
            return qs.filter(memberships__restaurant=get_user_restaurant(u),
                             is_superuser=False).distinct()
        # Super Admin: filtros opcionales por query params.
        restaurant_id = self.request.query_params.get('restaurant')
        if restaurant_id:
            qs = qs.filter(memberships__restaurant_id=restaurant_id)
        role = self.request.query_params.get('role')
        if role == 'superadmin':
            qs = qs.filter(is_superuser=True)
        elif role:
            qs = qs.filter(memberships__role__key=role)
        return qs.distinct()

    def _scope_for_owner(self, request):
        """Fuerza el restaurante del owner y bloquea la creación de superadmins,
        para que un owner NUNCA toque otro tenant ni escale privilegios."""
        rest = get_user_restaurant(request.user)
        data = request.data.copy()
        data['restaurant'] = rest.id if rest else None
        if data.get('role') == 'superadmin':
            raise PermissionDenied('No puedes crear administradores de plataforma.')
        return data

    def create(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            serializer = self.get_serializer(data=self._scope_for_owner(request))
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            return Response(serializer.data, status=201)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            instance = self.get_object()  # ya scoped a su restaurante por get_queryset
            serializer = self.get_serializer(
                instance, data=self._scope_for_owner(request), partial=kwargs.get('partial', False),
            )
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if self.get_object().id == request.user.id:
            raise PermissionDenied('No puedes eliminar tu propia cuenta.')
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Restablece la contraseña a una temporal (se devuelve una vez) y obliga
        al usuario a cambiarla al entrar."""
        user = self.get_object()
        temp = generate_temp_password()
        user.set_password(temp)
        user.save()
        prof = getattr(user, 'profile', None)
        if prof:
            prof.must_change_password = True
            prof.save(update_fields=['must_change_password'])
        return Response({'generated_password': temp})


class RestaurantViewSet(viewsets.ModelViewSet):
    """CRUD de restaurantes (tenants), solo para el Super Admin."""

    queryset = Restaurant.objects.prefetch_related('memberships__user', 'recipes').all()
    serializer_class = RestaurantSerializer
    permission_classes = [IsSuperAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]


class RoleViewSet(viewsets.ModelViewSet):
    """Listar y editar los flags de los roles de un restaurante. El Super Admin,
    cualquier restaurante; un owner con `can_manage_users`, SOLO el suyo.

    Solo GET y PATCH: los 4 roles se crean con el restaurante; aquí se ajustan
    sus permisos (?restaurant=<id> para filtrar, solo el Super Admin).
    """

    serializer_class = RoleSerializer
    permission_classes = [CanManageUsers]
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_queryset(self):
        u = self.request.user
        qs = Role.objects.select_related('restaurant').order_by('restaurant_id', 'id')
        # Owner: SOLO los roles de su restaurante (ignora el param restaurant).
        if not u.is_superuser:
            return qs.filter(restaurant=get_user_restaurant(u))
        restaurant_id = self.request.query_params.get('restaurant')
        return qs.filter(restaurant_id=restaurant_id) if restaurant_id else qs
