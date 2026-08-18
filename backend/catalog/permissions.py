from rest_framework.permissions import BasePermission, SAFE_METHODS

from accounts.models import get_user_restaurant, plan_allows, user_can


class CatalogPermission(BasePermission):
    """Acceso al catálogo/proveedores/inventario (funciones Business).

    - El plan del restaurante debe incluir la función `view.required_feature`.
    - Ver (GET): can_view_recipes. Escribir: can_edit_recipes.
    El superadmin de plataforma puede todo.
    """

    message = 'Tu plan o tu rol no permiten esta acción.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        restaurant = get_user_restaurant(user)
        if restaurant is None:
            return False
        feature = getattr(view, 'required_feature', None)
        if feature and not plan_allows(restaurant, feature):
            return False
        if request.method in SAFE_METHODS:
            return user_can(user, 'can_view_recipes')
        return user_can(user, 'can_edit_recipes')
