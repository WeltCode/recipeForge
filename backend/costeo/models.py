from decimal import Decimal

from django.db import models


BASE_UNITS = [('g', 'Gramo (masa)'), ('ml', 'Mililitro (volumen)'), ('ud', 'Unidad (pieza)')]


class Insumo(models.Model):
    """Materia prima con una unidad base canónica (g/ml/ud). El precio vive en
    sus formatos de compra; `reference_format` marca el coste activo."""

    restaurant = models.ForeignKey(
        'accounts.Restaurant', on_delete=models.CASCADE, related_name='costeo_insumos',
    )
    name = models.CharField(max_length=180)
    base_unit = models.CharField(max_length=4, choices=BASE_UNITS, default='g')
    # Puentes entre dimensiones (opcionales; se exigen solo si se necesitan).
    density_g_per_ml = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    weight_per_piece_g = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    # Merma por defecto del insumo (rendimiento en (0,1]; 1 = sin merma).
    cleaning_yield = models.DecimalField(max_digits=6, decimal_places=4, default=Decimal('1'))
    cooking_yield = models.DecimalField(max_digits=6, decimal_places=4, default=Decimal('1'))
    # Formato cuyo precio usan los escandallos (coste de referencia activo).
    reference_format = models.ForeignKey(
        'PurchaseFormat', null=True, blank=True, on_delete=models.SET_NULL, related_name='+',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(fields=['restaurant', 'name'], name='unique_insumo_name_per_restaurant'),
        ]

    def __str__(self):
        return self.name


class PurchaseFormat(models.Model):
    """Formato de compra de un insumo (por proveedor/presentación). El contenido
    se descompone multinivel hasta la unidad base: (∏ pack_levels) × unit_size."""

    insumo = models.ForeignKey(Insumo, on_delete=models.CASCADE, related_name='formats')
    supplier = models.ForeignKey(
        'catalog.Supplier', null=True, blank=True, on_delete=models.SET_NULL, related_name='+',
    )
    description = models.CharField(max_length=200, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=4)
    price_includes_iva = models.BooleanField(default=False)
    iva_rate = models.DecimalField(max_digits=5, decimal_places=4, default=Decimal('0.10'))
    # Embalaje multinivel genérico: lista de factores (caja→pack→…) × unidad.
    # Ej.: pack 6×1L => pack_levels=[6], unit_size=1, unit_size_unit='l'.
    pack_levels = models.JSONField(default=list, blank=True)
    unit_size = models.DecimalField(max_digits=12, decimal_places=4, default=Decimal('1'))
    unit_size_unit = models.CharField(max_length=8, default='g')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at', '-id']

    def __str__(self):
        return f'{self.insumo.name} · {self.description or "formato"}'


class PriceHistory(models.Model):
    """Histórico de precios de un formato. Registrar uno nuevo actualiza el
    precio del formato y la referencia del insumo (recálculo en cascada)."""

    purchase_format = models.ForeignKey(PurchaseFormat, on_delete=models.CASCADE, related_name='history')
    price = models.DecimalField(max_digits=12, decimal_places=4)
    price_includes_iva = models.BooleanField(default=False)
    iva_rate = models.DecimalField(max_digits=5, decimal_places=4, default=Decimal('0.10'))
    note = models.CharField(max_length=200, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-recorded_at', '-id']


class Costing(models.Model):
    """Escandallo de un plato o de una SUBRECETA (is_subrecipe). Una subreceta
    tiene rendimiento (yield) del que deriva su coste por unidad base y puede
    entrar como línea de otros escandallos."""

    restaurant = models.ForeignKey(
        'accounts.Restaurant', on_delete=models.CASCADE, related_name='costeo_costings',
    )
    name = models.CharField(max_length=180)
    is_subrecipe = models.BooleanField(default=False)
    servings = models.PositiveIntegerField(default=1)
    # Rendimiento de la subreceta (en unidad canónica g/ml/ud).
    yield_quantity = models.DecimalField(max_digits=14, decimal_places=4, null=True, blank=True)
    yield_unit = models.CharField(max_length=4, choices=BASE_UNITS, default='g')
    target_food_cost = models.DecimalField(max_digits=5, decimal_places=4, default=Decimal('0.30'))
    iva_rate = models.DecimalField(max_digits=5, decimal_places=4, default=Decimal('0.10'))
    sale_price = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)  # PVP con IVA (opcional)
    # Asociación OPCIONAL a una receta (no altera la receta ni su ficha).
    recipe = models.ForeignKey(
        'recipes.Recipe', null=True, blank=True, on_delete=models.SET_NULL, related_name='+',
    )
    # Snapshot del coste/base (subrecetas) para listar sin recalcular todo.
    unit_cost_base_snapshot = models.DecimalField(max_digits=18, decimal_places=8, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at', '-id']

    def __str__(self):
        return self.name


class CostingLine(models.Model):
    """Línea de un escandallo: un insumo O una subreceta, con cantidad+unidad y
    override opcional de merma."""

    costing = models.ForeignKey(Costing, on_delete=models.CASCADE, related_name='lines')
    insumo = models.ForeignKey(Insumo, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    subrecipe = models.ForeignKey(
        Costing, null=True, blank=True, on_delete=models.SET_NULL, related_name='used_in',
    )
    quantity = models.DecimalField(max_digits=14, decimal_places=4)
    unit = models.CharField(max_length=8)
    cleaning_yield_override = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True)
    cooking_yield_override = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True)
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['order', 'id']
