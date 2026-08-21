from decimal import Decimal, InvalidOperation

from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from accounts.models import get_user_restaurant, get_user_role, UserProfile, Restaurant
from catalog.permissions import EscandalloPermission

from . import services
from .models import Costing, Insumo, PriceHistory, PurchaseFormat
from .serializers import (
    CostingSerializer,
    InsumoSerializer,
    PreviewSerializer,
    PriceHistorySerializer,
    PurchaseFormatSerializer,
)
from .units import UnitError


def _is_superadmin(user):
    return get_user_role(user) == UserProfile.ROLE_SUPERADMIN


class _TenantViewSet(ModelViewSet):
    permission_classes = [EscandalloPermission]

    def _restaurant(self):
        user = self.request.user
        if _is_superadmin(user):
            rid = self.request.data.get('restaurant') or self.request.query_params.get('restaurant')
            return Restaurant.objects.filter(pk=rid).first() if rid else None
        return get_user_restaurant(user)

    def _scope(self, qs):
        user = self.request.user
        if _is_superadmin(user):
            rid = self.request.query_params.get('restaurant')
            return qs.filter(restaurant_id=rid) if rid else qs
        return qs.filter(restaurant=get_user_restaurant(user))

    def perform_create(self, serializer):
        serializer.save(restaurant=self._restaurant())


class InsumoViewSet(_TenantViewSet):
    serializer_class = InsumoSerializer

    def get_queryset(self):
        return self._scope(Insumo.objects.prefetch_related('formats').all())


class PurchaseFormatViewSet(_TenantViewSet):
    serializer_class = PurchaseFormatSerializer

    def get_queryset(self):
        user = self.request.user
        qs = PurchaseFormat.objects.select_related('insumo', 'supplier').all()
        if _is_superadmin(user):
            rid = self.request.query_params.get('restaurant')
            qs = qs.filter(insumo__restaurant_id=rid) if rid else qs
        else:
            qs = qs.filter(insumo__restaurant=get_user_restaurant(user))
        ins = self.request.query_params.get('insumo')
        return qs.filter(insumo_id=ins) if ins else qs

    def perform_create(self, serializer):
        fmt = serializer.save()
        # Si el insumo no tenía referencia de precio, este formato pasa a serlo.
        if fmt.insumo.reference_format_id is None:
            fmt.insumo.reference_format = fmt
            fmt.insumo.save(update_fields=['reference_format', 'updated_at'])
        # La unidad base del insumo se deriva del formato (canónica de su dimensión).
        services.sync_insumo_base_unit(fmt.insumo)

    def perform_destroy(self, instance):
        insumo = instance.insumo
        was_ref = insumo.reference_format_id == instance.id
        super().perform_destroy(instance)
        if was_ref:
            # Reasigna la referencia al primer formato que quede (si hay) y re-deriva.
            nxt = insumo.formats.first()
            insumo.reference_format = nxt
            insumo.save(update_fields=['reference_format', 'updated_at'])
        services.sync_insumo_base_unit(insumo)

    @action(detail=True, methods=['post'])
    def register_price(self, request, pk=None):
        """Registra un precio nuevo: guarda histórico, actualiza el formato, lo
        fija como referencia del insumo y recalcula en cascada."""
        fmt = self.get_object()
        try:
            price = Decimal(str(request.data.get('price')))
        except (InvalidOperation, TypeError):
            return Response({'detail': 'Precio no válido.'}, status=400)
        includes_iva = bool(request.data.get('price_includes_iva', fmt.price_includes_iva))
        try:
            iva = Decimal(str(request.data.get('iva_rate', fmt.iva_rate)))
        except (InvalidOperation, TypeError):
            return Response({'detail': 'IVA no válido.'}, status=400)

        PriceHistory.objects.create(
            purchase_format=fmt, price=price, price_includes_iva=includes_iva,
            iva_rate=iva, note=request.data.get('note', ''),
        )
        fmt.price = price
        fmt.price_includes_iva = includes_iva
        fmt.iva_rate = iva
        fmt.save(update_fields=['price', 'price_includes_iva', 'iva_rate', 'updated_at'])
        insumo = fmt.insumo
        insumo.reference_format = fmt
        insumo.save(update_fields=['reference_format', 'updated_at'])
        services.sync_insumo_base_unit(insumo)
        services.cascade_refresh(insumo.restaurant)
        return Response(PurchaseFormatSerializer(fmt, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        fmt = self.get_object()
        return Response(PriceHistorySerializer(fmt.history.all(), many=True).data)


class CostingViewSet(_TenantViewSet):
    serializer_class = CostingSerializer

    def get_queryset(self):
        qs = Costing.objects.prefetch_related('lines').all()
        qs = self._scope(qs)
        if self.request.query_params.get('subrecipes') == '1':
            qs = qs.filter(is_subrecipe=True)
        return qs


class PreviewView(APIView):
    """Escandallo en vivo SIN persistencia. Recibe el borrador (solo cantidades,
    unidades, mermas, food cost, IVA, raciones y referencias por id); resuelve
    precios/costes contra la BD del tenant; devuelve el mismo desglose que el
    CRUD. Idempotente y stateless."""

    permission_classes = [EscandalloPermission]

    def post(self, request):
        restaurant = get_user_restaurant(request.user)
        if restaurant is None and not request.user.is_superuser:
            return Response({'detail': 'Sin restaurante.'}, status=400)
        if request.user.is_superuser:
            rid = request.data.get('restaurant')
            restaurant = Restaurant.objects.filter(pk=rid).first() if rid else None
        ser = PreviewSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            return Response(services.public(services.compute(ser.to_spec(), restaurant)))
        except (services.CosteoError, UnitError) as e:
            return Response({'detail': str(e)}, status=400)
