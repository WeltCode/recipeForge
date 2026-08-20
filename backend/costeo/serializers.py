from rest_framework import serializers

from accounts.models import get_user_restaurant
from catalog.models import Supplier

from . import services
from .models import Costing, CostingLine, Insumo, PriceHistory, PurchaseFormat
from .units import UnitError


def _restaurant(context):
    request = context.get('request')
    user = getattr(request, 'user', None)
    return get_user_restaurant(user) if user and user.is_authenticated else None


# ── Insumos y formatos de compra ────────────────────────────────────────────
class PurchaseFormatSerializer(serializers.ModelSerializer):
    supplier_name = serializers.SerializerMethodField()
    content_base = serializers.SerializerMethodField()
    cost_per_base = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseFormat
        fields = [
            'id', 'insumo', 'supplier', 'supplier_name', 'description',
            'price', 'price_includes_iva', 'iva_rate',
            'pack_levels', 'unit_size', 'unit_size_unit',
            'content_base', 'cost_per_base', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        r = _restaurant(self.context)
        if r is not None:
            self.fields['insumo'].queryset = Insumo.objects.filter(restaurant=r)
            self.fields['supplier'].queryset = Supplier.objects.filter(restaurant=r)

    def get_supplier_name(self, obj):
        return obj.supplier.name if obj.supplier else None

    def _safe(self, fn):
        try:
            return str(fn())
        except (services.CosteoError, UnitError):
            return None

    def get_content_base(self, obj):
        return self._safe(lambda: services.format_content_base(obj, obj.insumo))

    def get_cost_per_base(self, obj):
        return self._safe(lambda: services.format_price_ex_iva(obj) / services.format_content_base(obj, obj.insumo))


class InsumoSerializer(serializers.ModelSerializer):
    formats = PurchaseFormatSerializer(many=True, read_only=True)
    cost_per_base = serializers.SerializerMethodField()

    class Meta:
        model = Insumo
        fields = [
            'id', 'name', 'base_unit', 'density_g_per_ml', 'weight_per_piece_g',
            'cleaning_yield', 'cooking_yield', 'merma_gross', 'merma_net',
            'reference_format', 'formats', 'cost_per_base', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        r = _restaurant(self.context)
        if r is not None:
            # reference_format debe ser un formato del propio restaurante.
            self.fields['reference_format'].queryset = PurchaseFormat.objects.filter(insumo__restaurant=r)

    def get_cost_per_base(self, obj):
        try:
            return str(services.insumo_gross_cost_per_base(obj))
        except (services.CosteoError, UnitError):
            return None

    def validate_reference_format(self, value):
        if value and self.instance and value.insumo_id != self.instance.id:
            raise serializers.ValidationError('El formato de referencia debe ser de este insumo.')
        return value


class PriceHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceHistory
        fields = ['id', 'purchase_format', 'price', 'price_includes_iva', 'iva_rate', 'note', 'recorded_at']
        read_only_fields = ['recorded_at']


# ── Escandallos (Costing) ───────────────────────────────────────────────────
class CostingLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = CostingLine
        fields = [
            'id', 'insumo', 'subrecipe', 'quantity', 'unit',
            'cleaning_yield_override', 'cooking_yield_override', 'order',
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        r = _restaurant(self.context)
        if r is not None:
            self.fields['insumo'].queryset = Insumo.objects.filter(restaurant=r)
            self.fields['subrecipe'].queryset = Costing.objects.filter(restaurant=r, is_subrecipe=True)

    def validate(self, data):
        insumo = data.get('insumo')
        sub = data.get('subrecipe')
        if bool(insumo) == bool(sub):
            raise serializers.ValidationError('Cada línea debe referenciar un insumo O una subreceta (exactamente uno).')
        return data


class CostingSerializer(serializers.ModelSerializer):
    lines = CostingLineSerializer(many=True, required=False)
    breakdown = serializers.SerializerMethodField()
    recipe_code = serializers.SerializerMethodField()

    class Meta:
        model = Costing
        fields = [
            'id', 'name', 'is_subrecipe', 'servings', 'yield_quantity', 'yield_unit', 'portions',
            'target_food_cost', 'iva_rate', 'sale_price', 'recipe', 'recipe_code',
            'unit_cost_base_snapshot', 'lines', 'breakdown', 'created_at', 'updated_at',
        ]
        read_only_fields = ['unit_cost_base_snapshot', 'created_at', 'updated_at']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        r = _restaurant(self.context)
        if r is not None:
            from recipes.models import Recipe
            self.fields['recipe'].queryset = Recipe.objects.filter(restaurant=r)

    def get_recipe_code(self, obj):
        return obj.recipe.code if obj.recipe else None

    def get_breakdown(self, obj):
        r = _restaurant(self.context)
        try:
            return services.public(services.compute_costing(obj, r))
        except (services.CosteoError, UnitError) as e:
            return {'error': str(e)}

    def create(self, validated_data):
        lines = validated_data.pop('lines', [])
        costing = Costing.objects.create(**validated_data)
        self._save_lines(costing, lines)
        services.refresh_snapshot(costing, costing.restaurant)
        return costing

    def update(self, instance, validated_data):
        lines = validated_data.pop('lines', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if lines is not None:
            instance.lines.all().delete()
            self._save_lines(instance, lines)
        services.refresh_snapshot(instance, instance.restaurant)
        return instance

    def _save_lines(self, costing, lines):
        for i, ln in enumerate(lines):
            CostingLine.objects.create(costing=costing, order=ln.get('order', i + 1), **{
                k: ln.get(k) for k in ('insumo', 'subrecipe', 'quantity', 'unit',
                                       'cleaning_yield_override', 'cooking_yield_override')
            })


# ── Preview (sin persistencia): valida el borrador y llama al MISMO motor ────
class PreviewLineSerializer(serializers.Serializer):
    insumo = serializers.IntegerField(required=False, allow_null=True)
    subrecipe = serializers.IntegerField(required=False, allow_null=True)
    quantity = serializers.DecimalField(max_digits=14, decimal_places=4)
    unit = serializers.CharField(max_length=8)
    cleaning_yield_override = serializers.DecimalField(max_digits=6, decimal_places=4, required=False, allow_null=True)
    cooking_yield_override = serializers.DecimalField(max_digits=6, decimal_places=4, required=False, allow_null=True)
    order = serializers.IntegerField(required=False)

    def validate(self, data):
        if bool(data.get('insumo')) == bool(data.get('subrecipe')):
            raise serializers.ValidationError('Cada línea debe referenciar un insumo O una subreceta.')
        return data


class PreviewSerializer(serializers.Serializer):
    """Solo acepta del cliente: cantidades, unidades, mermas, food cost objetivo,
    IVA, raciones y referencias por id. NUNCA precios ni costes."""

    name = serializers.CharField(required=False, allow_blank=True)
    is_subrecipe = serializers.BooleanField(required=False, default=False)
    servings = serializers.IntegerField(required=False, min_value=1, default=1)
    yield_quantity = serializers.DecimalField(max_digits=14, decimal_places=4, required=False, allow_null=True)
    yield_unit = serializers.CharField(max_length=4, required=False, default='g')
    portions = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    target_food_cost = serializers.DecimalField(max_digits=5, decimal_places=4, required=False, allow_null=True)
    iva_rate = serializers.DecimalField(max_digits=5, decimal_places=4, required=False, allow_null=True)
    sale_price = serializers.DecimalField(max_digits=12, decimal_places=4, required=False, allow_null=True)
    lines = PreviewLineSerializer(many=True)

    def to_spec(self):
        v = self.validated_data
        return {
            'name': v.get('name', ''),
            'is_subrecipe': v.get('is_subrecipe', False),
            'servings': v.get('servings', 1),
            'yield_quantity': v.get('yield_quantity'),
            'yield_unit': v.get('yield_unit', 'g'),
            'portions': v.get('portions'),
            'target_food_cost': v.get('target_food_cost'),
            'iva_rate': v.get('iva_rate'),
            'sale_price': v.get('sale_price'),
            'lines': [
                {
                    'insumo_id': l.get('insumo'), 'subrecipe_id': l.get('subrecipe'),
                    'quantity': l['quantity'], 'unit': l['unit'],
                    'cleaning_yield_override': l.get('cleaning_yield_override'),
                    'cooking_yield_override': l.get('cooking_yield_override'),
                    'order': l.get('order'),
                }
                for l in v['lines']
            ],
        }
