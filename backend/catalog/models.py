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
]

# Factor a la unidad "canónica" de cada familia (masa->g, volumen->ml, ud->ud).
UNIT_FAMILY = {'kg': 'masa', 'g': 'masa', 'l': 'vol', 'ml': 'vol', 'ud': 'ud'}
UNIT_TO_BASE = {'kg': Decimal('1000'), 'g': Decimal('1'), 'l': Decimal('1000'), 'ml': Decimal('1'), 'ud': Decimal('1')}


def convert_qty(qty, from_unit, to_unit):
    """Convierte `qty` de `from_unit` a `to_unit` si son de la misma familia.
    Devuelve None si no se pueden convertir (unidades incompatibles)."""
    if qty is None or from_unit not in UNIT_FAMILY or to_unit not in UNIT_FAMILY:
        return None
    if UNIT_FAMILY[from_unit] != UNIT_FAMILY[to_unit]:
        return None
    return Decimal(str(qty)) * UNIT_TO_BASE[from_unit] / UNIT_TO_BASE[to_unit]


class Supplier(models.Model):
    """Proveedor de un restaurante (surte productos del catálogo)."""

    restaurant = models.ForeignKey(
        'accounts.Restaurant', on_delete=models.CASCADE, related_name='suppliers',
    )
    name = models.CharField(max_length=180)
    contact_name = models.CharField(max_length=120, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=40, blank=True)
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
    """Producto/insumo del catálogo. Es el eje: da coste al escandallo,
    stock al inventario y se asocia a un proveedor."""

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
    # Inventario (en `base_unit`).
    stock_qty = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    stock_min = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    # Alérgenos que aporta el producto (claves de los 14 UE).
    allergens = models.JSONField(default=list, blank=True)
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

    @property
    def low_stock(self):
        return self.stock_min and self.stock_qty <= self.stock_min

    def line_cost(self, quantity, unit):
        """Coste de usar `quantity` `unit` de este producto, o None si las
        unidades no son convertibles a la unidad base del producto."""
        conv = convert_qty(quantity, unit, self.base_unit)
        if conv is None:
            return None
        return (conv * self.unit_cost).quantize(Decimal('0.01'))


class StockMovement(models.Model):
    """Entrada o salida de stock de un producto (traza del inventario)."""

    KIND_CHOICES = [('in', 'Entrada'), ('out', 'Salida'), ('adjust', 'Ajuste')]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='movements')
    kind = models.CharField(max_length=6, choices=KIND_CHOICES, default='in')
    quantity = models.DecimalField(max_digits=14, decimal_places=3)  # en base_unit del producto
    note = models.CharField(max_length=220, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']

    def __str__(self):
        return f'{self.get_kind_display()} {self.quantity} · {self.product.name}'
