from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import LoginView, MeView, RestaurantViewSet, RoleViewSet, UserAdminViewSet

router = DefaultRouter()
router.register('users', UserAdminViewSet, basename='user')
router.register('restaurants', RestaurantViewSet, basename='restaurant')
router.register('roles', RoleViewSet, basename='role')

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/me/', MeView.as_view(), name='me'),
]

urlpatterns += router.urls
