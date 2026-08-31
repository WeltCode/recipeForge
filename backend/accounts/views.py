from datetime import timedelta

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import RetrieveAPIView
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .emails import (
    send_admin_new_signup, send_admin_plan_change, send_password_reset, send_welcome_email,
)
from .models import (
    CURRENCY_CHOICES, Membership, PlanChangeRequest, Restaurant, Role,
    generate_temp_password, get_user_restaurant, get_user_role, plan_features,
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
        obj = serializer.save(restaurant=restaurant, created_by=u, status=PlanChangeRequest.STATUS_PENDING)
        # Aviso al admin (además del banner del dashboard). No rompe la petición.
        send_admin_plan_change(restaurant, obj.get_requested_plan_display(), u)

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


def _prefix_from_name(name):
    """Prefijo corto para los códigos de receta a partir del nombre del negocio."""
    words = [w for w in ''.join(c if c.isalnum() else ' ' for c in name).split() if w]
    if len(words) >= 2:
        pref = ''.join(w[0] for w in words[:4])
    elif words:
        pref = words[0][:4]
    else:
        pref = 'RF'
    return pref.upper()[:6]


def _login_payload(user, request, extra=None):
    """Devuelve el mismo contexto que /me + los tokens JWT (para autologin)."""
    from .serializers import MeSerializer
    data = MeSerializer(user, context={'request': request}).data
    refresh = RefreshToken.for_user(user)
    data['access'] = str(refresh.access_token)
    data['refresh'] = str(refresh)
    if extra:
        data.update(extra)
    return data


class SignupView(APIView):
    """Alta autoservicio a la PRUEBA (abierta): crea un restaurante en plan Prueba
    + su usuario owner, envía bienvenida + aviso al admin, y autentica. Con
    throttling antiabuso. La info fiscal completa se pedirá al pasar a un plan de
    pago (más adelante)."""

    permission_classes = [AllowAny]
    throttle_scope = 'signup'

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        name = (request.data.get('restaurant_name') or '').strip()
        password = request.data.get('password') or ''
        first_name = (request.data.get('first_name') or '').strip()
        account_type = request.data.get('account_type') or 'restaurant'
        if account_type not in ('restaurant', 'individual'):
            account_type = 'restaurant'

        if not email or '@' not in email:
            return Response({'email': 'Introduce un correo válido.'}, status=400)
        if not name:
            return Response({'restaurant_name': 'Indica el nombre de tu negocio o el tuyo.'}, status=400)
        if User.objects.filter(username__iexact=email).exists():
            return Response({'email': 'Ya existe una cuenta con ese correo.'}, status=400)
        try:
            validate_password(password)
        except DjangoValidationError as e:
            return Response({'password': list(e.messages)}, status=400)

        with transaction.atomic():
            restaurant = Restaurant.objects.create(
                name=name, plan='prueba', business_type=account_type,
                code_prefix=_prefix_from_name(name),
            )  # el signal crea los 4 roles
            feats = plan_features(restaurant)
            if feats.get('trial') and restaurant.trial_ends_at is None:
                restaurant.trial_ends_at = timezone.now() + timedelta(days=feats.get('trial_days') or 30)
                restaurant.save(update_fields=['trial_ends_at'])
            user = User(username=email, email=email, first_name=first_name)
            user.set_password(password)
            user.save()  # el signal crea el UserProfile
            role = Role.objects.filter(restaurant=restaurant, key='owner').first()
            Membership.objects.create(user=user, restaurant=restaurant, role=role)

        # Correos (nunca rompen la petición).
        send_welcome_email(user, restaurant)
        send_admin_new_signup(restaurant, user)
        return Response(_login_payload(user, request), status=201)


class PasswordResetRequestView(APIView):
    """Restablecer contraseña (autoservicio) igual que el reset de admin/owner:
    si el correo existe, genera una contraseña TEMPORAL, la envía por correo y
    obliga a cambiarla al entrar. Responde 200 SIEMPRE (no revela si el correo
    está registrado). El envío real depende del correo estar configurado."""

    permission_classes = [AllowAny]
    throttle_scope = 'password_reset'

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        ok = {'detail': 'Si el correo está registrado, te enviaremos una contraseña temporal para entrar.'}
        if not email:
            return Response(ok)
        user = User.objects.filter(username__iexact=email).first() or User.objects.filter(email__iexact=email).first()
        # Solo si tiene un correo al que enviar la temporal (si no, no se toca la cuenta).
        target = (user.email or (user.username if user and '@' in user.username else '')) if user else ''
        if user and user.is_active and target:
            temp = generate_temp_password()
            user.set_password(temp)
            user.save()
            prof = getattr(user, 'profile', None)
            if prof:
                prof.must_change_password = True
                prof.save(update_fields=['must_change_password'])
            send_password_reset(user, temp, target)
        return Response(ok)


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


class ActiveRestaurantView(APIView):
    """Multi-local: fija el restaurante activo del usuario (debe ser uno de sus
    locales) y devuelve el contexto completo (mismo payload que /me) para que el
    cliente reemplace rol/permisos/plan/features/restaurante del local nuevo."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .models import Membership
        from .serializers import MeSerializer
        rid = request.data.get('restaurant')
        m = Membership.objects.filter(user=request.user, restaurant_id=rid).select_related('restaurant').first()
        if not m:
            raise PermissionDenied('No perteneces a ese restaurante.')
        prof = getattr(request.user, 'profile', None)
        if prof is None:
            return Response({'detail': 'Sin perfil de usuario.'}, status=400)
        prof.active_restaurant = m.restaurant
        prof.save(update_fields=['active_restaurant'])
        return Response(MeSerializer(request.user, context={'request': request}).data)


class OwnerCreateRestaurantView(APIView):
    """Autoservicio multi-local: un dueño con plan que lo permita (Business) crea
    un LOCAL NUEVO ligado a sí mismo como owner, y pasa a ser su local activo.
    Devuelve el contexto /me del local nuevo."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        current = get_user_restaurant(user)
        if get_user_role(user) != 'owner':
            raise PermissionDenied('Solo el dueño puede crear locales.')
        if not plan_features(current).get('multi_local'):
            raise PermissionDenied('Tu plan no incluye varios locales. Sube a Business para gestionar más de uno.')
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({'name': 'Indica el nombre del nuevo local.'}, status=400)
        plan = current.plan if current else 'business'
        currency = request.data.get('currency') or (current.currency if current else 'EUR')
        with transaction.atomic():
            restaurant = Restaurant.objects.create(
                name=name, plan=plan, currency=currency, code_prefix=_prefix_from_name(name),
            )  # el signal crea los 4 roles
            role = Role.objects.filter(restaurant=restaurant, key='owner').first()
            Membership.objects.create(user=user, restaurant=restaurant, role=role)
            prof = getattr(user, 'profile', None)
            if prof:
                prof.active_restaurant = restaurant
                prof.save(update_fields=['active_restaurant'])
        return Response(_login_payload(user, request), status=201)


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


class DashboardView(APIView):
    """Resumen condensado de todas las funciones. Solo agrega datos que YA
    existen en la app (recetas, inventario, proveedores, escandallo, actividad)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Count
        from recipes.models import Recipe
        from catalog.models import InventoryItem, Supplier
        from costeo.models import Costing, Insumo
        from .models import ActivityLog, Membership, UserProfile, plan_features

        user = request.user
        r = get_user_restaurant(user)
        if not r and get_user_role(user) == UserProfile.ROLE_SUPERADMIN:
            rid = request.query_params.get('restaurant')
            r = Restaurant.objects.filter(pk=rid).first() if rid else None
        if not r:
            return Response({'detail': 'No tienes un restaurante asignado.'}, status=400)

        recipes = Recipe.objects.filter(restaurant=r)
        by_cat = list(recipes.exclude(category='').values('category').annotate(n=Count('id')).order_by('-n')[:6])
        recent = list(recipes.order_by('-updated_at').values(
            'id', 'code', 'name', 'category', 'updated_at', 'created_at', 'revision')[:6])
        on_menu = recipes.filter(on_menu=True)
        pvp_total = 0.0
        for it in on_menu.values('menu_price', 'sale_price'):
            v = it['menu_price'] if it['menu_price'] is not None else it['sale_price']
            if v is not None:
                pvp_total += float(v)

        inv = InventoryItem.objects.filter(restaurant=r).select_related('partida')
        low_items = [i for i in inv if i.low_stock]
        low_names = [i.name for i in low_items[:8]]

        escandallos = Costing.objects.filter(restaurant=r)
        esc_total = escandallos.count()
        # El PVP solo aplica a platos de venta; las producciones (is_subrecipe) no lo llevan.
        sale_dishes = escandallos.filter(is_subrecipe=False)
        esc_priced = sale_dishes.filter(sale_price__isnull=False).count()
        esc_unpriced = sale_dishes.filter(sale_price__isnull=True).count()
        fc_vals = [float(x) for x in escandallos.exclude(target_food_cost=None).values_list('target_food_cost', flat=True)]
        fc_avg = round(sum(fc_vals) / len(fc_vals) * 100, 1) if fc_vals else None

        activity = list(ActivityLog.objects.filter(restaurant=r).values(
            'action', 'user_name', 'entity', 'entity_name', 'created_at')[:14])

        feats = plan_features(r)
        return Response({
            'restaurant': {'name': r.name, 'plan': r.get_plan_display(), 'currency': r.currency},
            'recipes': {
                'total': recipes.count(), 'on_menu': on_menu.count(),
                'priced': recipes.filter(sale_price__isnull=False).count(),
                'by_category': by_cat, 'recent': recent,
            },
            'inventory': {'items': inv.count(), 'low_stock': len(low_items), 'low_names': low_names},
            'suppliers': Supplier.objects.filter(restaurant=r).count(),
            'insumos': Insumo.objects.filter(restaurant=r).count(),
            'costeo': {
                'escandallos': esc_total,
                'priced': esc_priced,
                'unpriced': esc_unpriced,
                'target_food_cost_avg': fc_avg,
            },
            'team': Membership.objects.filter(restaurant=r, user__is_active=True).count(),
            'money': {'menu_pvp_total': round(pvp_total, 2)},
            'activity': activity,
            'features': {k: feats.get(k) for k in ('escandallo', 'inventory', 'suppliers', 'carta', 'multiuser')},
        })
