from rest_framework import serializers

from accounts.models import get_user_restaurant, user_can

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


class PartidaSerializer(serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = models.Partida
        fields = ['id', 'name', 'item_count', 'created_at']
        read_only_fields = ['created_at']

    def get_item_count(self, obj):
        return obj.items.count()


class SupplierSerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()
    products = serializers.SerializerMethodField()

    class Meta:
        model = models.Supplier
        fields = [
            'id', 'name', 'contact_name', 'email', 'phone',
            'tax_id', 'website', 'payment_terms', 'delivery_days',
            'notes', 'product_count', 'products', 'created_at',
        ]
        read_only_fields = ['created_at']

    def get_product_count(self, obj):
        return obj.products.count()

    def get_products(self, obj):
        can_cost = _can_see_cost(self.context)
        out = []
        for p in obj.products.all():
            row = {'id': p.id, 'name': p.name, 'base_unit': p.base_unit}
            if can_cost:
                row['pack_size'] = str(p.pack_size)
                row['pack_price'] = str(p.pack_price)
                row['unit_cost'] = str(p.unit_cost)
            out.append(row)
        return out


class ProductSerializer(serializers.ModelSerializer):
    """Producto de compra (proveedores). Da coste al escandallo."""

    supplier_name = serializers.SerializerMethodField()
    unit_cost = serializers.SerializerMethodField()

    class Meta:
        model = models.Product
        fields = [
            'id', 'name', 'category', 'supplier', 'supplier_name',
            'base_unit', 'pack_size', 'pack_price', 'unit_cost',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user and user.is_authenticated and not user.is_superuser:
            self.fields['supplier'].queryset = models.Supplier.objects.filter(restaurant=get_user_restaurant(user))

    def get_supplier_name(self, obj):
        return obj.supplier.name if obj.supplier else None

    def get_unit_cost(self, obj):
        return str(obj.unit_cost) if _can_see_cost(self.context) else None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Ocultar el coste a quien no tiene permiso de escandallo (seguridad).
        if not _can_see_cost(self.context):
            data.pop('pack_price', None)
            data.pop('unit_cost', None)
        return data


class InventoryItemSerializer(serializers.ModelSerializer):
    """Inventario de producción (por partida). Sin proveedor ni precio."""

    partida_name = serializers.SerializerMethodField()
    low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = models.InventoryItem
        fields = [
            'id', 'name', 'partida', 'partida_name', 'quantity', 'unit',
            'stock_min', 'low_stock', 'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user and user.is_authenticated and not user.is_superuser:
            self.fields['partida'].queryset = models.Partida.objects.filter(restaurant=get_user_restaurant(user))

    def get_partida_name(self, obj):
        return obj.partida.name if obj.partida else None
