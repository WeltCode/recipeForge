from django.db import migrations


def assign_existing_recipes(apps, schema_editor):
    Restaurant = apps.get_model('accounts', 'Restaurant')
    Recipe = apps.get_model('recipes', 'Recipe')

    orphans = Recipe.objects.filter(restaurant__isnull=True)
    if not orphans.exists():
        return

    restaurant, _ = Restaurant.objects.get_or_create(name='Leche de Tigre')
    orphans.update(restaurant=restaurant)


def reverse(apps, schema_editor):
    # No se revierte la asignación (dejarlo como no-op).
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('recipes', '0007_recipe_restaurant_alter_recipe_code_and_more'),
        ('accounts', '0002_restaurant_userprofile_restaurant'),
    ]

    operations = [
        migrations.RunPython(assign_existing_recipes, reverse),
    ]
