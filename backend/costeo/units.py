"""Unidades y conversión con puentes (masa↔volumen, conteo↔masa).

Unidad base canónica por dimensión: masa=g, volumen=ml, pieza=ud.
Todo en Decimal; no se redondea aquí (solo se convierte)."""
from decimal import Decimal


class UnitError(ValueError):
    """Error de conversión de unidades con mensaje claro (nunca 500)."""


# unidad -> (dimensión, factor a la unidad canónica de su dimensión)
_UNITS = {
    'mg': ('mass', Decimal('0.001')),
    'g': ('mass', Decimal('1')),
    'kg': ('mass', Decimal('1000')),
    'ml': ('vol', Decimal('1')),
    'cl': ('vol', Decimal('10')),
    'dl': ('vol', Decimal('100')),
    'l': ('vol', Decimal('1000')),
    'ud': ('count', Decimal('1')),
    'u': ('count', Decimal('1')),
    'pieza': ('count', Decimal('1')),
    'unidad': ('count', Decimal('1')),
}

CANONICAL = {'mass': 'g', 'vol': 'ml', 'count': 'ud'}


def norm(unit):
    return (unit or '').strip().lower()


def dimension(unit):
    u = norm(unit)
    if u not in _UNITS:
        raise UnitError(f'Unidad no reconocida: «{unit}».')
    return _UNITS[u][0]


def to_canonical(qty, unit):
    """Convierte `qty` `unit` a la unidad canónica de su dimensión (g/ml/ud).
    Devuelve (Decimal, dimensión)."""
    u = norm(unit)
    if u not in _UNITS:
        raise UnitError(f'Unidad no reconocida: «{unit}».')
    dim, factor = _UNITS[u]
    return (Decimal(str(qty)) * factor, dim)


def convert_to_base(qty, unit, base_unit, *, density=None, weight_per_piece=None):
    """Convierte `qty` `unit` a la unidad base canónica del insumo (`base_unit`
    ∈ g/ml/ud), usando puentes si cruzan dimensiones:
      - masa↔volumen: densidad (g/ml).
      - conteo↔masa: peso por pieza (g/ud).
      - conteo↔volumen: encadena conteo→masa→volumen (requiere ambos).
    Lanza UnitError claro si falta el dato del puente."""
    base = norm(base_unit)
    if base not in _UNITS:
        raise UnitError(f'Unidad base no reconocida: «{base_unit}».')
    base_dim = _UNITS[base][0]
    q, dim = to_canonical(qty, unit)  # q en g/ml/ud de su propia dimensión

    if dim == base_dim:
        return q

    d = Decimal(str(density)) if density else None
    w = Decimal(str(weight_per_piece)) if weight_per_piece else None

    if dim == 'mass' and base_dim == 'vol':
        if not d:
            raise UnitError('Falta la densidad (g/ml) del insumo para convertir masa a volumen.')
        return q / d
    if dim == 'vol' and base_dim == 'mass':
        if not d:
            raise UnitError('Falta la densidad (g/ml) del insumo para convertir volumen a masa.')
        return q * d
    if dim == 'count' and base_dim == 'mass':
        if not w:
            raise UnitError('Falta el peso por pieza (g/ud) del insumo para convertir piezas a masa.')
        return q * w
    if dim == 'mass' and base_dim == 'count':
        if not w:
            raise UnitError('Falta el peso por pieza (g/ud) del insumo para convertir masa a piezas.')
        return q / w
    if dim == 'count' and base_dim == 'vol':
        if not w or not d:
            raise UnitError('Faltan peso por pieza y densidad para convertir piezas a volumen.')
        return (q * w) / d
    if dim == 'vol' and base_dim == 'count':
        if not w or not d:
            raise UnitError('Faltan densidad y peso por pieza para convertir volumen a piezas.')
        return (q * d) / w

    raise UnitError(f'No se puede convertir de {dim} a {base_dim}.')
