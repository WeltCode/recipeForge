"""Tests del motor de escandallo (costeo). Cubre formatos multinivel, IVA,
puentes de unidad, merma, multiproveedor, subrecetas anidadas, ciclos,
escalado, Decimal, preview sin persistencia, preview≡guardado, rechazo de
precios inyectados, aislamiento por tenant y validación (sin 500)."""
from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from accounts.models import Restaurant, Role, Membership
from . import services
from .models import Costing, CostingLine, Insumo, PurchaseFormat
from .units import UnitError, convert_to_base


def role(restaurant, key):
    return Role.objects.get(restaurant=restaurant, key=key)


def make_insumo(r, name, base_unit='g', **kw):
    return Insumo.objects.create(restaurant=r, name=name, base_unit=base_unit, **kw)


def make_format(insumo, price, pack_levels, unit_size, unit_size_unit, includes_iva=False, iva='0.10', ref=True):
    f = PurchaseFormat.objects.create(
        insumo=insumo, price=Decimal(price), pack_levels=pack_levels,
        unit_size=Decimal(unit_size), unit_size_unit=unit_size_unit,
        price_includes_iva=includes_iva, iva_rate=Decimal(iva),
    )
    if ref:
        insumo.reference_format = f
        insumo.save(update_fields=['reference_format'])
    return f


def spec(lines, **kw):
    base = {'servings': 1, 'target_food_cost': Decimal('0.30'), 'iva_rate': Decimal('0.10'), 'lines': lines}
    base.update(kw)
    return base


def line(insumo_id=None, subrecipe_id=None, quantity='0', unit='g', **kw):
    return {'insumo_id': insumo_id, 'subrecipe_id': subrecipe_id,
            'quantity': Decimal(quantity), 'unit': unit, **kw}


