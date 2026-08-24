from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CartaSettingsView,
    EspecialViewSet,
    HealthCheckView,
    MediaProxyView,
    PublicCartaView,
    PublicEspecialesView,
    RecipeViewSet,
)

router = DefaultRouter()
router.register('recipes', RecipeViewSet, basename='recipe')
router.register('especiales', EspecialViewSet, basename='especial')

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('media/<path:path>', MediaProxyView.as_view(), name='media-proxy'),
    path('carta/settings/', CartaSettingsView.as_view(), name='carta-settings'),
    # Públicas (sin login):
    path('public/carta/<slug:slug>/', PublicCartaView.as_view(), name='public-carta'),
    path('public/especiales/<slug:slug>/', PublicEspecialesView.as_view(), name='public-especiales'),
]

urlpatterns += router.urls
