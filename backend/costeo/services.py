"""Motor de cálculo del escandallo. Autoritativo (backend), sin estado y en
Decimal. Lo usan por igual el preview (sin persistir) y el CRUD (persistido):
la lógica NO se duplica. Solo se redondea al presentar."""
from decimal import Decimal, ROUND_HALF_UP

from . import units
from .models import Costing, Insumo

Q_QTY = Decimal('0.0001')
Q_COST = Decimal('0.0001')       # costes de línea / totales (4 decimales)
Q_BASE = Decimal('0.00000001')   # coste por unidad base (mucha precisión)
Q_MONEY = Decimal('0.01')        # PVP
Q_PCT = Decimal('0.01')          # porcentajes


class CosteoError(ValueError):
    """Error de dominio/validación (se mapea a 400, nunca 500)."""


class CircularReferenceError(CosteoError):
    pass


def _d(v):
    return v if isinstance(v, Decimal) else Decimal(str(v))


# ── Coste de un insumo desde su formato de referencia ───────────────────────
def format_price_ex_iva(fmt):
    price = _d(fmt.price)
    return price / (Decimal('1') + _d(fmt.iva_rate)) if fmt.price_includes_iva else price


def format_content_base(fmt, insumo):
    """Contenido total del formato expresado en la unidad base del insumo,
    descomponiendo el embalaje multinivel: (∏ pack_levels) × unit_size."""
    mult = Decimal('1')
    for lv in (fmt.pack_levels or []):
        lv = _d(lv)
        if lv <= 0:
            raise CosteoError('Los niveles de embalaje deben ser mayores que 0.')
        mult *= lv
    total = mult * _d(fmt.unit_size)
    if total <= 0:
        raise CosteoError('El contenido del formato debe ser mayor que 0.')
    content = units.convert_to_base(
        total, fmt.unit_size_unit, insumo.base_unit,
        density=insumo.density_g_per_ml, weight_per_piece=insumo.weight_per_piece_g,
    )
    if content <= 0:
        raise CosteoError('El contenido en unidad base debe ser mayor que 0.')
    return content


def insumo_gross_cost_per_base(insumo):
    fmt = insumo.reference_format
    if not fmt:
        raise CosteoError(f'El insumo «{insumo.name}» no tiene formato de compra de referencia.')
    return format_price_ex_iva(fmt) / format_content_base(fmt, insumo)


# ── Unidad base derivada del formato de compra (canónica: g/ml/ud/pack) ──────
def canonical_base_for_unit(unit):
    """Unidad base canónica (g/ml/ud/pack) para la dimensión de `unit`.
    Así el insumo se mide siempre en la unidad pequeña y las cantidades del
    escandallo no caen en la trampa de escala (1000 «g» tecleados ≠ 1000 kg)."""
    return units.CANONICAL[units.dimension(unit)]


def sync_insumo_base_unit(insumo):
    """Deriva y guarda `base_unit` como la canónica de la dimensión del formato
    de referencia (o el primero). Idempotente; no toca nada si no hay formato."""
    fmt = insumo.reference_format or insumo.formats.first()
    if not fmt:
        return
    try:
        base = canonical_base_for_unit(fmt.unit_size_unit)
    except units.UnitError:
        return
    if insumo.base_unit != base:
        insumo.base_unit = base
        insumo.save(update_fields=['base_unit', 'updated_at'])


# Unidad de COMPRA legible (grande) y su factor a la base canónica, para mostrar
# el precio como "11.40 €/kg" (2 decimales) en vez de un coste por gramo ilegible.
DISPLAY_UNIT = {'g': 'kg', 'kg': 'kg', 'ml': 'l', 'l': 'l', 'ud': 'ud', 'pack': 'pack'}
DISPLAY_FACTOR = {'g': Decimal('1000'), 'kg': Decimal('1'), 'ml': Decimal('1000'),
                  'l': Decimal('1'), 'ud': Decimal('1'), 'pack': Decimal('1')}


def display_cost_per_unit(cost_per_base, base_unit):
    """(unidad_legible, coste 2 decimales) a partir de un coste por unidad base.
    Ej.: 0.0114 €/g, base g → ('kg', '11.40'). None si no hay coste."""
    if cost_per_base is None:
        return DISPLAY_UNIT.get(base_unit, base_unit), None
    unit = DISPLAY_UNIT.get(base_unit, base_unit)
    factor = DISPLAY_FACTOR.get(base_unit, Decimal('1'))
    return unit, str((_d(cost_per_base) * factor).quantize(Q_MONEY, rounding=ROUND_HALF_UP))


