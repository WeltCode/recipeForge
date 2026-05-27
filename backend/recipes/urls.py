from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import HealthCheckView, RecipeViewSet

router = DefaultRouter()
router.register('recipes', RecipeViewSet, basename='recipe')

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
]

urlpatterns += router.urls
