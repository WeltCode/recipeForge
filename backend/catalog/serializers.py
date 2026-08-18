from rest_framework import serializers

from accounts.models import get_user_restaurant, user_can
from recipes.constants import clean_allergens
from recipes.costing import costing_summary

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
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = models.Partida
        fields = ['id', 'name', 'product_count', 'created_at']
        read_only_fields = ['created_at']

    def get_product_count(self, obj):
        return obj.products.count()


class SupplierSerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()
    products = serializers.SerializerMethodField()

    class Meta:
        model = models.Supplier
        fields = [
            'id', 'name', 'contact_name', 'email', 'phone',
            'tax_id', 'address', 'city', 'website', 'payment_terms', 'delivery_days',
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
    supplier_name = serializers.SerializerMethodField()
    partida_name = serializers.SerializerMethodField()
    unit_cost = serializers.SerializerMethodField()
    low_stock = serializers.BooleanField(read_only=True)
    allergens = serializers.ListField(child=serializers.CharField(), required=False)

    class Meta:
        model = models.Product
        fields = [
            'id', 'name', 'category', 'partida', 'partida_name', 'supplier', 'supplier_name',
            'base_unit', 'pack_size', 'pack_price', 'unit_cost',
            'stock_qty', 'stock_min', 'low_stock', 'allergens',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Aislamiento: los desplegables solo listan los del propio restaurante.
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user and user.is_authenticated and not user.is_superuser:
            restaurant = get_user_restaurant(user)
            self.fields['supplier'].queryset = models.Supplier.objects.filter(restaurant=restaurant)
            self.fields['partida'].queryset = models.Partida.objects.filter(restaurant=restaurant)

    def get_supplier_name(self, obj):
        return obj.supplier.name if obj.supplier else None

    def get_partida_name(self, obj):
        return obj.partida.name if obj.partida else None

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


class EscandalloLineSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()

    class Meta:
        model = models.EscandalloLine
        fields = ['id', 'ingredient_name', 'product', 'product_name', 'quantity', 'unit', 'order']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user and user.is_authenticated and not user.is_superuser:
            self.fields['product'].queryset = models.Product.objects.filter(
                restaurant=get_user_restaurant(user),
            )

    def get_product_name(self, obj):
        return obj.product.name if obj.product else None


class EscandalloSerializer(serializers.ModelSerializer):
    lines = EscandalloLineSerializer(many=True, required=False)
    summary = serializers.SerializerMethodField()
    recipe_code = serializers.SerializerMethodField()

    class Meta:
        model = models.Escandallo
        fields = [
            'id', 'name', 'servings', 'sale_price', 'recipe', 'recipe_code',
            'notes', 'lines', 'summary', 'created_at', 'updated_at',
        ]
        read_only_fields = ['recipe', 'created_at', 'updated_at']

    def get_recipe_code(self, obj):
        return obj.recipe.code if obj.recipe else None

    def get_summary(self, obj):
        lines = [
            {'name': ln.ingredient_name, 'product': ln.product if ln.product_id else None,
             'quantity': ln.quantity, 'unit': ln.unit}
            for ln in obj.lines.all()
        ]
        return costing_summary(lines, servings=obj.servings, sale_price=obj.sale_price)

    def create(self, validated_data):
        lines = validated_data.pop('lines', [])
        escandallo = models.Escandallo.objects.create(**validated_data)
        self._save_lines(escandallo, lines)
        return escandallo

    def update(self, instance, validated_data):
        lines = validated_data.pop('lines', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if lines is not None:
            instance.lines.all().delete()
            self._save_lines(instance, lines)
        return instance

    def _save_lines(self, escandallo, lines):
        for i, ln in enumerate(lines):
            models.EscandalloLine.objects.create(
                escandallo=escandallo,
                ingredient_name=ln.get('ingredient_name', ''),
                product=ln.get('product'),
                quantity=ln.get('quantity') or 0,
                unit=ln.get('unit') or 'g',
                order=ln.get('order', i + 1),
            )
