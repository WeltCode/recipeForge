"""Tests de aislamiento multi-tenant y permisos por rol (el seguro anti-fugas)."""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from accounts.models import Restaurant, Role, Membership
from recipes.models import Recipe

RECIPES = '/api/recipes/'


def role(restaurant, key):
    return Role.objects.get(restaurant=restaurant, key=key)


def full_recipe_payload(**over):
    data = dict(
        code='X-999', name='Nueva', category='Test', description='',
        servings=1, yield_quantity='1', yield_unit='g',
        prep_time_value='0', prep_time_unit='min',
        cook_time_value='0', cook_time_unit='min',
        shelf_life_value='1', shelf_life_unit='dias', observations='',
    )
    data.update(over)
    return data


class TenantRoleTests(APITestCase):
    def setUp(self):
        self.rA = Restaurant.objects.create(name='Rest A', code_prefix='A')  # signal crea roles
        self.rB = Restaurant.objects.create(name='Rest B', code_prefix='B')

        def member(username, restaurant, key):
            u = User.objects.create_user(username, password='pw12345!')
            Membership.objects.create(user=u, restaurant=restaurant, role=role(restaurant, key))
            return u

        self.ownerA = member('ownerA', self.rA, 'owner')
        self.editorA = member('editorA', self.rA, 'editor')
        self.viewerA = member('viewerA', self.rA, 'viewer')
        self.ownerB = member('ownerB', self.rB, 'owner')

        self.recA = Recipe.objects.create(restaurant=self.rA, code='A-001', name='Plato A')
        self.recB = Recipe.objects.create(restaurant=self.rB, code='B-001', name='Plato B')

    # ── Aislamiento ──
    def test_cross_tenant_get_returns_404_not_403(self):
        self.client.force_authenticate(self.ownerA)
        resp = self.client.get(f'{RECIPES}{self.recB.id}/')
        self.assertEqual(resp.status_code, 404)

    def test_list_only_own_restaurant(self):
        self.client.force_authenticate(self.ownerA)
        ids = [r['id'] for r in self.client.get(RECIPES).json()]
        self.assertIn(self.recA.id, ids)
        self.assertNotIn(self.recB.id, ids)

    def test_cross_tenant_patch_404(self):
        self.client.force_authenticate(self.ownerA)
        resp = self.client.patch(f'{RECIPES}{self.recB.id}/', {'name': 'hack'}, format='json')
        self.assertEqual(resp.status_code, 404)

    # ── Permisos por rol ──
    def test_viewer_cannot_edit(self):
        self.client.force_authenticate(self.viewerA)
        resp = self.client.patch(f'{RECIPES}{self.recA.id}/', {'name': 'x'}, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_viewer_cannot_create(self):
        self.client.force_authenticate(self.viewerA)
        resp = self.client.post(RECIPES, full_recipe_payload(code='A-100'), format='json')
        self.assertEqual(resp.status_code, 403)

    def test_editor_can_edit_but_not_create_or_delete(self):
        self.client.force_authenticate(self.editorA)
        self.assertEqual(
            self.client.patch(f'{RECIPES}{self.recA.id}/', {'name': 'Editado'}, format='json').status_code, 200)
        self.assertEqual(
            self.client.post(RECIPES, full_recipe_payload(code='A-101'), format='json').status_code, 403)
        self.assertEqual(
            self.client.delete(f'{RECIPES}{self.recA.id}/').status_code, 403)

    def test_owner_can_create_and_delete(self):
        self.client.force_authenticate(self.ownerA)
        resp = self.client.post(RECIPES, full_recipe_payload(code='A-200'), format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        rid = resp.json()['id']
        self.assertEqual(self.client.delete(f'{RECIPES}{rid}/').status_code, 204)

    # ── Defensa: nunca aceptar restaurant del cliente ──
    def test_client_cannot_inject_restaurant(self):
        self.client.force_authenticate(self.ownerA)
        resp = self.client.post(
            RECIPES, full_recipe_payload(code='A-300', restaurant=self.rB.id), format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        created = Recipe.objects.get(code='A-300')
        self.assertEqual(created.restaurant_id, self.rA.id)  # el suyo, NO el inyectado

    # ── Límites por plan ──
    def test_trial_recipe_cap(self):
        self.rA.plan = 'prueba'
        self.rA.save()
        for i in range(4):  # recA(1) + 4 = 5 (tope de prueba)
            Recipe.objects.create(restaurant=self.rA, code=f'A-T{i}', name='x')
        self.client.force_authenticate(self.ownerA)
        resp = self.client.post(RECIPES, full_recipe_payload(code='A-T9'), format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('plan', resp.json())

    def test_basico_recetas_ilimitadas(self):
        # Básico (Cocinero) pasó a recetas ILIMITADAS (plan individual del cocinero):
        # crear más de 10 en el mes ya NO bloquea.
        self.rA.plan = 'basico'
        self.rA.save()
        for i in range(12):
            Recipe.objects.create(restaurant=self.rA, code=f'A-M{i}', name='x')
        self.client.force_authenticate(self.ownerA)
        resp = self.client.post(RECIPES, full_recipe_payload(code='A-M99'), format='json')
        self.assertEqual(resp.status_code, 201)

    def test_trial_expired_blocks_create(self):
        from datetime import timedelta
        from django.utils import timezone
        self.rA.plan = 'prueba'
        self.rA.trial_ends_at = timezone.now() - timedelta(days=1)
        self.rA.save()
        self.client.force_authenticate(self.ownerA)
        resp = self.client.post(RECIPES, full_recipe_payload(code='A-EXP'), format='json')
        self.assertEqual(resp.status_code, 400)

    def test_trial_pdf_cap(self):
        self.rA.plan = 'prueba'
        self.rA.save()
        self.client.force_authenticate(self.ownerA)
        url = RECIPES + 'register_pdf/'
        for _ in range(5):
            r = self.client.post(url)
            self.assertEqual(r.status_code, 200, r.content)
            self.assertTrue(r.json()['allowed'])
        r6 = self.client.post(url)
        self.assertEqual(r6.status_code, 403)
        self.assertFalse(r6.json()['allowed'])


from recipes.models import Especial


class CartaEspecialesTests(APITestCase):
    """Fase 2: carta pública + especiales. Plan (Premium/Business) + rol
    (owner/chef), aislamiento por restaurante, y públicas sin costes."""

    def setUp(self):
        self.rA = Restaurant.objects.create(name='Rest A', code_prefix='A', plan='business', carta_published=True)
        self.rB = Restaurant.objects.create(name='Rest B', code_prefix='B', plan='pro', carta_published=False)
        self.rBasic = Restaurant.objects.create(name='Rest C', code_prefix='C', plan='basico')

        def member(username, restaurant, key):
            u = User.objects.create_user(username, password='pw12345!')
            Membership.objects.create(user=u, restaurant=restaurant, role=role(restaurant, key))
            return u

        self.ownerA = member('cartaOwnerA', self.rA, 'owner')
        self.editorA = member('cartaEditorA', self.rA, 'editor')       # sin can_create_recipes
        self.ownerB = member('cartaOwnerB', self.rB, 'owner')
        self.ownerBasic = member('cartaOwnerBasic', self.rBasic, 'owner')

        self.recA = Recipe.objects.create(
            restaurant=self.rA, code='A-001', name='Ceviche', on_menu=True,
            menu_section='Entrantes', menu_price='12.50', sale_price='10',
        )
        self.espA = Especial.objects.create(
            restaurant=self.rA, name='Seco de ternera', price='16',
            available=True, temperatura='caliente_tierra', sales_pitch='Nuestro clásico peruano.',
        )
        self.espB = Especial.objects.create(restaurant=self.rB, name='Otro', price='9')

    # ── Gestión (privada) ──
    def test_owner_creates_and_lists_own_especiales(self):
        self.client.force_authenticate(self.ownerA)
        r = self.client.post('/api/especiales/', {'name': 'Cau cau', 'price': '14'}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        ids = [e['id'] for e in self.client.get('/api/especiales/').json()]
        self.assertIn(self.espA.id, ids)
        self.assertNotIn(self.espB.id, ids)          # otro restaurante

    def test_editor_without_create_flag_forbidden(self):
        self.client.force_authenticate(self.editorA)
        self.assertEqual(self.client.get('/api/especiales/').status_code, 403)

    def test_basico_plan_has_no_carta(self):
        self.client.force_authenticate(self.ownerBasic)
        self.assertEqual(self.client.get('/api/especiales/').status_code, 403)

    def test_especiales_cross_tenant_404(self):
        self.client.force_authenticate(self.ownerA)
        self.assertEqual(self.client.get(f'/api/especiales/{self.espB.id}/').status_code, 404)

    def test_carta_settings_toggle(self):
        self.client.force_authenticate(self.ownerA)
        r = self.client.patch('/api/carta/settings/', {'carta_published': False}, format='json')
        self.assertEqual(r.status_code, 200)
        self.rA.refresh_from_db()
        self.assertFalse(self.rA.carta_published)

    # ── Públicas (sin login) ──
    def test_public_carta_ok_and_hides_costs(self):
        resp = self.client.get(f'/api/public/carta/{self.rA.public_slug}/')   # sin autenticar
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        item = data['sections'][0]['items'][0]
        self.assertEqual(item['name'], 'Ceviche')
        self.assertEqual(float(item['price']), 12.50)                 # menu_price, no sale_price
        # No debe filtrar costes ni campos internos:
        for leaked in ('sale_price', 'cost', 'unit_cost', 'escandallo'):
            self.assertNotIn(leaked, item)

    def test_public_carta_404_if_not_published(self):
        self.assertEqual(self.client.get(f'/api/public/carta/{self.rB.public_slug}/').status_code, 404)

    def test_public_especiales_ok(self):
        resp = self.client.get(f'/api/public/especiales/{self.rA.public_slug}/')
        self.assertEqual(resp.status_code, 200)
        names = [e['name'] for e in resp.json()['especiales']]
        self.assertIn('Seco de ternera', names)
