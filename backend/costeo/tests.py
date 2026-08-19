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

    def test_missing_bridge_raises_clear_error(self):
        liq = make_insumo(self.r, 'Liq', 'ml')  # sin densidad
        make_format(liq, '10', [], '1000', 'ml')
        with self.assertRaises(UnitError):
            services.compute(spec([line(liq.id, quantity='100', unit='g')]), self.r)

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
        # unidad incompatible (masa sobre insumo de volumen sin densidad)
        r3 = self.client.post('/api/costeo/preview/', {'lines': [{'insumo': self.insA.id, 'quantity': '5', 'unit': 'g'}]}, format='json')
        self.assertEqual(r3.status_code, 400)


class UnitTests(APITestCase):
    def test_direct_conversions(self):
        self.assertEqual(convert_to_base('1', 'kg', 'g'), Decimal('1000'))
        self.assertEqual(convert_to_base('1', 'l', 'ml'), Decimal('1000'))
        self.assertEqual(convert_to_base('500', 'g', 'g'), Decimal('500'))

    def test_bridge_requires_data(self):
        with self.assertRaises(UnitError):
            convert_to_base('100', 'g', 'ml')  # sin densidad
