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
