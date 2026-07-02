import re

from django.db import migrations


def derive_prefixes(apps, schema_editor):
    """Deduce el prefijo de cada restaurante a partir de los códigos de sus recetas."""
    Restaurant = apps.get_model('accounts', 'Restaurant')
    for restaurant in Restaurant.objects.all():
        if restaurant.code_prefix:
            continue
        prefixes = {}
        for code in restaurant.recipes.values_list('code', flat=True):
            m = re.match(r'^([A-Za-z]+\d*)-\d+$', code or '')
            if m:
                p = m.group(1).upper()
                prefixes[p] = prefixes.get(p, 0) + 1
        if prefixes:
            restaurant.code_prefix = max(prefixes, key=prefixes.get)
            restaurant.save(update_fields=['code_prefix'])


def reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_restaurant_code_prefix'),
    ]

    operations = [
        migrations.RunPython(derive_prefixes, reverse),
    ]