def _trim_decimal(d):
    """Decimal sin ceros sobrantes ni notación científica ('440.0000' → '440')."""
    return format(_d(d).normalize(), 'f')


def format_display(fmt):
    """Cómo MOSTRAR el precio de un formato, según cómo se compra:
    - Presentación (envase de N u de peso/vol, p. ej. bote de 440 g a 6,40 €):
      precio POR UNIDAD/envase + el contenido ('6,40 €/ud · 440 g'). NO se pasa a
      kg/l aunque el coste interno sí se calcule por gramo.
    - Directo (kg/g/l/ml): precio por la unidad de compra grande ('11.40 €/kg').
    Devuelve {'unit', 'cost', 'content'} (content solo en presentación)."""
    try:
        price = format_price_ex_iva(fmt)
    except (CosteoError,):
        return {'unit': None, 'cost': None, 'content': None}
    levels = fmt.pack_levels or []
    is_pres = bool(levels) or _d(fmt.unit_size) != Decimal('1')
    if is_pres:
        n_units = Decimal('1')
        for lv in levels:
            n_units *= _d(lv)
        cost = (price / n_units).quantize(Q_MONEY, rounding=ROUND_HALF_UP)
        return {'unit': 'ud', 'cost': str(cost),
                'content': f'{_trim_decimal(fmt.unit_size)} {fmt.unit_size_unit}'}
    try:
        cpb = price / format_content_base(fmt, fmt.insumo)
    except (CosteoError, units.UnitError):
        return {'unit': None, 'cost': None, 'content': None}
    unit, cost = display_cost_per_unit(cpb, fmt.insumo.base_unit)
    return {'unit': unit, 'cost': cost, 'content': None}


def insumo_net_cost_per_base(insumo, cleaning=None, cooking=None):
    gross = insumo_gross_cost_per_base(insumo)
    c = _d(cleaning) if cleaning is not None else _d(insumo.cleaning_yield)
    k = _d(cooking) if cooking is not None else _d(insumo.cooking_yield)
    if not (Decimal('0') < c <= Decimal('1')) or not (Decimal('0') < k <= Decimal('1')):
        raise CosteoError('El rendimiento (merma) debe estar en (0, 1].')
    return gross / (c * k)


# ── Cálculo de un escandallo (preview o persistido) ─────────────────────────
def _resolve(spec, restaurant):
    insumo_ids = [l['insumo_id'] for l in spec['lines'] if l.get('insumo_id')]
    sub_ids = [l['subrecipe_id'] for l in spec['lines'] if l.get('subrecipe_id')]
    insumos = {i.id: i for i in Insumo.objects.filter(
        restaurant=restaurant, id__in=insumo_ids).select_related('reference_format')}
    subs = {c.id: c for c in Costing.objects.filter(
        restaurant=restaurant, is_subrecipe=True, id__in=sub_ids).prefetch_related('lines')}
    return insumos, subs


