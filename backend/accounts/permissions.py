from rest_framework.permissions import BasePermission

from .models import UserProfile, get_user_role, get_user_restaurant, user_can


class IsSuperAdmin(BasePermission):
    """Solo el Super Admin puede gestionar usuarios."""

    message = 'Solo un Super Admin puede gestionar usuarios.'

    def has_permission(self, request, view):
        return get_user_role(request.user) == UserProfile.ROLE_SUPERADMIN


class CanManageUsers(BasePermission):
    """Gestión de usuarios/roles: el Super Admin (cualquier restaurante) o un
    owner/manager con `can_manage_users` (LIMITADO a su propio restaurante; el
    scoping fino lo aplican los get_queryset/overrides de las vistas)."""

    message = 'No tienes permiso para gestionar usuarios de este restaurante.'

    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated):
            return False
        if u.is_superuser:
            return True
        return bool(get_user_restaurant(u)) and user_can(u, 'can_manage_users')
