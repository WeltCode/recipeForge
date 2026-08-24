from django.db import models

from accounts.models import TEMPLATE_CHOICES


class Recipe(models.Model):
    SHELF_LIFE_UNITS = [('dias', 'Días'), ('meses', 'Meses')]
    YIELD_UNITS = [('g', 'Gramos'), ('kg', 'Kilos')]

    restaurant = models.ForeignKey(
        'accounts.Restaurant', null=True, blank=True,
        on_delete=models.CASCADE, related_name='recipes',
    )
    code = models.CharField(max_length=32)
    name = models.CharField(max_length=180)
    template = models.CharField(max_length=20, choices=TEMPLATE_CHOICES, default='formal')
    accent_color = models.CharField(max_length=9, blank=True)  # color de acento personalizado (hex); vacío = por defecto
    category = models.CharField(max_length=120, blank=True)
    description = models.TextField(blank=True)
    revision = models.PositiveIntegerField(default=1)
    servings = models.PositiveIntegerField(default=1)
    yield_quantity = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    yield_unit = models.CharField(max_length=2, choices=YIELD_UNITS, default='g')
    TIME_UNITS = [('min', 'Minutos'), ('h', 'Horas')]
    prep_time_value = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    prep_time_unit = models.CharField(max_length=3, choices=TIME_UNITS, default='min')
    cook_time_value = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    cook_time_unit = models.CharField(max_length=3, choices=TIME_UNITS, default='min')
    shelf_life_value = models.PositiveIntegerField(null=True, blank=True)
    shelf_life_unit = models.CharField(max_length=6, choices=SHELF_LIFE_UNITS, default='dias')
    observations = models.TextField(blank=True)
    # Alérgenos declarados de la receta (lista de claves de los 14 UE). Se
    # eligen a nivel de ficha (debajo de Observaciones), no por ingrediente.
    allergens = models.JSONField(default=list, blank=True)
    # Precio de venta (PVP) para el escandallo: food cost % y margen. Solo lo
    # ve/edita quien tiene permiso de escandallo (se filtra en el serializer).
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    # Carta pública (Fase 2): el plato se muestra en la carta con QR.
    on_menu = models.BooleanField(default=False)
    menu_section = models.CharField(max_length=80, blank=True)  # sección libre (Entrantes, Postres…)
    menu_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)  # si vacío usa sale_price
    menu_order = models.PositiveIntegerField(default=0)
    menu_description = models.TextField(blank=True)  # texto público apetecible (distinto de la ficha)
    final_photo = models.ImageField(upload_to='recipe_photos/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['restaurant', 'code'], name='unique_code_per_restaurant',
            )
        ]

    def __str__(self):
        return f'{self.code} - {self.name}'


class IngredientLine(models.Model):
    recipe = models.ForeignKey(Recipe, related_name='ingredients', on_delete=models.CASCADE)
    group_name = models.CharField(max_length=120, blank=True)
    ingredient_name = models.CharField(max_length=180)
    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    unit = models.CharField(max_length=32)
    note = models.CharField(max_length=220, blank=True)
    # Alérgenos declarados en esta línea (lista de claves de los 14 UE).
    allergens = models.JSONField(default=list, blank=True)
    # Producto del catálogo enlazado (opcional) — alimenta el escandallo.
    product = models.ForeignKey(
        'catalog.Product', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='ingredient_lines',
    )
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f'{self.ingredient_name} ({self.quantity} {self.unit})'


class ProductionStep(models.Model):
    recipe = models.ForeignKey(Recipe, related_name='steps', on_delete=models.CASCADE)
    step_number = models.PositiveIntegerField(default=1)
    title = models.CharField(max_length=180)
    instruction = models.TextField()
    tip = models.CharField(max_length=280, blank=True)
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f'Paso {self.step_number}: {self.title}'


class Especial(models.Model):
    """Especial "fuera de carta" (Fase 2). Lo gestiona el owner/chef y se publica
    en un QR aparte. Clasificación TODA opcional (flexible): el chef decide cómo
    organizarlos; el público se agrupa por lo que esté relleno."""

    TEMP_CHOICES = [
        ('frio', 'Frío'),
        ('caliente_tierra', 'Caliente (tierra)'),
        ('caliente_mar', 'Caliente (mar)'),
    ]
    CAT_CHOICES = [('entrante', 'Entrante'), ('plato_fuerte', 'Plato fuerte')]
    FORMATO_CHOICES = [('individual', 'Individual'), ('compartir', 'Para compartir')]

    restaurant = models.ForeignKey(
        'accounts.Restaurant', on_delete=models.CASCADE, related_name='especiales',
    )
    name = models.CharField(max_length=180)
    # Enlace opcional a una ficha existente (un especial puede ser ad-hoc).
    recipe = models.ForeignKey(
        Recipe, null=True, blank=True, on_delete=models.SET_NULL, related_name='+',
    )
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    description = models.TextField(blank=True)          # descripción del plato
    sales_pitch = models.TextField(blank=True)          # speech de venta para el camarero
    temperatura = models.CharField(max_length=16, choices=TEMP_CHOICES, blank=True)
    categoria = models.CharField(max_length=16, choices=CAT_CHOICES, blank=True)
    formato = models.CharField(max_length=16, choices=FORMATO_CHOICES, blank=True)
    para_personas = models.PositiveIntegerField(null=True, blank=True)  # ideal para N personas
    available = models.BooleanField(default=True)       # encender/apagar sin borrar
    order = models.PositiveIntegerField(default=0)
    photo = models.ImageField(upload_to='especial_photos/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', '-created_at']

    def __str__(self):
        return self.name
