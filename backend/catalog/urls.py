from rest_framework.routers import DefaultRouter

from .views import EscandalloViewSet, PartidaViewSet, ProductViewSet, SupplierViewSet

router = DefaultRouter()
router.register('partidas', PartidaViewSet, basename='partida')
router.register('suppliers', SupplierViewSet, basename='supplier')
router.register('products', ProductViewSet, basename='product')
router.register('escandallos', EscandalloViewSet, basename='escandallo')

urlpatterns = router.urls
