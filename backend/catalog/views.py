from decimal import Decimal, InvalidOperation

from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from accounts.models import get_user_restaurant, get_user_role, UserProfile, Restaurant

from .models import Product, Supplier, StockMovement
from .permissions import CatalogPermission
from .serializers import ProductSerializer, StockMovementSerializer, SupplierSerializer


def _is_superadmin(user):
    return get_user_role(user) == UserProfile.ROLE_SUPERADMIN


class _TenantScopedViewSet(ModelViewSet):
    """Base: aísla por restaurante y fija el restaurante al crear."""

    permission_classes = [CatalogPermission]

    def _restaurant(self):
        user = self.request.user
        if _is_superadmin(user):
            rid = self.request.data.get('restaurant') or self.request.query_params.get('restaurant')
            return Restaurant.objects.filter(pk=rid).first() if rid else None
        return get_user_restaurant(user)

    def perform_create(self, serializer):
        serializer.save(restaurant=self._restaurant())


class SupplierViewSet(_TenantScopedViewSet):
    serializer_class = SupplierSerializer
    required_feature = 'suppliers'

    def get_queryset(self):
        qs = Supplier.objects.prefetch_related('products').all()
        user = self.request.user
        if _is_superadmin(user):
            rid = self.request.query_params.get('restaurant')
            return qs.filter(restaurant_id=rid) if rid else qs
        return qs.filter(restaurant=get_user_restaurant(user))


class ProductViewSet(_TenantScopedViewSet):
    serializer_class = ProductSerializer
    required_feature = 'inventory'

    def get_queryset(self):
        qs = Product.objects.select_related('supplier').all()
        user = self.request.user
        if _is_superadmin(user):
            rid = self.request.query_params.get('restaurant')
            qs = qs.filter(restaurant_id=rid) if rid else qs
        else:
            qs = qs.filter(restaurant=get_user_restaurant(user))
        # ?low=1 -> solo productos por debajo del mínimo
        if self.request.query_params.get('low') in ('1', 'true'):
            ids = [p.id for p in qs if p.low_stock]
            qs = qs.filter(id__in=ids)
        return qs

    @action(detail=True, methods=['post'])
    def stock(self, request, pk=None):
        """Ajusta el stock: {kind: in|out|adjust, quantity, note}.

        in/out suman/restan; adjust fija el stock al valor dado. Registra el
        movimiento para dejar traza en el inventario.
        """
        product = self.get_object()
        kind = request.data.get('kind', 'in')
        if kind not in ('in', 'out', 'adjust'):
            raise ValidationError({'kind': 'Tipo de movimiento no válido.'})
        try:
            qty = Decimal(str(request.data.get('quantity', '0')))
        except (InvalidOperation, TypeError):
            raise ValidationError({'quantity': 'Cantidad no válida.'})
        if qty < 0:
            raise ValidationError({'quantity': 'La cantidad no puede ser negativa.'})

        if kind == 'in':
            product.stock_qty = product.stock_qty + qty
        elif kind == 'out':
            product.stock_qty = max(Decimal('0'), product.stock_qty - qty)
        else:  # adjust
            product.stock_qty = qty
        product.save(update_fields=['stock_qty', 'updated_at'])
        StockMovement.objects.create(
            product=product, kind=kind, quantity=qty, note=request.data.get('note', ''),
        )
        return Response(ProductSerializer(product, context=self.get_serializer_context()).data)
