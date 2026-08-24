from django.db import migrations
from django.utils.text import slugify


def backfill_slugs(apps, schema_editor):
    """Genera public_slug para los restaurantes existentes (columna nueva,
    aditivo). Replica la lógica del save() del modelo con el modelo histórico."""
    Restaurant = apps.get_model('accounts', 'Restaurant')
    for r in Restaurant.objects.filter(public_slug__isnull=True):
        base = slugify(r.name)[:70] or 'restaurante'
        slug, i = base, 2
        while Restaurant.objects.exclude(pk=r.pk).filter(public_slug=slug).exists():
            slug = f'{base}-{i}'
            i += 1
        r.public_slug = slug
        r.save(update_fields=['public_slug'])


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0013_restaurant_carta_published_restaurant_public_slug'),
    ]

    operations = [
        migrations.RunPython(backfill_slugs, migrations.RunPython.noop),
    ]
