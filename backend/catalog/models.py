from decimal import Decimal

from django.db import models


# Unidades base de un producto. El coste se expresa por 1 de estas unidades.
# Familias para poder convertir la cantidad de una receta al coste del producto:
#   masa: kg/g · volumen: l/ml · recuento: ud
UNIT_CHOICES = [
    ('kg', 'Kilogramo'),
    ('g', 'Gramo'),
    ('l', 'Litro'),
    ('ml', 'Mililitro'),
    ('ud', 'Unidad'),
    ('pack', 'Pack'),
]

# Factor a la unidad "canónica" de cada familia (masa->g, volumen->ml, ud/pack cuenta).
UNIT_FAMILY = {'kg': 'masa', 'g': 'masa', 'l': 'vol', 'ml': 'vol', 'ud': 'ud', 'pack': 'pack'}
UNIT_TO_BASE = {'kg': Decimal('1000'), 'g': Decimal('1'), 'l': Decimal('1000'), 'ml': Decimal('1'), 'ud': Decimal('1'), 'pack': Decimal('1')}


def convert_qty(qty, from_unit, to_unit):
    """Convierte `qty` de `from_unit` a `to_unit` si son de la misma familia.
    Devuelve None si no se pueden convertir (unidades incompatibles)."""
    if qty is None or from_unit not in UNIT_FAMILY or to_unit not in UNIT_FAMILY:
        return None
    if UNIT_FAMILY[from_unit] != UNIT_FAMILY[to_unit]:
        return None
    return Decimal(str(qty)) * UNIT_TO_BASE[from_unit] / UNIT_TO_BASE[to_unit]


class Partida(models.Model):
    """Partida de cocina (Fríos, Calientes, Fritos, Postres…) para clasificar
    los insumos del inventario. Cada restaurante crea las suyas."""

    restaurant = models.ForeignKey(
        'accounts.Restaurant', on_delete=models.CASCADE, related_name='partidas',
    )
    name = models.CharField(max_length=80)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(
                fields=['restaurant', 'name'], name='unique_partida_name_per_restaurant',
            ),
        ]

    def __str__(self):
        return self.name


class Supplier(models.Model):
    """Proveedor de un restaurante (surte productos del catálogo)."""

    restaurant = models.ForeignKey(
        'accounts.Restaurant', on_delete=models.CASCADE, related_name='suppliers',
    )
    name = models.CharField(max_length=180)
    contact_name = models.CharField(max_length=120, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=40, blank=True)
    # Datos ampliados del proveedor.
    tax_id = models.CharField(max_length=40, blank=True)         # CIF/NIF
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=120, blank=True)
    website = models.CharField(max_length=200, blank=True)
    payment_terms = models.CharField(max_length=120, blank=True)  # p.ej. "30 días"
    delivery_days = models.CharField(max_length=120, blank=True)  # p.ej. "L, X, V"
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(
                fields=['restaurant', 'name'], name='unique_supplier_name_per_restaurant',
            ),
        ]

    def __str__(self):
        return self.name


class Product(models.Model):
    """Producto de COMPRA: lo que se le compra a un proveedor, con su precio.
    Da coste al escandallo. NO es inventario (eso es InventoryItem)."""

    restaurant = models.ForeignKey(
        'accounts.Restaurant', on_delete=models.CASCADE, related_name='products',
    )
    name = models.CharField(max_length=180)
    category = models.CharField(max_length=120, blank=True)
    supplier = models.ForeignKey(
        Supplier, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='products',
    )
    # Compra: un pack de `pack_size` `base_unit` cuesta `pack_price`.
    base_unit = models.CharField(max_length=4, choices=UNIT_CHOICES, default='kg')
    pack_size = models.DecimalField(max_digits=12, decimal_places=3, default=1)
    pack_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(
                fields=['restaurant', 'name'], name='unique_product_name_per_restaurant',
            ),
        ]

    def __str__(self):
        return self.name

    @property
    def unit_cost(self):
        """Coste de 1 `base_unit` del producto."""
        if self.pack_size and self.pack_price:
            return (self.pack_price / self.pack_size).quantize(Decimal('0.0001'))
        return Decimal('0')

    def line_cost(self, quantity, unit):
        """Coste de usar `quantity` `unit` de este producto, o None si las
        unidades no son convertibles a la unidad base del producto."""
        conv = convert_qty(quantity, unit, self.base_unit)
        if conv is None:
            return None
        return (conv * self.unit_cost).quantize(Decimal('0.01'))


class InventoryItem(models.Model):
    """Inventario de PRODUCCIÓN: lo que el personal tiene hecho/almacenado
    (p.ej. en congeladoras), clasificado por partida. NO tiene proveedor ni
    precio; es independiente del catálogo de compras (Product)."""

    restaurant = models.ForeignKey(
        'accounts.Restaurant', on_delete=models.CASCADE, related_name='inventory_items',
    )
    name = models.CharField(max_length=180)
    partida = models.ForeignKey(
        Partida, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='items',
    )
    quantity = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    unit = models.CharField(max_length=4, choices=UNIT_CHOICES, default='ud')
    stock_min = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    notes = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def low_stock(self):
        return bool(self.stock_min) and self.quantity <= self.stock_min


class Escandallo(models.Model):
    """Escandallo (coste) de un plato. Entidad INDEPENDIENTE de la receta: se
    puede crear sin receta, partir de una receta existente para costearla, o
    generar una receta nueva a partir de sus insumos."""

    restaurant = models.ForeignKey(
        'accounts.Restaurant', on_delete=models.CASCADE, related_name='escandallos',
    )
    name = models.CharField(max_length=180)
    servings = models.PositiveIntegerField(default=1)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    # Receta enlazada (si el escandallo se creó desde/para una receta), o None.
    recipe = models.ForeignKey(
        'recipes.Recipe', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='escandallos',
    )
    notes = models.CharField(max_length=280, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at', '-id']

    def __str__(self):
        return self.name


class EscandalloLine(models.Model):
    """Línea de insumo de un escandallo (referencia opcional a un producto)."""

    escandallo = models.ForeignKey(Escandallo, related_name='lines', on_delete=models.CASCADE)
    ingredient_name = models.CharField(max_length=180)
    product = models.ForeignKey(
        Product, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='escandallo_lines',
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    unit = models.CharField(max_length=32, default='g')
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f'{self.ingredient_name} ({self.quantity} {self.unit})'
