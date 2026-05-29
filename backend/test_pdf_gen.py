#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from recipes.models import Recipe
from recipes.pdf import build_recipe_pdf
from collections import OrderedDict

recipe = Recipe.objects.first()
if recipe:
    ingredients_by_group = OrderedDict()
    for ing in recipe.ingredients.all():
        group = ing.group or 'Sin grupo'
        if group not in ingredients_by_group:
            ingredients_by_group[group] = []
        ingredients_by_group[group].append(ing)
    
    steps = list(recipe.steps.all())
    
    try:
        pdf = build_recipe_pdf(recipe, list(ingredients_by_group.items()), steps)
        print(f'✓ PDF generado exitosamente: {len(pdf)} bytes')
    except Exception as e:
        print(f'✗ Error: {e}')
        import traceback
        traceback.print_exc()
else:
    print('No recipe found')