class ServiceTests(APITestCase):
    def setUp(self):
        self.r = Restaurant.objects.create(name='R', code_prefix='R', plan='business')

    # ── Formato de compra vs unidad de uso (núcleo) ──
    def test_bgroup_pack_6x1L(self):
        leche = make_insumo(self.r, 'Leche', 'ml')
        make_format(leche, '7', [6], '1', 'l')  # 6×1 L = 6000 ml, sin IVA
        res = services.compute(spec([line(leche.id, quantity='800', unit='ml')]), self.r)
        self.assertEqual(res['lines'][0]['gross_cost_per_base'], '0.00116667')  # 7/6000
        self.assertEqual(res['lines'][0]['line_cost'], '0.9333')                # 800 × 7/6000
        self.assertEqual(res['total_cost'], '0.9333')

    def test_multilevel_content(self):
        harina = make_insumo(self.r, 'Harina', 'g')
        f = make_format(harina, '24', [12], '500', 'g')       # caja 12×500 g
        self.assertEqual(services.format_content_base(f, harina), Decimal('6000'))
        leche = make_insumo(self.r, 'Leche caja', 'ml')
        f2 = make_format(leche, '84', [12, 6], '1', 'l')       # caja 12 × pack 6 × 1 L
        self.assertEqual(services.format_content_base(f2, leche), Decimal('72000'))

    def test_iva_normalized_to_ex_iva(self):
        ins = make_insumo(self.r, 'ConIVA', 'g')
        make_format(ins, '11', [], '1000', 'g', includes_iva=True, iva='0.10')  # ex = 10 → 0,01/g
        res = services.compute(spec([line(ins.id, quantity='100', unit='g')]), self.r)
        self.assertEqual(res['lines'][0]['gross_cost_per_base'], '0.01000000')
        self.assertEqual(res['lines'][0]['line_cost'], '1.0000')

    def test_base_unit_kilo(self):
        carne = make_insumo(self.r, 'Ternera', 'kg')  # base en kilo
        make_format(carne, '10', [], '1', 'kg')       # precio por kg → 10 €/kg
        res = services.compute(spec([line(carne.id, quantity='300', unit='g')]), self.r)
        self.assertEqual(res['lines'][0]['line_cost'], '3.0000')  # 0,3 kg × 10

    def test_whole_piece_with_merma(self):
        # Corvina entera: 1 pieza = 2000 g, precio por pieza 12 €, 60% aprovechable.
        corvina = make_insumo(self.r, 'Corvina', 'g', weight_per_piece_g='2000', cleaning_yield='0.6')
        make_format(corvina, '12', [], '1', 'ud')     # precio por unidad (pieza)
        res = services.compute(spec([line(corvina.id, quantity='300', unit='g')]), self.r)
        # bruto 12/2000 = 0,006/g → neto /0,6 = 0,01/g → 300 g × 0,01
        self.assertEqual(res['lines'][0]['net_cost_per_base'], '0.01000000')
        self.assertEqual(res['lines'][0]['line_cost'], '3.0000')

    # ── Puentes entre tipos de unidad ──
    def test_bridge_mass_volume_density(self):
        aceite = make_insumo(self.r, 'Aceite', 'ml', density_g_per_ml='0.92')
        make_format(aceite, '30', [], '5', 'l')  # 5000 ml → 0,006/ml
        res = services.compute(spec([line(aceite.id, quantity='460', unit='g')]), self.r)
        self.assertEqual(res['lines'][0]['line_cost'], '3.0000')  # 460 g/0,92 = 500 ml × 0,006

    def test_bridge_count_mass_weight(self):
        huevo = make_insumo(self.r, 'Huevo', 'ud', weight_per_piece_g='60')
        make_format(huevo, '2.40', [12], '1', 'ud')  # 12 ud → 0,20/ud
        res = services.compute(spec([line(huevo.id, quantity='180', unit='g')]), self.r)
        self.assertEqual(res['lines'][0]['line_cost'], '0.6000')  # 180 g/60 = 3 ud × 0,20

    def test_missing_bridge_marks_line_incomplete(self):
        # Masa sobre insumo en volumen sin densidad: NO se puede convertir, pero
        # la línea queda incompleta (no suma) en vez de romper todo el escandallo.
        liq = make_insumo(self.r, 'Liq', 'ml')  # sin densidad
        make_format(liq, '10', [], '1000', 'ml')
        ok = make_insumo(self.r, 'Solido', 'g')
        make_format(ok, '10', [], '1000', 'g')  # 0,01/g
        res = services.compute(spec([
            line(liq.id, quantity='100', unit='g'),   # incompatible → incompleta
            line(ok.id, quantity='100', unit='g'),    # 1,00 → sí suma
        ]), self.r)
        self.assertTrue(res['lines'][0]['incomplete'])
        self.assertIsNone(res['lines'][0]['line_cost'])
        self.assertIsNone(res['lines'][0]['quantity_base'])
        self.assertEqual(res['lines_missing'], 1)
        self.assertEqual(res['lines'][1]['line_cost'], '1.0000')
        self.assertEqual(res['total_cost'], '1.0000')  # solo la línea válida

    # ── Merma ──
    def test_merma_cleaning_only(self):
        ins = make_insumo(self.r, 'Gamba', 'g', cleaning_yield='0.8')
        make_format(ins, '10', [], '1000', 'g')  # bruto 0,01 → neto 0,0125
        res = services.compute(spec([line(ins.id, quantity='100', unit='g')]), self.r)
        self.assertEqual(res['lines'][0]['net_cost_per_base'], '0.01250000')
        self.assertEqual(res['lines'][0]['line_cost'], '1.2500')

    def test_merma_cleaning_and_cooking_order(self):
        ins = make_insumo(self.r, 'Carne', 'g', cleaning_yield='0.8', cooking_yield='0.9')
        make_format(ins, '10', [], '1000', 'g')  # rend total 0,72 → neto 0,01/0,72
        res = services.compute(spec([line(ins.id, quantity='100', unit='g')]), self.r)
        self.assertEqual(res['lines'][0]['line_cost'], '1.3889')  # 100 × 0,01/0,72

    def test_line_merma_override(self):
        ins = make_insumo(self.r, 'Merluza', 'g', cleaning_yield='1')
        make_format(ins, '10', [], '1000', 'g')
        res = services.compute(spec([line(ins.id, quantity='100', unit='g', cleaning_yield_override=Decimal('0.5'))]), self.r)
        self.assertEqual(res['lines'][0]['line_cost'], '2.0000')  # neto 0,01/0,5 = 0,02

    # ── Multiproveedor + referencia ──
    def test_multi_supplier_reference_changes_cost(self):
        ins = make_insumo(self.r, 'Tomate', 'g')
        make_format(ins, '10', [], '1000', 'g', ref=True)    # 0,01
        fB = make_format(ins, '20', [], '1000', 'g', ref=False)  # 0,02
        r1 = services.compute(spec([line(ins.id, quantity='100', unit='g')]), self.r)
        self.assertEqual(r1['total_cost'], '1.0000')
        ins.reference_format = fB
        ins.save(update_fields=['reference_format'])
        r2 = services.compute(spec([line(ins.id, quantity='100', unit='g')]), self.r)
        self.assertEqual(r2['total_cost'], '2.0000')

    # ── Subrecetas anidadas ──
    def test_nested_subrecipes(self):
        base = make_insumo(self.r, 'Pescado', 'g')
        make_format(base, '20', [], '1000', 'g')  # 0,02/g
        s1 = Costing.objects.create(restaurant=self.r, name='Base', is_subrecipe=True, yield_quantity='1000', yield_unit='g')
        CostingLine.objects.create(costing=s1, insumo=base, quantity='500', unit='g', order=1)  # total 10 → 0,01/g
        s2 = Costing.objects.create(restaurant=self.r, name='Mid', is_subrecipe=True, yield_quantity='500', yield_unit='g')
        CostingLine.objects.create(costing=s2, subrecipe=s1, quantity='250', unit='g', order=1)  # 2,5 → 0,005/g
        dish = Costing.objects.create(restaurant=self.r, name='Plato', servings=1)
        CostingLine.objects.create(costing=dish, subrecipe=s2, quantity='200', unit='g', order=1)  # 1,00
        res = services.compute_costing(dish, self.r)
        self.assertEqual(res['total_cost'], '1.0000')

    def test_circular_reference_detected(self):
        a = Costing.objects.create(restaurant=self.r, name='A', is_subrecipe=True, yield_quantity='100', yield_unit='g')
        b = Costing.objects.create(restaurant=self.r, name='B', is_subrecipe=True, yield_quantity='100', yield_unit='g')
        CostingLine.objects.create(costing=a, subrecipe=b, quantity='10', unit='g')
        CostingLine.objects.create(costing=b, subrecipe=a, quantity='10', unit='g')
        with self.assertRaises(services.CircularReferenceError):
            services.compute_costing(a, self.r)

    # ── Escalado ──
    def test_serving_scaling(self):
        ins = make_insumo(self.r, 'Z', 'g')
        make_format(ins, '10', [], '1000', 'g')  # 0,01
        c = Costing.objects.create(restaurant=self.r, name='P', servings=4)
        CostingLine.objects.create(costing=c, insumo=ins, quantity='400', unit='g')  # total 4,00
        res = services.compute_costing(c, self.r)
        self.assertEqual(res['total_cost'], '4.0000')
        self.assertEqual(res['cost_per_serving'], '1.0000')  # 4 / 4

    # ── Decimal, no float ──
    def test_decimal_precision_not_float(self):
        leche = make_insumo(self.r, 'Leche2', 'ml')
        make_format(leche, '7', [6], '1', 'l')
        res = services.compute(spec([line(leche.id, quantity='800', unit='ml')]), self.r)
        # 7/6000 exacto = 0,001166666… → 8 decimales HALF_UP
        self.assertEqual(res['lines'][0]['gross_cost_per_base'], '0.00116667')
        self.assertIsInstance(res['total_cost'], str)

    # ── Precio tolerante: insumo sin formato → línea incompleta, no rompe ──
    def test_incomplete_line_without_price(self):
        ins = make_insumo(self.r, 'SinPrecio', 'g')  # sin formato de referencia
        res = services.compute(spec([line(ins.id, quantity='100', unit='g')]), self.r)
        self.assertEqual(res['lines_missing'], 1)
        self.assertTrue(res['lines'][0]['incomplete'])
        self.assertIsNone(res['lines'][0]['line_cost'])
        self.assertEqual(res['total_cost'], '0.0000')  # no suma, no lanza

    # ── Unidad base derivada del formato (canónica) + display 2 decimales ──
    def test_base_unit_derived_canonical_and_display(self):
        # Se compra por kg (11.40 €/kg) pero la base se deriva a g (canónica).
        ajo = make_insumo(self.r, 'Ajo', 'kg')  # base inicial cualquiera
        f = make_format(ajo, '11.40', [], '1', 'kg')
        services.sync_insumo_base_unit(ajo)
        ajo.refresh_from_db()
        self.assertEqual(ajo.base_unit, 'g')                       # derivada a canónica
        cpb = services.insumo_gross_cost_per_base(ajo)
        self.assertEqual(str(cpb), '0.0114')                       # €/g interno
        unit, disp = services.display_cost_per_unit(cpb, ajo.base_unit)
        self.assertEqual((unit, disp), ('kg', '11.40'))            # display legible
        # 1000 g (lo que el usuario teclea) = 1 kg = 11,40 €, NO 11400.
        res = services.compute(spec([line(ajo.id, quantity='1000', unit='g')]), self.r)
        self.assertEqual(res['lines'][0]['line_cost'], '11.4000')

    def test_presentation_unit_5l_for_36(self):
        # 1 unidad/presentación = 5 L a 36 € → 7,20 €/L; usar 5900 ml → 42,48 €.
        soja = make_insumo(self.r, 'Salsa de Soja', 'ml')
        make_format(soja, '36', [], '5', 'l')  # contenido 5 L = 5000 ml
        services.sync_insumo_base_unit(soja); soja.refresh_from_db()
        self.assertEqual(soja.base_unit, 'ml')
        cpb = services.insumo_gross_cost_per_base(soja)
        self.assertEqual(str(cpb), '0.0072')                       # 36/5000 €/ml
        self.assertEqual(services.display_cost_per_unit(cpb, 'ml'), ('l', '7.20'))
        res = services.compute(spec([line(soja.id, quantity='5900', unit='ml')]), self.r)
        self.assertEqual(res['lines'][0]['line_cost'], '42.4800')  # 5900 × 36/5000

    def test_format_display_direct_vs_presentation(self):
        # Directo (precio por kg) → "11.40 €/kg".
        ajo = make_insumo(self.r, 'Ajo', 'g'); fa = make_format(ajo, '11.40', [], '1', 'kg')
        services.sync_insumo_base_unit(ajo)
        self.assertEqual(services.format_display(fa), {'unit': 'kg', 'cost': '11.40', 'content': None})
        # Presentación (bote de 440 g a 6,40 €) → "6.40 €/ud · 440 g" (NO por kg).
        com = make_insumo(self.r, 'Comino', 'g'); fc = make_format(com, '6.40', [], '440', 'g')
        services.sync_insumo_base_unit(com)
        self.assertEqual(services.format_display(fc), {'unit': 'ud', 'cost': '6.40', 'content': '440 g'})
        # Presentación de 5 L a 36 € → "36.00 €/ud · 5 l" (el coste interno sigue en €/ml).
        soja = make_insumo(self.r, 'Soja', 'ml'); fs = make_format(soja, '36', [], '5', 'l')
        services.sync_insumo_base_unit(soja)
        self.assertEqual(services.format_display(fs), {'unit': 'ud', 'cost': '36.00', 'content': '5 l'})
        # Pero el cálculo de receta sigue correcto: 5900 ml → 42,48 €.
        res = services.compute(spec([line(soja.id, quantity='5900', unit='ml')]), self.r)
        self.assertEqual(res['lines'][0]['line_cost'], '42.4800')

    def test_base_unit_volume_and_count(self):
        agua = make_insumo(self.r, 'Agua', 'kg')
        make_format(agua, '2', [], '1', 'l'); services.sync_insumo_base_unit(agua)
        agua.refresh_from_db(); self.assertEqual(agua.base_unit, 'ml')
        huevo = make_insumo(self.r, 'Huevo', 'g')
        make_format(huevo, '3', [], '30', 'ud'); services.sync_insumo_base_unit(huevo)
        huevo.refresh_from_db(); self.assertEqual(huevo.base_unit, 'ud')

    # ── Porcionado de una producción ──
    def test_portions_weight_and_cost(self):
        ins = make_insumo(self.r, 'Masa', 'g')
        make_format(ins, '19', [], '1000', 'g')  # 0,019/g
        c = Costing.objects.create(restaurant=self.r, name='Soja Ostion', is_subrecipe=True,
                                   yield_quantity='1900', yield_unit='g', portions=6)
        CostingLine.objects.create(costing=c, insumo=ins, quantity='1000', unit='g', order=1)  # total 19
        res = services.compute_costing(c, self.r)
        self.assertEqual(res['total_cost'], '19.0000')
        self.assertEqual(res['weight_per_portion'], '316.6667')  # 1900/6
        self.assertEqual(res['cost_per_portion'], '3.1667')      # 19/6

    # ── Margen de un plato de venta ──
    def test_margin_for_sale_dish(self):
        ins = make_insumo(self.r, 'Prot', 'g')
        make_format(ins, '30', [], '1000', 'g')  # 0,03/g
        res = services.compute(spec([line(ins.id, quantity='100', unit='g')], sale_price=Decimal('11'), iva_rate=Decimal('0.10')), self.r)
        # coste 3,00; venta sin IVA 10; margen 7,00; margen% 70
        self.assertEqual(res['margin'], '7.00')
        self.assertEqual(res['margin_pct'], '70.00')

    # ── Food cost / PVP ──
    def test_food_cost_and_pvp(self):
        ins = make_insumo(self.r, 'FC', 'g')
        make_format(ins, '30', [], '1000', 'g')  # 0,03/g
        res = services.compute(spec([line(ins.id, quantity='100', unit='g')], target_food_cost=Decimal('0.30'), iva_rate=Decimal('0.10'), sale_price=Decimal('11')), self.r)
        self.assertEqual(res['cost_per_serving'], '3.0000')       # 100 × 0,03
        self.assertEqual(res['pvp_ex_iva'], '10.00')             # 3 / 0,30
        self.assertEqual(res['pvp_inc_iva'], '11.00')            # × 1,10
        self.assertEqual(res['food_cost_pct'], '30.00')          # 3 / (11/1,10)