def compute(spec, restaurant, _stack=None):
    """Calcula el desglose de un escandallo. `spec` = dict con parámetros +
    lines[{insumo_id|subrecipe_id, quantity, unit, cleaning/cooking override}].
    Resuelve insumos y subrecetas SIEMPRE contra la BD del tenant (ignora
    cualquier precio que venga en el body)."""
    _stack = _stack or []
    insumos, subs = _resolve(spec, restaurant)

    lines_out = []
    total = Decimal('0')
    missing = 0
    for l in spec['lines']:
        qty = _d(l['quantity'])
        if qty <= 0:
            raise CosteoError('La cantidad de cada línea debe ser mayor que 0.')
        unit = l['unit']
        if l.get('insumo_id'):
            insumo = insumos.get(l['insumo_id'])
            if not insumo:
                raise CosteoError('Insumo no encontrado en tu restaurante.')
            # TOLERANTE: si falta el precio de referencia o no se puede convertir la
            # unidad a la base del insumo (p. ej. masa↔volumen sin densidad), la línea
            # queda "incompleta" (no suma) en vez de romper todo el escandallo.
            try:
                qty_base = units.convert_to_base(
                    qty, unit, insumo.base_unit,
                    density=insumo.density_g_per_ml, weight_per_piece=insumo.weight_per_piece_g)
                gross = insumo_gross_cost_per_base(insumo)
                net = insumo_net_cost_per_base(insumo, l.get('cleaning_yield_override'), l.get('cooking_yield_override'))
                line_cost = qty_base * net
            except (CosteoError, units.UnitError):
                qty_base = gross = net = line_cost = None
            lines_out.append({
                'order': l.get('order', len(lines_out) + 1),
                'component_type': 'insumo', 'component_id': insumo.id, 'name': insumo.name,
                'quantity': qty, 'unit': unit, 'quantity_base': qty_base, 'base_unit': insumo.base_unit,
                'gross_cost_per_base': gross, 'net_cost_per_base': net, 'line_cost': line_cost,
                'incomplete': line_cost is None,
            })
        elif l.get('subrecipe_id'):
            sub = subs.get(l['subrecipe_id'])
            if not sub:
                raise CosteoError('Subreceta no encontrada en tu restaurante.')
            if sub.id in _stack:
                raise CircularReferenceError(f'Referencia circular con la subreceta «{sub.name}».')
            sub_res = compute(spec_from_costing(sub), restaurant, _stack + [sub.id])
            if sub.yield_quantity is None or _d(sub.yield_quantity) <= 0:
                raise CosteoError(f'La subreceta «{sub.name}» necesita un rendimiento mayor que 0.')
            yield_base, _dim = units.to_canonical(sub.yield_quantity, sub.yield_unit)
            unit_base = sub_res['_total_raw'] / yield_base
            qty_base = units.convert_to_base(qty, unit, sub.yield_unit)
            line_cost = qty_base * unit_base
            lines_out.append({
                'order': l.get('order', len(lines_out) + 1),
                'component_type': 'subrecipe', 'component_id': sub.id, 'name': sub.name,
                'quantity': qty, 'unit': unit, 'quantity_base': qty_base, 'base_unit': sub.yield_unit,
                'gross_cost_per_base': unit_base, 'net_cost_per_base': unit_base, 'line_cost': line_cost,
                'incomplete': False,
            })
        else:
            raise CosteoError('Cada línea debe referenciar un insumo o una subreceta.')
        if lines_out[-1]['line_cost'] is None:
            missing += 1
        else:
            total += lines_out[-1]['line_cost']

    servings = int(spec.get('servings') or 1)
    if servings < 1:
        raise CosteoError('Las raciones deben ser al menos 1.')
    per_serving = total / servings

    tfc = _d(spec['target_food_cost']) if spec.get('target_food_cost') is not None else Decimal('0.30')
    if not (Decimal('0') < tfc < Decimal('1')):
        raise CosteoError('El food cost objetivo debe estar en (0, 1).')
    iva = _d(spec['iva_rate']) if spec.get('iva_rate') is not None else Decimal('0.10')
    if iva < 0:
        raise CosteoError('El IVA no puede ser negativo.')

    pvp_ex = per_serving / tfc
    pvp_inc = pvp_ex * (Decimal('1') + iva)

    food_cost_pct, sale_ex, margin, margin_pct = None, None, None, None
    sale = spec.get('sale_price')
    if sale is not None and _d(sale) > 0:
        sale_ex = _d(sale) / (Decimal('1') + iva)
        food_cost_pct = per_serving / sale_ex * Decimal('100')
        margin = sale_ex - per_serving                       # ganancia por ración (sin IVA)
        margin_pct = margin / sale_ex * Decimal('100')       # % ganancia/pérdida sobre el PVP

    # Porcionado (producciones): peso por porción y coste por porción.
    portions = spec.get('portions')
    portions = int(portions) if portions else None
    cost_per_portion = _s(total / portions, Q_COST) if portions else None

    out = {
        'name': spec.get('name', ''),
        'is_subrecipe': bool(spec.get('is_subrecipe')),
        'servings': servings,
        'lines': [_present_line(x) for x in lines_out],
        'lines_missing': missing,
        'total_cost': _s(total, Q_COST),
        'cost_per_serving': _s(per_serving, Q_COST),
        'target_food_cost': str(tfc),
        'iva_rate': str(iva),
        'pvp_ex_iva': _s(pvp_ex, Q_MONEY),
        'pvp_inc_iva': _s(pvp_inc, Q_MONEY),
        'sale_price': (_s(_d(sale), Q_MONEY) if sale is not None else None),
        'sale_price_ex_iva': (_s(sale_ex, Q_MONEY) if sale_ex is not None else None),
        'food_cost_pct': (_s(food_cost_pct, Q_PCT) if food_cost_pct is not None else None),
        'margin': (_s(margin, Q_MONEY) if margin is not None else None),
        'margin_pct': (_s(margin_pct, Q_PCT) if margin_pct is not None else None),
        'portions': portions,
        'cost_per_portion': cost_per_portion,
        'weight_per_portion': None,
        'unit_cost_base': None,
        'yield_quantity': None,
        'yield_unit': None,
        '_total_raw': total,
    }
    if spec.get('is_subrecipe') and spec.get('yield_quantity') is not None:
        yq = _d(spec['yield_quantity'])
        yb, _dim = units.to_canonical(spec['yield_quantity'], spec.get('yield_unit', 'g'))
        if yb > 0:
            out['yield_quantity'] = str(yq)
            out['yield_unit'] = spec.get('yield_unit', 'g')
            out['unit_cost_base'] = _s(total / yb, Q_BASE)
            if portions:
                out['weight_per_portion'] = _s(yq / portions, Q_QTY)  # p. ej. 1900/6 = 316,66
    return out


