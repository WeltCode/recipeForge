#!/usr/bin/env python
import os
import django
import base64

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from recipes.models import Recipe
from django.template.loader import render_to_string
from collections import OrderedDict

recipe = Recipe.objects.first()
if recipe:
    ingredients_by_group = OrderedDict()
    for ing in recipe.ingredients.all():
        group = ing.group_name or 'Sin grupo'
        if group not in ingredients_by_group:
            ingredients_by_group[group] = []
        ingredients_by_group[group].append(ing)
    
    steps = list(recipe.steps.all())
    
    # Leer logo
    logo_path = os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'src', 'assets', 'ldt.png')
    logo_base64 = ''
    if os.path.exists(logo_path):
        with open(logo_path, 'rb') as f:
            logo_base64 = base64.b64encode(f.read()).decode()
    
    # Leer foto
    photo_data = ''
    if recipe.final_photo:
        try:
            with open(recipe.final_photo.path, 'rb') as f:
                photo_data = base64.b64encode(f.read()).decode()
        except (OSError, IOError):
            photo_data = ''
    
    context = {
        'recipe': recipe,
        'ingredients_by_group': list(ingredients_by_group.items()),
        'steps': steps,
        'logo_base64': logo_base64,
        'photo_data': photo_data,
    }
    
    try:
        html = render_to_string('recipe_sheet.html', context)
        print(f"✓ Template renderizado exitosamente")
        print(f"  HTML size: {len(html)} bytes")
        
        # Guardar para inspección
        with open('test_recipe.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"✓ Guardado en test_recipe.html para inspección")
    except Exception as e:
        print(f"✗ Error al renderizar template: {e}")
        import traceback
        traceback.print_exc()
else:
    print("✗ No recipe found")