class ApiTests(APITestCase):
    def setUp(self):
        self.rA = Restaurant.objects.create(name='A', code_prefix='A', plan='business')
        self.rB = Restaurant.objects.create(name='B', code_prefix='B', plan='business')

        def member(username, r, key):
            u = User.objects.create_user(username, password='pw12345!')
            Membership.objects.create(user=u, restaurant=r, role=role(r, key))
            return u

        self.ownerA = member('ownerA', self.rA, 'owner')
        self.editorA = member('editorA', self.rA, 'editor')  # sin can_view_escandallo
        self.ownerB = member('ownerB', self.rB, 'owner')

        self.insA = make_insumo(self.rA, 'Leche', 'ml')
        make_format(self.insA, '7', [6], '1', 'l')

    def test_edit_format_updates_price_and_rederives_base(self):
        # Editar el formato (precio/presentación) sin borrar y recrear: PATCH.
        ins = make_insumo(self.rA, 'Salsa X', 'ml')
        f = make_format(ins, '25', [], '5', 'l')   # 25 €/5 L = 5 €/L
        services.sync_insumo_base_unit(ins); ins.refresh_from_db()
        self.assertEqual(ins.base_unit, 'ml')
        self.client.force_authenticate(self.ownerA)
        # Sube el precio a 30 (→ 6 €/L) y confirma el nuevo coste.
        r = self.client.patch(f'/api/costeo/formatos/{f.id}/', {'price': '30'}, format='json')
        self.assertEqual(r.status_code, 200)
        f.refresh_from_db(); ins.refresh_from_db()
        self.assertEqual(str(f.price), '30.0000')
        self.assertEqual(services.display_cost_per_unit(services.insumo_gross_cost_per_base(ins), ins.base_unit), ('l', '6.00'))
        # Cambia la presentación a kg → la base se re-deriva a g (canónica de masa).
        r2 = self.client.patch(f'/api/costeo/formatos/{f.id}/', {'unit_size_unit': 'kg'}, format='json')
        self.assertEqual(r2.status_code, 200)
        ins.refresh_from_db()
        self.assertEqual(ins.base_unit, 'g')

    def test_preview_no_persistence(self):
        self.client.force_authenticate(self.ownerA)
        before = Costing.objects.count()
        resp = self.client.post('/api/costeo/preview/', {
            'servings': 1, 'target_food_cost': '0.30',
            'lines': [{'insumo': self.insA.id, 'quantity': '800', 'unit': 'ml'}],
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['total_cost'], '0.9333')
        self.assertEqual(Costing.objects.count(), before)
        self.assertEqual(CostingLine.objects.count(), 0)

    def test_preview_equals_saved(self):
        self.client.force_authenticate(self.ownerA)
        body = {
            'name': 'P', 'servings': 1, 'target_food_cost': '0.30', 'iva_rate': '0.10',
            'lines': [{'insumo': self.insA.id, 'quantity': '800', 'unit': 'ml', 'order': 1}],
        }
        created = self.client.post('/api/costeo/escandallos/', body, format='json')
        self.assertEqual(created.status_code, 201)
        saved = self.client.get(f'/api/costeo/escandallos/{created.json()["id"]}/').json()['breakdown']
        prev = self.client.post('/api/costeo/preview/', body, format='json').json()
        self.assertEqual(prev, saved)

    def test_preview_ignores_injected_prices(self):
        self.client.force_authenticate(self.ownerA)
        resp = self.client.post('/api/costeo/preview/', {
            'servings': 1, 'target_food_cost': '0.30',
            # Precios/costes inyectados que DEBEN ignorarse:
            'lines': [{'insumo': self.insA.id, 'quantity': '800', 'unit': 'ml',
                       'gross_cost_per_base': '999', 'line_cost': '999', 'price': '999'}],
        }, format='json')
        self.assertEqual(resp.json()['total_cost'], '0.9333')  # usa el precio del servidor

    def test_register_price_cascade(self):
        self.client.force_authenticate(self.ownerA)
        s1 = Costing.objects.create(restaurant=self.rA, name='Base', is_subrecipe=True, yield_quantity='6000', yield_unit='ml')
        CostingLine.objects.create(costing=s1, insumo=self.insA, quantity='6000', unit='ml', order=1)
        services.refresh_snapshot(s1, self.rA)
        before = s1.unit_cost_base_snapshot  # 7/6000 = 0,00116667
        fmt = self.insA.formats.first()
        resp = self.client.post(f'/api/costeo/formatos/{fmt.id}/register_price/', {'price': '14'}, format='json')
        self.assertEqual(resp.status_code, 200)
        fmt.refresh_from_db()
        self.assertEqual(fmt.price, Decimal('14.0000'))
        s1.refresh_from_db()
        self.assertNotEqual(s1.unit_cost_base_snapshot, before)  # recálculo en cascada
        # y el cálculo on-demand refleja el precio nuevo (doble)
        res = services.compute_costing(s1, self.rA)
        self.assertEqual(res['total_cost'], '14.0000')

    def test_tenant_isolation_preview(self):
        self.client.force_authenticate(self.ownerB)  # de otro restaurante
        resp = self.client.post('/api/costeo/preview/', {
            'servings': 1, 'lines': [{'insumo': self.insA.id, 'quantity': '100', 'unit': 'ml'}],
        }, format='json')
        self.assertEqual(resp.status_code, 400)  # no puede usar insumos de A

    def test_tenant_isolation_list(self):
        self.client.force_authenticate(self.ownerB)
        ids = [i['id'] for i in self.client.get('/api/costeo/insumos/').json()]
        self.assertNotIn(self.insA.id, ids)

    def test_permission_editor_forbidden(self):
        self.client.force_authenticate(self.editorA)  # sin can_view_escandallo
        self.assertEqual(self.client.get('/api/costeo/escandallos/').status_code, 403)
        self.assertEqual(self.client.post('/api/costeo/preview/', {'lines': []}, format='json').status_code, 403)

    def test_invalid_payload_returns_400(self):
        self.client.force_authenticate(self.ownerA)
        # cantidad negativa
        r1 = self.client.post('/api/costeo/preview/', {'lines': [{'insumo': self.insA.id, 'quantity': '-5', 'unit': 'ml'}]}, format='json')
        self.assertEqual(r1.status_code, 400)
        # food cost fuera de rango
        r2 = self.client.post('/api/costeo/preview/', {'target_food_cost': '1.5', 'lines': [{'insumo': self.insA.id, 'quantity': '5', 'unit': 'ml'}]}, format='json')
        self.assertEqual(r2.status_code, 400)
        # unidad incompatible (masa sobre insumo de volumen sin densidad): NO es
        # un 400; el preview responde 200 con la línea marcada como incompleta.
        r3 = self.client.post('/api/costeo/preview/', {'lines': [{'insumo': self.insA.id, 'quantity': '5', 'unit': 'g'}]}, format='json')
        self.assertEqual(r3.status_code, 200)
        self.assertTrue(r3.data['lines'][0]['incomplete'])
        self.assertEqual(r3.data['lines_missing'], 1)


class UnitTests(APITestCase):
    def test_direct_conversions(self):
        self.assertEqual(convert_to_base('1', 'kg', 'g'), Decimal('1000'))
        self.assertEqual(convert_to_base('1', 'l', 'ml'), Decimal('1000'))
        self.assertEqual(convert_to_base('500', 'g', 'g'), Decimal('500'))

    def test_bridge_requires_data(self):
        with self.assertRaises(UnitError):
            convert_to_base('100', 'g', 'ml')  # sin densidad
