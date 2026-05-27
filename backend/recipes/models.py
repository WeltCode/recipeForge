from django.db import models


class Recipe(models.Model):
    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=180)
    category = models.CharField(max_length=120, blank=True)
    description = models.TextField(blank=True)
    servings = models.PositiveIntegerField(default=1)
    yield_grams = models.PositiveIntegerField(null=True, blank=True)
    prep_time_min = models.PositiveIntegerField(default=0)
    cook_time_min = models.PositiveIntegerField(default=0)
    service_temp_c = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

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
