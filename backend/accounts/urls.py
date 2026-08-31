from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ActiveRestaurantView, ChangePasswordView, DashboardView, LoginView, MeView,
    OwnerCreateRestaurantView, OwnerDeleteRestaurantView, PasswordResetRequestView,
    PlanChangeRequestViewSet, ProfileAvatarView, ResendVerificationView,
    RestaurantSettingsView, RestaurantViewSet, RoleViewSet, SignupView,
    UserAdminViewSet, VerifyEmailView,
)

router = DefaultRouter()
router.register('users', UserAdminViewSet, basename='user')
router.register('restaurants', RestaurantViewSet, basename='restaurant')
router.register('roles', RoleViewSet, basename='role')
router.register('plan-requests', PlanChangeRequestViewSet, basename='plan-request')

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/signup/', SignupView.as_view(), name='signup'),
    path('auth/verify-email/', VerifyEmailView.as_view(), name='verify-email'),
    path('auth/resend-verification/', ResendVerificationView.as_view(), name='resend-verification'),
    path('auth/password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/me/', MeView.as_view(), name='me'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('auth/avatar/', ProfileAvatarView.as_view(), name='avatar'),
    path('auth/restaurant/', RestaurantSettingsView.as_view(), name='restaurant-settings'),
    path('auth/active-restaurant/', ActiveRestaurantView.as_view(), name='active-restaurant'),
    path('auth/create-restaurant/', OwnerCreateRestaurantView.as_view(), name='owner-create-restaurant'),
    path('auth/my-restaurant/<int:pk>/', OwnerDeleteRestaurantView.as_view(), name='owner-delete-restaurant'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
]

urlpatterns += router.urls
