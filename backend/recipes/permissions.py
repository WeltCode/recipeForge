from rest_framework.permissions import BasePermission, SAFE_METHODS

from accounts.models import get_user_restaurant, plan_allows, user_can


class RecipeRolePermission(BasePermission):
    """Permisos sobre recetas según los flags del rol del usuario.

    - GET (ver): can_view_recipes
    - PUT/PATCH (editar): can_edit_recipes
    - POST (crear): can_create_recipes
    - DELETE (borrar): can_delete_recipes
    El superadmin de plataforma puede todo (user_can devuelve True).
    """

    message = 'Tu rol no tiene permiso para realizar esta acción.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return user_can(user, 'can_view_recipes')
        if request.method in ('PUT', 'PATCH'):
            return user_can(user, 'can_edit_recipes')
        if request.method == 'POST':
            return user_can(user, 'can_create_recipes')
        if request.method == 'DELETE':
            return user_can(user, 'can_delete_recipes')
        return False


class CanManageCarta(BasePermission):
    """Gestión de la carta pública y los especiales: el plan del restaurante debe
    incluir `carta` (Premium/Business) Y el rol debe poder crear recetas
    (owner o chef/manager). El superadmin siempre."""

    message = 'Necesitas plan Premium o Business y ser dueño o chef.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        restaurant = get_user_restaurant(user)
        return bool(restaurant) and plan_allows(restaurant, 'carta') and user_can(user, 'can_create_recipes')
