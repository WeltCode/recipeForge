from rest_framework.permissions import BasePermission, SAFE_METHODS

from accounts.models import user_can


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
