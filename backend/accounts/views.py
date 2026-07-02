from django.contrib.auth.models import User
from django.db.models import Q
from rest_framework import viewsets
from rest_framework.generics import RetrieveAPIView
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Restaurant
from .permissions import IsSuperAdmin
from .serializers import (
    CustomTokenObtainPairSerializer,
    MeSerializer,
    RestaurantSerializer,
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
        qs = User.objects.select_related('profile__restaurant').order_by('id')
        restaurant_id = self.request.query_params.get('restaurant')
        if restaurant_id:
            qs = qs.filter(profile__restaurant_id=restaurant_id)
        role = self.request.query_params.get('role')
        if role == 'superadmin':
            qs = qs.filter(Q(profile__role='superadmin') | Q(is_superuser=True))
        elif role:
            qs = qs.filter(profile__role=role)
        return qs


class RestaurantViewSet(viewsets.ModelViewSet):
    """CRUD de restaurantes (tenants), solo para el Super Admin."""

    queryset = Restaurant.objects.prefetch_related('members__user', 'recipes').all()
    serializer_class = RestaurantSerializer
    permission_classes = [IsSuperAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
