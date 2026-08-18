"""Tests de catálogo/inventario/escandallo: aislamiento, gating por plan y
ocultación de costes (lo sensible de las funciones Business)."""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from accounts.models import Restaurant, Role, Membership
from catalog.models import Product, Supplier
from recipes.models import Recipe, IngredientLine

PRODUCTS = '/api/products/'
SUPPLIERS = '/api/suppliers/'


def role(restaurant, key):
    return Role.objects.get(restaurant=restaurant, key=key)


class CatalogTests(APITestCase):
    def setUp(self):
        self.rA = Restaurant.objects.create(name='Rest A', code_prefix='A', plan='business')
        self.rB = Restaurant.objects.create(name='Rest B', code_prefix='B', plan='business')
        self.basic = Restaurant.objects.create(name='Rest C', code_prefix='C', plan='basico')

        def member(username, restaurant, key):
            u = User.objects.create_user(username, password='pw12345!')
            Membership.objects.create(user=u, restaurant=restaurant, role=role(restaurant, key))
            return u

        self.ownerA = member('ownerA', self.rA, 'owner')
        self.editorA = member('editorA', self.rA, 'editor')  # sin can_view_escandallo
        self.ownerB = member('ownerB', self.rB, 'owner')
        self.ownerC = member('ownerC', self.basic, 'owner')  # plan básico

        self.prodA = Product.objects.create(
            restaurant=self.rA, name='Harina', base_unit='kg', pack_size=25, pack_price=20,
        )
        self.prodB = Product.objects.create(
            restaurant=self.rB, name='Sal', base_unit='kg', pack_size=1, pack_price=1,
        )

    # ── Aislamiento por restaurante ──
    def test_list_only_own_products(self):
        self.client.force_authenticate(self.ownerA)
        ids = [p['id'] for p in self.client.get(PRODUCTS).json()]
        self.assertIn(self.prodA.id, ids)
        self.assertNotIn(self.prodB.id, ids)

    def test_cross_tenant_product_404(self):
        self.client.force_authenticate(self.ownerA)
        self.assertEqual(self.client.get(f'{PRODUCTS}{self.prodB.id}/').status_code, 404)

    def test_create_sets_own_restaurant(self):
        self.client.force_authenticate(self.ownerA)
        resp = self.client.post(PRODUCTS, {'name': 'Aceite', 'base_unit': 'l', 'pack_size': '5', 'pack_price': '30'}, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(Product.objects.get(name='Aceite').restaurant, self.rA)

    # ── Gating por plan ──
    def test_basic_plan_blocked(self):
        self.client.force_authenticate(self.ownerC)
        self.assertEqual(self.client.get(PRODUCTS).status_code, 403)
        self.assertEqual(self.client.get(SUPPLIERS).status_code, 403)

    # ── Ocultación de costes (seguridad, no solo CSS) ──
    def test_cost_hidden_for_editor(self):
        self.client.force_authenticate(self.editorA)
        row = self.client.get(f'{PRODUCTS}{self.prodA.id}/').json()
        self.assertNotIn('pack_price', row)
        self.assertIsNone(row.get('unit_cost'))

    def test_cost_visible_for_owner(self):
        self.client.force_authenticate(self.ownerA)
        row = self.client.get(f'{PRODUCTS}{self.prodA.id}/').json()
        self.assertIn('pack_price', row)
        self.assertEqual(row['unit_cost'], '0.8000')

    # ── Proveedor: datos ampliados + productos con precio ──
    def test_supplier_products_and_fields(self):
        self.prodA.supplier = None
        self.prodA.save()
        sup = Supplier.objects.create(restaurant=self.rA, name='DistMar', tax_id='B-1', payment_terms='30 días')
        Product.objects.create(restaurant=self.rA, name='Gambas', supplier=sup, base_unit='kg', pack_size=2, pack_price=30)
        self.client.force_authenticate(self.ownerA)
        row = [s for s in self.client.get(SUPPLIERS).json() if s['id'] == sup.id][0]
        self.assertEqual(row['tax_id'], 'B-1')
        self.assertEqual(row['payment_terms'], '30 días')
        self.assertEqual(row['product_count'], 1)
        self.assertEqual(row['products'][0]['name'], 'Gambas')
        self.assertEqual(row['products'][0]['unit_cost'], '15.0000')  # 30/2

    def test_supplier_products_price_hidden_for_editor(self):
        sup = Supplier.objects.create(restaurant=self.rA, name='DistMar2')
        Product.objects.create(restaurant=self.rA, name='X', supplier=sup, base_unit='kg', pack_size=2, pack_price=30)
        self.client.force_authenticate(self.editorA)
        row = [s for s in self.client.get(SUPPLIERS).json() if s['id'] == sup.id][0]
        self.assertNotIn('unit_cost', row['products'][0])

    # ── Ajuste de stock ──
    def test_stock_in_out(self):
        self.client.force_authenticate(self.ownerA)
        self.client.post(f'{PRODUCTS}{self.prodA.id}/stock/', {'kind': 'in', 'quantity': '10'}, format='json')
        self.client.post(f'{PRODUCTS}{self.prodA.id}/stock/', {'kind': 'out', 'quantity': '3'}, format='json')
        self.prodA.refresh_from_db()
        self.assertEqual(str(self.prodA.stock_qty), '7.000')


class EscandalloTests(APITestCase):
    ESCANDALLOS = '/api/escandallos/'

    def setUp(self):
        self.rA = Restaurant.objects.create(name='Rest A', code_prefix='A', plan='business')

        def member(username, key):
            u = User.objects.create_user(username, password='pw12345!')
            Membership.objects.create(user=u, restaurant=self.rA, role=role(self.rA, key))
            return u

        self.owner = member('owner', 'owner')
        self.editor = member('editor', 'editor')  # sin can_view_escandallo

        self.prod = Product.objects.create(
            restaurant=self.rA, name='Harina', base_unit='kg', pack_size=25, pack_price=20,
        )

    def _create_escandallo(self):
        return self.client.post(self.ESCANDALLOS, {
            'name': 'Pan', 'servings': 4, 'sale_price': '2.50',
            'lines': [
                {'ingredient_name': 'Harina', 'product': self.prod.id, 'quantity': '1', 'unit': 'kg', 'order': 1},
                {'ingredient_name': 'Sal', 'quantity': '10', 'unit': 'g', 'order': 2},
            ],
        }, format='json')

    def test_escandallo_summary(self):
        self.client.force_authenticate(self.owner)
        resp = self._create_escandallo()
        self.assertEqual(resp.status_code, 201)
        s = resp.json()['summary']
        self.assertEqual(s['total_cost'], '0.80')        # 1kg * 0.80
        self.assertEqual(s['cost_per_serving'], '0.20')  # /4
        self.assertEqual(s['food_cost_pct'], '8.00')     # 0.20/2.50
        self.assertEqual(s['lines_missing'], 1)          # la sal no tiene producto

    def test_escandallo_forbidden_for_editor(self):
        self.client.force_authenticate(self.editor)
        self.assertEqual(self.client.get(self.ESCANDALLOS).status_code, 403)

    def test_create_recipe_from_escandallo(self):
        self.client.force_authenticate(self.owner)
        eid = self._create_escandallo().json()['id']
        resp = self.client.post(f'{self.ESCANDALLOS}{eid}/create_recipe/')
        self.assertEqual(resp.status_code, 201)
        rid = resp.json()['recipe_id']
        recipe = Recipe.objects.get(id=rid)
        self.assertEqual(recipe.restaurant, self.rA)
        self.assertEqual(recipe.ingredients.count(), 2)
        # el escandallo queda enlazado a la receta
        self.assertEqual(self.client.get(f'{self.ESCANDALLOS}{eid}/').json()['recipe'], rid)

    def test_recipe_allergens_recipe_level(self):
        self.client.force_authenticate(self.owner)
        recipe = Recipe.objects.create(restaurant=self.rA, code='A-001', name='Pan', allergens=['gluten', 'huevos'])
        data = self.client.get(f'/api/recipes/{recipe.id}/').json()
        self.assertEqual(data['allergen_summary'], ['gluten', 'huevos'])
        self.assertEqual(data['allergens'], ['gluten', 'huevos'])
