"""Tests de cuentas: creación de usuarios con contraseña temporal, login por
correo (usuarios de restaurante), cambio obligatorio y restablecimiento."""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from .models import Membership, Restaurant, Role


class UserCreationTests(APITestCase):
    def setUp(self):
        self.rest = Restaurant.objects.create(name='Rest', code_prefix='R', plan='pro')
        self.superadmin = User.objects.create_user('admin', password='pw12345!', is_superuser=True, is_staff=True)

    def test_create_restaurant_user_generates_temp_password_and_logs_in_by_email(self):
        self.client.force_authenticate(self.superadmin)
        resp = self.client.post('/api/users/', {
            'first_name': 'María', 'last_name': 'Pérez', 'email': 'maria@rest.com',
            'phone': '600123123', 'role': 'manager', 'restaurant': self.rest.id,
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        temp = resp.data['generated_password']
        self.assertTrue(temp)                                   # se generó y devolvió
        self.assertEqual(resp.data['must_change_password'], True)
        u = User.objects.get(email='maria@rest.com')
        self.assertEqual(u.username, 'maria@rest.com')          # login = correo
        self.assertEqual(u.first_name, 'María')
        self.assertEqual(u.profile.phone, '600123123')
        # Entra con correo + contraseña temporal.
        login = self.client.post('/api/auth/login/', {'username': 'maria@rest.com', 'password': temp}, format='json')
        self.assertEqual(login.status_code, 200)
        self.assertEqual(login.data['must_change_password'], True)
        self.assertEqual(login.data['first_name'], 'María')

    def test_create_user_requires_email(self):
        self.client.force_authenticate(self.superadmin)
        resp = self.client.post('/api/users/', {'role': 'viewer', 'restaurant': self.rest.id}, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('email', resp.data)

    def test_change_password_clears_flag(self):
        self.client.force_authenticate(self.superadmin)
        temp = self.client.post('/api/users/', {
            'email': 'juan@rest.com', 'role': 'viewer', 'restaurant': self.rest.id,
        }, format='json').data['generated_password']
        u = User.objects.get(email='juan@rest.com')
        self.client.force_authenticate(u)
        r = self.client.post('/api/auth/change-password/', {
            'current_password': temp, 'new_password': 'NuevaClave2026',
        }, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        u.refresh_from_db()
        self.assertTrue(u.check_password('NuevaClave2026'))
        self.assertFalse(u.profile.must_change_password)

    def test_change_password_wrong_current(self):
        u = User.objects.create_user('x@rest.com', password='OldClave2026')
        self.client.force_authenticate(u)
        r = self.client.post('/api/auth/change-password/', {
            'current_password': 'mal', 'new_password': 'NuevaClave2026',
        }, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('current_password', r.data)

    def test_change_password_rejects_weak(self):
        u = User.objects.create_user('y@rest.com', password='OldClave2026')
        self.client.force_authenticate(u)
        r = self.client.post('/api/auth/change-password/', {
            'current_password': 'OldClave2026', 'new_password': '123',
        }, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('new_password', r.data)

    def test_reset_password_by_admin(self):
        u = User.objects.create_user('z@rest.com', password='OldClave2026')
        Membership.objects.create(user=u, restaurant=self.rest, role=Role.objects.get(restaurant=self.rest, key='viewer'))
        self.client.force_authenticate(self.superadmin)
        r = self.client.post(f'/api/users/{u.id}/reset_password/', {}, format='json')
        self.assertEqual(r.status_code, 200)
        temp = r.data['generated_password']
        u.refresh_from_db()
        self.assertTrue(u.check_password(temp))
        self.assertTrue(u.profile.must_change_password)

    def test_owner_requests_plan_change(self):
        owner = User.objects.create_user('owner@rest.com', password='OwnerClave2026')
        Membership.objects.create(user=owner, restaurant=self.rest, role=Role.objects.get(restaurant=self.rest, key='owner'))
        viewer = User.objects.create_user('viewer@rest.com', password='ViewerClave2026')
        Membership.objects.create(user=viewer, restaurant=self.rest, role=Role.objects.get(restaurant=self.rest, key='viewer'))
        # Owner puede solicitar.
        self.client.force_authenticate(owner)
        r = self.client.post('/api/plan-requests/', {'requested_plan': 'business', 'note': 'quiero escandallo'}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        req_id = r.data['id']
        # Un viewer NO puede solicitar.
        self.client.force_authenticate(viewer)
        self.assertEqual(self.client.post('/api/plan-requests/', {'requested_plan': 'business'}, format='json').status_code, 403)
        # El superadmin ve la solicitud pendiente en el restaurante.
        self.client.force_authenticate(self.superadmin)
        row = [x for x in self.client.get('/api/restaurants/').json() if x['id'] == self.rest.id][0]
        self.assertEqual(row['pending_plan_request']['requested_plan'], 'business')
        # Y puede marcarla como aplicada.
        r2 = self.client.patch(f'/api/plan-requests/{req_id}/', {'status': 'done'}, format='json')
        self.assertEqual(r2.status_code, 200)
        from accounts.models import PlanChangeRequest
        self.assertIsNotNone(PlanChangeRequest.objects.get(id=req_id).resolved_at)

    def test_avatar_upload_and_clear(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        u = User.objects.create_user('pic@rest.com', password='PicClave2026')
        self.client.force_authenticate(u)
        png = (b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00'
               b'\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82')
        img = SimpleUploadedFile('a.png', png, content_type='image/png')
        r = self.client.post('/api/auth/avatar/', {'avatar': img}, format='multipart')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertTrue(r.data['avatar'])
        u.refresh_from_db()
        self.assertTrue(u.profile.avatar)
        r2 = self.client.delete('/api/auth/avatar/')
        self.assertEqual(r2.status_code, 200)
        self.assertIsNone(r2.data['avatar'])

    def test_create_restaurant_with_owner_email(self):
        self.client.force_authenticate(self.superadmin)
        resp = self.client.post('/api/restaurants/', {
            'name': 'Nuevo', 'code_prefix': 'NV', 'tax_id': 'B-999', 'plan': 'basico',
            'owner_email': 'dueno@nuevo.com', 'owner_first_name': 'Ana', 'owner_role': 'owner',
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertEqual(resp.data['tax_id'], 'B-999')
        self.assertTrue(resp.data['owner_generated_password'])
        owner = User.objects.get(email='dueno@nuevo.com')
        self.assertEqual(owner.username, 'dueno@nuevo.com')
        self.assertTrue(owner.profile.must_change_password)


class OwnerSelfServiceTests(APITestCase):
    """Fase 0: un owner con can_manage_users gestiona usuarios y roles SOLO de su
    restaurante; nunca otro tenant, nunca superadmins, nunca a sí mismo (borrar)."""

    def setUp(self):
        self.rA = Restaurant.objects.create(name='A', code_prefix='A', plan='pro')
        self.rB = Restaurant.objects.create(name='B', code_prefix='B', plan='pro')

        def member(username, restaurant, key):
            u = User.objects.create_user(username, password='pw12345!')
            Membership.objects.create(user=u, restaurant=restaurant,
                                      role=Role.objects.get(restaurant=restaurant, key=key))
            return u

        self.ownerA = member('ownerA', self.rA, 'owner')
        self.viewerA = member('viewerA', self.rA, 'viewer')
        self.ownerB = member('ownerB', self.rB, 'owner')

    def test_owner_lists_only_own_users(self):
        self.client.force_authenticate(self.ownerA)
        resp = self.client.get('/api/users/')
        self.assertEqual(resp.status_code, 200)
        ids = {u['id'] for u in resp.data}
        self.assertIn(self.ownerA.id, ids)
        self.assertIn(self.viewerA.id, ids)
        self.assertNotIn(self.ownerB.id, ids)          # usuario de otro restaurante

    def test_owner_create_is_forced_to_own_restaurant(self):
        self.client.force_authenticate(self.ownerA)
        resp = self.client.post('/api/users/', {          # pide rB, se fuerza a rA
            'email': 'nuevo@a.com', 'role': 'viewer', 'restaurant': self.rB.id,
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        u = User.objects.get(email='nuevo@a.com')
        self.assertEqual(u.memberships.first().restaurant_id, self.rA.id)

    def test_owner_cannot_create_superadmin(self):
        self.client.force_authenticate(self.ownerA)
        resp = self.client.post('/api/users/', {
            'username': 'hacker', 'role': 'superadmin', 'password': 'Xy12345678!',
        }, format='json')
        self.assertEqual(resp.status_code, 403)
        self.assertFalse(User.objects.filter(username='hacker').exists())

    def test_owner_cannot_touch_other_restaurant_user(self):
        self.client.force_authenticate(self.ownerA)
        self.assertEqual(self.client.get(f'/api/users/{self.ownerB.id}/').status_code, 404)
        self.assertEqual(self.client.delete(f'/api/users/{self.ownerB.id}/').status_code, 404)

    def test_owner_cannot_delete_self(self):
        self.client.force_authenticate(self.ownerA)
        self.assertEqual(self.client.delete(f'/api/users/{self.ownerA.id}/').status_code, 403)

    def test_viewer_without_flag_cannot_manage_users(self):
        self.client.force_authenticate(self.viewerA)
        self.assertEqual(self.client.get('/api/users/').status_code, 403)

    def test_owner_roles_scoped_to_own_restaurant(self):
        self.client.force_authenticate(self.ownerA)
        resp = self.client.get(f'/api/roles/?restaurant={self.rB.id}')   # ignora el param
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(all(r['restaurant'] == self.rA.id for r in resp.data))
        roleA = Role.objects.get(restaurant=self.rA, key='editor')
        self.assertEqual(self.client.patch(f'/api/roles/{roleA.id}/', {'can_create_recipes': True}, format='json').status_code, 200)
        roleB = Role.objects.get(restaurant=self.rB, key='editor')       # otro restaurante
        self.assertEqual(self.client.patch(f'/api/roles/{roleB.id}/', {'can_create_recipes': True}, format='json').status_code, 404)

    def test_owner_changes_currency_others_cannot(self):
        self.client.force_authenticate(self.ownerA)
        r = self.client.patch('/api/auth/restaurant/', {'currency': 'PEN'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.rA.refresh_from_db()
        self.assertEqual(self.rA.currency, 'PEN')
        # Moneda inválida → 400.
        self.assertEqual(self.client.patch('/api/auth/restaurant/', {'currency': 'XXX'}, format='json').status_code, 400)
        # Un viewer (no owner) NO puede cambiarla.
        self.client.force_authenticate(self.viewerA)
        self.assertEqual(self.client.patch('/api/auth/restaurant/', {'currency': 'USD'}, format='json').status_code, 403)