def public(breakdown):
    """Copia del desglose sin las claves internas (p. ej. `_total_raw`), lista
    para serializar a JSON."""
    return {k: v for k, v in breakdown.items() if not k.startswith('_')}


def _s(value, q):
    return str(value.quantize(q, rounding=ROUND_HALF_UP))


def _sn(value, q):
    return None if value is None else _s(value, q)


def _present_line(x):
    return {
        'order': x['order'],
        'component_type': x['component_type'],
        'component_id': x['component_id'],
        'name': x['name'],
        'quantity': _s(x['quantity'], Q_QTY),
        'unit': x['unit'],
        'quantity_base': _sn(x['quantity_base'], Q_QTY),
        'base_unit': x['base_unit'],
        'incomplete': x.get('incomplete', False),
        'gross_cost_per_base': _sn(x['gross_cost_per_base'], Q_BASE),
        'net_cost_per_base': _sn(x['net_cost_per_base'], Q_BASE),
        'line_cost': _sn(x['line_cost'], Q_COST),
    }


def spec_from_costing(costing):
    """Construye el `spec` desde un Costing persistido (misma forma que el
    borrador del preview), para que preview y guardado usen la MISMA lógica."""
    return {
        'name': costing.name,
        'is_subrecipe': costing.is_subrecipe,
        'servings': costing.servings,
        'yield_quantity': costing.yield_quantity,
        'yield_unit': costing.yield_unit,
        'portions': costing.portions,
        'target_food_cost': costing.target_food_cost,
        'iva_rate': costing.iva_rate,
        'sale_price': costing.sale_price,
        'lines': [
            {
                'insumo_id': l.insumo_id, 'subrecipe_id': l.subrecipe_id,
                'quantity': l.quantity, 'unit': l.unit,
                'cleaning_yield_override': l.cleaning_yield_override,
                'cooking_yield_override': l.cooking_yield_override,
                'order': l.order,
            }
            for l in costing.lines.all()
        ],
    }


def compute_costing(costing, restaurant):
    """Desglose de un Costing persistido (arranca la pila con su propio id para
    detectar auto-referencias)."""
    return compute(spec_from_costing(costing), restaurant, [costing.id] if costing.id else [])


def refresh_snapshot(costing, restaurant):
    """Recalcula y guarda el coste/base cacheado de una subreceta."""
    if not costing.is_subrecipe:
        return
    try:
        res = compute(spec_from_costing(costing), restaurant, [costing.id])
        uc = res.get('unit_cost_base')
        costing.unit_cost_base_snapshot = Decimal(uc) if uc else None
    except CosteoError:
        costing.unit_cost_base_snapshot = None
    costing.save(update_fields=['unit_cost_base_snapshot', 'updated_at'])


def cascade_refresh(restaurant):
    """Recalcula los snapshots de todas las subrecetas del restaurante (tras un
    cambio de precio/referencia). Escala bien para el tamaño de una cocina."""
    for c in Costing.objects.filter(restaurant=restaurant, is_subrecipe=True).prefetch_related('lines'):
        refresh_snapshot(c, restaurant)
