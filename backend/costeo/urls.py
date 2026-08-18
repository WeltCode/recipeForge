from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CostingViewSet, InsumoViewSet, PreviewView, PurchaseFormatViewSet

router = DefaultRouter()
router.register('costeo/insumos', InsumoViewSet, basename='costeo-insumo')
router.register('costeo/formatos', PurchaseFormatViewSet, basename='costeo-formato')
router.register('costeo/escandallos', CostingViewSet, basename='costeo-costing')

urlpatterns = [
    path('costeo/preview/', PreviewView.as_view(), name='costeo-preview'),
]
urlpatterns += router.urls
