from rest_framework import serializers

from . import models


class IngredientLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.IngredientLine
        fields = [
            'id',
            'group_name',
            'ingredient_name',
            'quantity',
            'unit',
            'note',
            'order',
        ]


class ProductionStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ProductionStep
        fields = [
            'id',
            'step_number',
            'title',
            'instruction',
            'tip',
            'order',
        ]


class RecipeListSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Recipe
        fields = [
            'id',
            'code',
            'name',
            'category',
            'servings',
            'prep_time_min',
            'cook_time_min',
            'created_at',
            'updated_at',
        ]


class RecipeDetailSerializer(serializers.ModelSerializer):
    ingredients = IngredientLineSerializer(many=True)
    steps = ProductionStepSerializer(many=True)
    final_photo = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = models.Recipe
        fields = [
            'id',
            'code',
            'name',
            'category',
            'description',
            'servings',
            'yield_grams',
            'prep_time_min',
            'cook_time_min',
            'service_temp_c',
            'notes',
            'final_photo',
            'ingredients',
            'steps',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def create(self, validated_data):
        ingredients_data = validated_data.pop('ingredients', [])
        steps_data = validated_data.pop('steps', [])

        recipe = models.Recipe.objects.create(**validated_data)

        ingredient_objs = [
            models.IngredientLine(recipe=recipe, **ingredient) for ingredient in ingredients_data
        ]
        step_objs = [models.ProductionStep(recipe=recipe, **step) for step in steps_data]

        if ingredient_objs:
            models.IngredientLine.objects.bulk_create(ingredient_objs)
        if step_objs:
            models.ProductionStep.objects.bulk_create(step_objs)

        return recipe

    def update(self, instance, validated_data):
        ingredients_data = validated_data.pop('ingredients', None)
        steps_data = validated_data.pop('steps', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if ingredients_data is not None:
            instance.ingredients.all().delete()
            ingredient_objs = [
                models.IngredientLine(recipe=instance, **ingredient) for ingredient in ingredients_data
            ]
            if ingredient_objs:
                models.IngredientLine.objects.bulk_create(ingredient_objs)

        if steps_data is not None:
            instance.steps.all().delete()
            step_objs = [models.ProductionStep(recipe=instance, **step) for step in steps_data]
            if step_objs:
                models.ProductionStep.objects.bulk_create(step_objs)

        return instance
