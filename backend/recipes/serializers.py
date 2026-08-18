from rest_framework import serializers

from accounts.models import user_can

from . import models
from .constants import ALLERGEN_KEYS, clean_allergens


def media_url(request, name):
    """URL del proxy de medias del backend (evita depender del público r2.dev)."""
    if not name:
        return None
    path = f'/api/media/{name}'
    return request.build_absolute_uri(path) if request else path


class IngredientLineSerializer(serializers.ModelSerializer):
    allergens = serializers.ListField(child=serializers.CharField(), required=False)

    class Meta:
        model = models.IngredientLine
        fields = [
            'id', 'group_name', 'ingredient_name', 'quantity', 'unit', 'note',
            'allergens', 'product', 'order',
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Aislamiento: solo se puede enlazar un producto del propio restaurante.
        from catalog.models import Product
        from accounts.models import get_user_restaurant
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user and user.is_authenticated and not user.is_superuser:
            self.fields['product'].queryset = Product.objects.filter(
                restaurant=get_user_restaurant(user),
            )

    def validate_allergens(self, value):
        return clean_allergens(value)


class ProductionStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ProductionStep
        fields = ['id', 'step_number', 'title', 'instruction', 'tip', 'order']


def recipe_allergen_summary(recipe):
    """Unión de los alérgenos declarados en las líneas y los de sus productos,
    en el orden oficial de los 14 UE."""
    found = set()
    for line in recipe.ingredients.all():
        for a in (line.allergens or []):
            found.add(a)
        if line.product_id and getattr(line, 'product', None):
            for a in (line.product.allergens or []):
                found.add(a)
    return [k for k in ALLERGEN_KEYS if k in found]


class RecipeListSerializer(serializers.ModelSerializer):
    allergen_summary = serializers.SerializerMethodField()

    class Meta:
        model = models.Recipe
        fields = [
            'id', 'code', 'name', 'template', 'accent_color', 'category', 'description', 'revision',
            'servings', 'prep_time_value', 'prep_time_unit',
            'cook_time_value', 'cook_time_unit',
            'final_photo', 'allergen_summary', 'restaurant', 'created_at', 'updated_at',
        ]

    def get_allergen_summary(self, obj):
        return recipe_allergen_summary(obj)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.final_photo:
            data['final_photo'] = media_url(self.context.get('request'), instance.final_photo.name)
        return data


class RecipeDetailSerializer(serializers.ModelSerializer):
    ingredients = IngredientLineSerializer(many=True, required=False)
    steps = ProductionStepSerializer(many=True, required=False)
    final_photo = serializers.ImageField(required=False, allow_null=True)
    revision = serializers.IntegerField(read_only=True)
    restaurant_name = serializers.SerializerMethodField()
    restaurant_logo = serializers.SerializerMethodField()
    allergen_summary = serializers.SerializerMethodField()

    class Meta:
        model = models.Recipe
        fields = [
            'id', 'code', 'name', 'template', 'accent_color', 'category', 'description', 'revision',
            'servings', 'yield_quantity', 'yield_unit',
            'prep_time_value', 'prep_time_unit',
            'cook_time_value', 'cook_time_unit',
            'shelf_life_value', 'shelf_life_unit',
            'observations', 'sale_price',
            'final_photo', 'restaurant_name', 'restaurant_logo',
            'allergen_summary', 'ingredients', 'steps',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['revision', 'created_at', 'updated_at']

    def get_allergen_summary(self, obj):
        return recipe_allergen_summary(obj)

    def get_restaurant_name(self, obj):
        return obj.restaurant.name if obj.restaurant else None

    def get_restaurant_logo(self, obj):
        if obj.restaurant and obj.restaurant.logo:
            return media_url(self.context.get('request'), obj.restaurant.logo.name)
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.final_photo:
            data['final_photo'] = media_url(self.context.get('request'), instance.final_photo.name)
        # Ocultar el PVP a quien no tiene permiso de escandallo (seguridad).
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        can_cost = bool(user and user.is_authenticated and (
            user.is_superuser or user_can(user, 'can_view_escandallo')
        ))
        if not can_cost:
            data.pop('sale_price', None)
        return data

    def create(self, validated_data):
        ingredients_data = validated_data.pop('ingredients', [])
        steps_data = validated_data.pop('steps', [])

        recipe = models.Recipe.objects.create(**validated_data)

        if ingredients_data:
            models.IngredientLine.objects.bulk_create(
                [models.IngredientLine(recipe=recipe, **ing) for ing in ingredients_data]
            )
        if steps_data:
            models.ProductionStep.objects.bulk_create(
                [models.ProductionStep(recipe=recipe, **step) for step in steps_data]
            )
        return recipe

    def update(self, instance, validated_data):
        ingredients_data = validated_data.pop('ingredients', None)
        steps_data = validated_data.pop('steps', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Auto-incrementar revisión en cada edición
        instance.revision += 1
        instance.save()

        if ingredients_data is not None:
            instance.ingredients.all().delete()
            if ingredients_data:
                models.IngredientLine.objects.bulk_create(
                    [models.IngredientLine(recipe=instance, **ing) for ing in ingredients_data]
                )

        if steps_data is not None:
            instance.steps.all().delete()
            if steps_data:
                models.ProductionStep.objects.bulk_create(
                    [models.ProductionStep(recipe=instance, **step) for step in steps_data]
                )

        return instance
