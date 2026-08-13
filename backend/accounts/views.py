from django.contrib.auth.models import User
from rest_framework import viewsets
from rest_framework.generics import RetrieveAPIView
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Restaurant, Role
from .permissions import IsSuperAdmin
from .serializers import (
    CustomTokenObtainPairSerializer,
    MeSerializer,
    RestaurantSerializer,
    RoleSerializer,
    UserAdminSerializer,
)


class LoginView(TokenObtainPairView):
    """POST usuario/contraseña -> access + refresh + rol + restaurante."""

    serializer_class = CustomTokenObtainPairSerializer


class MeView(RetrieveAPIView):
    """GET datos del usuario autenticado."""

    permission_classes = [IsAuthenticated]
    serializer_class = MeSerializer

    def get_object(self):
        return self.request.user


class UserAdminViewSet(viewsets.ModelViewSet):
    """CRUD de usuarios, solo para el Super Admin."""

    serializer_class = UserAdminSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        qs = User.objects.prefetch_related(
            'memberships__restaurant', 'memberships__role',
        ).order_by('id')
        restaurant_id = self.request.query_params.get('restaurant')
        if restaurant_id:
            qs = qs.filter(memberships__restaurant_id=restaurant_id)
        role = self.request.query_params.get('role')
        if role == 'superadmin':
            qs = qs.filter(is_superuser=True)
        elif role:
            qs = qs.filter(memberships__role__key=role)
        return qs.distinct()


class RestaurantViewSet(viewsets.ModelViewSet):
    """CRUD de restaurantes (tenants), solo para el Super Admin."""

    queryset = Restaurant.objects.prefetch_related('memberships__user', 'recipes').all()
    serializer_class = RestaurantSerializer
    permission_classes = [IsSuperAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]


class RoleViewSet(viewsets.ModelViewSet):
    """Listar y editar los flags de los roles de un restaurante (Super Admin).

    Solo GET y PATCH: los 4 roles se crean con el restaurante; aquí se ajustan
    sus permisos (?restaurant=<id> para filtrar).
    """

    serializer_class = RoleSerializer
    permission_classes = [IsSuperAdmin]
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_queryset(self):
        qs = Role.objects.select_related('restaurant').order_by('restaurant_id', 'id')
        restaurant_id = self.request.query_params.get('restaurant')
        return qs.filter(restaurant_id=restaurant_id) if restaurant_id else qs
