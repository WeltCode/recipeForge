from rest_framework.routers import DefaultRouter

from .views import (
    EscandalloViewSet, InventoryItemViewSet, PartidaViewSet, ProductViewSet, SupplierViewSet,
)

router = DefaultRouter()
router.register('partidas', PartidaViewSet, basename='partida')
router.register('suppliers', SupplierViewSet, basename='supplier')
router.register('products', ProductViewSet, basename='product')
router.register('inventory', InventoryItemViewSet, basename='inventory-item')
router.register('escandallos', EscandalloViewSet, basename='escandallo')

urlpatterns = router.urls
