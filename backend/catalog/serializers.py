from rest_framework import serializers

from accounts.models import get_user_restaurant, user_can
from recipes.constants import clean_allergens

from . import models


def _can_see_cost(context):
    """True si el usuario puede ver costes (flag can_view_escandallo)."""
    request = context.get('request')
    user = getattr(request, 'user', None)
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return user_can(user, 'can_view_escandallo')


class SupplierSerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = models.Supplier
        fields = [
            'id', 'name', 'contact_name', 'email', 'phone', 'notes',
            'product_count', 'created_at',
        ]
        read_only_fields = ['created_at']

    def get_product_count(self, obj):
        return obj.products.count()


class ProductSerializer(serializers.ModelSerializer):
    supplier_name = serializers.SerializerMethodField()
    unit_cost = serializers.SerializerMethodField()
    low_stock = serializers.BooleanField(read_only=True)
    allergens = serializers.ListField(child=serializers.CharField(), required=False)

    class Meta:
        model = models.Product
        fields = [
            'id', 'name', 'category', 'supplier', 'supplier_name',
            'base_unit', 'pack_size', 'pack_price', 'unit_cost',
            'stock_qty', 'stock_min', 'low_stock', 'allergens',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Aislamiento: el desplegable de proveedor solo lista los del restaurante.
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user and user.is_authenticated and not user.is_superuser:
            restaurant = get_user_restaurant(user)
            self.fields['supplier'].queryset = models.Supplier.objects.filter(restaurant=restaurant)

    def get_supplier_name(self, obj):
        return obj.supplier.name if obj.supplier else None

    def get_unit_cost(self, obj):
        return str(obj.unit_cost) if _can_see_cost(self.context) else None

    def validate_allergens(self, value):
        return clean_allergens(value)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Ocultar el coste a quien no tiene permiso de escandallo (seguridad).
        if not _can_see_cost(self.context):
            data.pop('pack_price', None)
            data.pop('unit_cost', None)
        return data


class StockMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.StockMovement
        fields = ['id', 'product', 'kind', 'quantity', 'note', 'created_at']
        read_only_fields = ['created_at']
