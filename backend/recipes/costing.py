from decimal import Decimal


def _q2(v):
    return v.quantize(Decimal('0.01'))


def cost_lines(lines):
    """Calcula el coste de una lista de líneas.

    `lines`: iterable de dicts con `product` (instancia Product o None),
    `quantity`, `unit` y opcionalmente `name`. Devuelve (detalle, total, faltan)
    donde `faltan` = nº de líneas sin producto/coste calculable.
    """
    detail = []
    total = Decimal('0')
    missing = 0
    for ln in lines:
        product = ln.get('product')
        qty = ln.get('quantity')
        unit = ln.get('unit')
        cost = product.line_cost(qty, unit) if product else None
        if cost is None:
            missing += 1
        else:
            total += cost
        detail.append({
            'name': ln.get('name', ''),
            'quantity': str(qty) if qty is not None else None,
            'unit': unit,
            'product': product.id if product else None,
            'product_name': product.name if product else None,
            'cost': str(cost) if cost is not None else None,
        })
    return detail, _q2(total), missing


def costing_summary(lines, servings=1, sale_price=None):
    """Resumen de escandallo: coste total, coste/ración, food cost % y margen.

    `sale_price` es el PVP por ración; si se aporta, calcula food cost y margen.
    """
    detail, total, missing = cost_lines(lines)
    servings = servings or 1
    per_serving = _q2(total / Decimal(servings)) if servings else total

    result = {
        'lines': detail,
        'lines_missing': missing,
        'total_cost': str(total),
        'servings': servings,
        'cost_per_serving': str(per_serving),
        'sale_price': str(sale_price) if sale_price is not None else None,
        'food_cost_pct': None,
        'margin': None,
        'margin_pct': None,
    }
    if sale_price:
        sale_price = Decimal(str(sale_price))
        if sale_price > 0:
            result['food_cost_pct'] = str(_q2(per_serving / sale_price * 100))
            margin = _q2(sale_price - per_serving)
            result['margin'] = str(margin)
            result['margin_pct'] = str(_q2(margin / sale_price * 100))
    return result


def recipe_lines(recipe):
    """Convierte las líneas de una receta al formato de cost_lines."""
    return [
        {
            'name': ln.ingredient_name,
            'product': ln.product if ln.product_id else None,
            'quantity': ln.quantity,
            'unit': ln.unit,
        }
        for ln in recipe.ingredients.all()
    ]
