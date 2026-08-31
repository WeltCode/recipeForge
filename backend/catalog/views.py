from decimal import Decimal, InvalidOperation

from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from accounts.models import get_user_restaurant, get_user_role, log_activity, UserProfile, Restaurant
from accounts.mixins import ActivityLogMixin

from .models import InventoryItem, Partida, Product, Supplier
from .permissions import CatalogPermission
from .serializers import (
    InventoryItemSerializer,
    PartidaSerializer,
    ProductSerializer,
    SupplierSerializer,
)


def _is_superadmin(user):
    return get_user_role(user) == UserProfile.ROLE_SUPERADMIN


class _TenantScopedViewSet(ActivityLogMixin, ModelViewSet):
    """Base: aísla por restaurante y fija el restaurante al crear.
    Registra actividad si el viewset fija `activity_entity` (update/delete vienen
    del mixin; el create se registra aquí porque aquí se fija el restaurante)."""

    permission_classes = [CatalogPermission]

    def _restaurant(self):
        user = self.request.user
        if _is_superadmin(user):
            rid = self.request.data.get('restaurant') or self.request.query_params.get('restaurant')
            return Restaurant.objects.filter(pk=rid).first() if rid else None
        return get_user_restaurant(user)

    def perform_create(self, serializer):
        obj = serializer.save(restaurant=self._restaurant())
        self._log(obj, 'create')


class PartidaViewSet(_TenantScopedViewSet):
    serializer_class = PartidaSerializer
    required_feature = 'inventory'

    def get_queryset(self):
        qs = Partida.objects.prefetch_related('items').all()
        user = self.request.user
        if _is_superadmin(user):
            rid = self.request.query_params.get('restaurant')
            return qs.filter(restaurant_id=rid) if rid else qs
        return qs.filter(restaurant=get_user_restaurant(user))


class SupplierViewSet(_TenantScopedViewSet):
    serializer_class = SupplierSerializer
    required_feature = 'suppliers'
    activity_entity = 'proveedor'

    def get_queryset(self):
        qs = Supplier.objects.prefetch_related('products').all()
        user = self.request.user
        if _is_superadmin(user):
            rid = self.request.query_params.get('restaurant')
            return qs.filter(restaurant_id=rid) if rid else qs
        return qs.filter(restaurant=get_user_restaurant(user))


class ProductViewSet(_TenantScopedViewSet):
    """Productos de compra (proveedores)."""

    serializer_class = ProductSerializer
    required_feature = 'suppliers'

    def get_queryset(self):
        qs = Product.objects.select_related('supplier').all()
        user = self.request.user
        if _is_superadmin(user):
            rid = self.request.query_params.get('restaurant')
            qs = qs.filter(restaurant_id=rid) if rid else qs
        else:
            qs = qs.filter(restaurant=get_user_restaurant(user))
        # ?supplier=<id> -> solo los productos de ese proveedor
        sup = self.request.query_params.get('supplier')
        if sup:
            qs = qs.filter(supplier_id=sup)
        return qs


class InventoryItemViewSet(_TenantScopedViewSet):
    """Inventario de producción (por partida). Sin proveedor ni precio."""

    serializer_class = InventoryItemSerializer
    required_feature = 'inventory'
    activity_entity = 'inventario'

    def get_queryset(self):
        qs = InventoryItem.objects.select_related('partida').all()
        user = self.request.user
        if _is_superadmin(user):
            rid = self.request.query_params.get('restaurant')
            qs = qs.filter(restaurant_id=rid) if rid else qs
        else:
            qs = qs.filter(restaurant=get_user_restaurant(user))
        partida = self.request.query_params.get('partida')
        if partida == 'none':
            qs = qs.filter(partida__isnull=True)
        elif partida:
            qs = qs.filter(partida_id=partida)
        if self.request.query_params.get('low') in ('1', 'true'):
            ids = [i.id for i in qs if i.low_stock]
            qs = qs.filter(id__in=ids)
        return qs

    @action(detail=True, methods=['post'])
    def adjust(self, request, pk=None):
        """Ajusta la cantidad: {kind: in|out|set, quantity}."""
        item = self.get_object()
        kind = request.data.get('kind', 'in')
        if kind not in ('in', 'out', 'set'):
            raise ValidationError({'kind': 'Tipo de movimiento no válido.'})
        try:
            qty = Decimal(str(request.data.get('quantity', '0')))
        except (InvalidOperation, TypeError):
            raise ValidationError({'quantity': 'Cantidad no válida.'})
        if qty < 0:
            raise ValidationError({'quantity': 'La cantidad no puede ser negativa.'})
        if kind == 'in':
            item.quantity = item.quantity + qty
        elif kind == 'out':
            item.quantity = max(Decimal('0'), item.quantity - qty)
        else:
            item.quantity = qty
        item.save(update_fields=['quantity', 'updated_at'])
        log_activity(item.restaurant, request.user, 'update', 'inventario', item.name)
        return Response(InventoryItemSerializer(item, context=self.get_serializer_context()).data)
