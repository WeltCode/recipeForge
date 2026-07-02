from django.db import models


class Recipe(models.Model):
    SHELF_LIFE_UNITS = [('dias', 'Días'), ('meses', 'Meses')]
    YIELD_UNITS = [('g', 'Gramos'), ('kg', 'Kilos')]

    restaurant = models.ForeignKey(
        'accounts.Restaurant', null=True, blank=True,
        on_delete=models.CASCADE, related_name='recipes',
    )
    code = models.CharField(max_length=32)
    name = models.CharField(max_length=180)
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
