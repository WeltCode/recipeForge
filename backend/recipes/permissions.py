from rest_framework.permissions import BasePermission, SAFE_METHODS

from accounts.models import UserProfile, get_user_role


class RecipeRolePermission(BasePermission):
    """Permisos sobre recetas según el rol del usuario.

    - Cualquier autenticado: ver (GET) y editar (PUT/PATCH) recetas.
    - Premium / Super Admin: además crear (POST) y eliminar (DELETE).
    """

    message = 'Tu rol no tiene permiso para realizar esta acción.'

    def has_permission(self, request, view):
        role = get_user_role(request.user)
        if role is None:
            return False
        if request.method in SAFE_METHODS or request.method in ('PUT', 'PATCH'):
            return True
        if request.method in ('POST', 'DELETE'):
            return role in (UserProfile.ROLE_PREMIUM, UserProfile.ROLE_SUPERADMIN)
        return False
