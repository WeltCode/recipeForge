from rest_framework.permissions import BasePermission

from .models import UserProfile, get_user_role


class IsSuperAdmin(BasePermission):
    """Solo el Super Admin puede gestionar usuarios."""

    message = 'Solo un Super Admin puede gestionar usuarios.'

    def has_permission(self, request, view):
        return get_user_role(request.user) == UserProfile.ROLE_SUPERADMIN
