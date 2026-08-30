from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ChangePasswordView, DashboardView, LoginView, MeView, PlanChangeRequestViewSet,
    ProfileAvatarView, RestaurantSettingsView, RestaurantViewSet, RoleViewSet,
    UserAdminViewSet,
)

router = DefaultRouter()
router.register('users', UserAdminViewSet, basename='user')
router.register('restaurants', RestaurantViewSet, basename='restaurant')
router.register('roles', RoleViewSet, basename='role')
router.register('plan-requests', PlanChangeRequestViewSet, basename='plan-request')

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/me/', MeView.as_view(), name='me'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('auth/avatar/', ProfileAvatarView.as_view(), name='avatar'),
    path('auth/restaurant/', RestaurantSettingsView.as_view(), name='restaurant-settings'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
]

urlpatterns += router.urls
