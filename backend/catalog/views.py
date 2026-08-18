from decimal import Decimal, InvalidOperation

from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from accounts.models import get_user_restaurant, get_user_role, user_can, UserProfile, Restaurant

from .models import Escandallo, Partida, Product, Supplier, StockMovement
from .permissions import CatalogPermission, EscandalloPermission
from .serializers import (
    EscandalloSerializer,
    PartidaSerializer,
    ProductSerializer,
    StockMovementSerializer,
    SupplierSerializer,
)


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


class PartidaViewSet(_TenantScopedViewSet):
    serializer_class = PartidaSerializer
    required_feature = 'inventory'

    def get_queryset(self):
        qs = Partida.objects.prefetch_related('products').all()
        user = self.request.user
        if _is_superadmin(user):
            rid = self.request.query_params.get('restaurant')
            return qs.filter(restaurant_id=rid) if rid else qs
        return qs.filter(restaurant=get_user_restaurant(user))


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
        # ?supplier=<id> -> solo los productos de ese proveedor
        sup = self.request.query_params.get('supplier')
        if sup:
            qs = qs.filter(supplier_id=sup)
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


class EscandalloViewSet(ModelViewSet):
    """Escandallos (costes de platos). Entidad independiente de la receta.
    Requiere plan Business + permiso de escandallo."""

    serializer_class = EscandalloSerializer
    permission_classes = [EscandalloPermission]

    def get_queryset(self):
        qs = Escandallo.objects.prefetch_related('lines__product').select_related('recipe').all()
        user = self.request.user
        if _is_superadmin(user):
            rid = self.request.query_params.get('restaurant')
            return qs.filter(restaurant_id=rid) if rid else qs
        return qs.filter(restaurant=get_user_restaurant(user))

    def perform_create(self, serializer):
        user = self.request.user
        restaurant = get_user_restaurant(user)
        if _is_superadmin(user):
            rid = self.request.data.get('restaurant')
            restaurant = Restaurant.objects.filter(pk=rid).first() if rid else None
        serializer.save(restaurant=restaurant)

    @action(detail=True, methods=['post'])
    def create_recipe(self, request, pk=None):
        """Crea una receta a partir de los insumos del escandallo y la enlaza.
        Requiere permiso de crear recetas."""
        from recipes.models import Recipe, IngredientLine

        user = request.user
        if not (user.is_superuser or user_can(user, 'can_create_recipes')):
            return Response({'detail': 'Tu rol no puede crear recetas.'}, status=403)
        escandallo = self.get_object()
        if escandallo.recipe_id:
            return Response({'detail': 'Este escandallo ya tiene una receta enlazada.'}, status=400)

        restaurant = escandallo.restaurant
        prefix = (restaurant.code_prefix or 'FT') if restaurant else 'FT'
        # Código correlativo simple dentro del restaurante.
        n = Recipe.objects.filter(restaurant=restaurant).count() + 1
        code = f'{prefix}-{str(n).zfill(3)}'
        while Recipe.objects.filter(restaurant=restaurant, code=code).exists():
            n += 1
            code = f'{prefix}-{str(n).zfill(3)}'

        recipe = Recipe.objects.create(
            restaurant=restaurant, code=code, name=escandallo.name,
            servings=escandallo.servings,
            template=(restaurant.default_template if restaurant else 'formal'),
        )
        for i, ln in enumerate(escandallo.lines.all()):
            IngredientLine.objects.create(
                recipe=recipe, ingredient_name=ln.ingredient_name,
                quantity=ln.quantity or 0, unit=ln.unit or 'g', order=i + 1,
            )
        escandallo.recipe = recipe
        escandallo.save(update_fields=['recipe', 'updated_at'])
        return Response(
            {'recipe_id': recipe.id, 'code': recipe.code, 'name': recipe.name},
            status=201,
        )
