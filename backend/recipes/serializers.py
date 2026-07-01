from rest_framework import serializers

from . import models


class IngredientLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.IngredientLine
        fields = ['id', 'group_name', 'ingredient_name', 'quantity', 'unit', 'note', 'order']


class ProductionStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ProductionStep
        fields = ['id', 'step_number', 'title', 'instruction', 'tip', 'order']


class RecipeListSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Recipe
        fields = [
            'id', 'code', 'name', 'category', 'revision',
            'servings', 'prep_time_value', 'prep_time_unit',
            'cook_time_value', 'cook_time_unit',
            'created_at', 'updated_at',
        ]


class RecipeDetailSerializer(serializers.ModelSerializer):
    ingredients = IngredientLineSerializer(many=True, required=False)
    steps = ProductionStepSerializer(many=True, required=False)
    final_photo = serializers.ImageField(required=False, allow_null=True)
    revision = serializers.IntegerField(read_only=True)

    class Meta:
        model = models.Recipe
        fields = [
            'id', 'code', 'name', 'category', 'description', 'revision',
            'servings', 'yield_quantity', 'yield_unit',
            'prep_time_value', 'prep_time_unit',
            'cook_time_value', 'cook_time_unit',
            'shelf_life_value', 'shelf_life_unit',
            'observations',
            'final_photo', 'ingredients', 'steps',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['revision', 'created_at', 'updated_at']

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
