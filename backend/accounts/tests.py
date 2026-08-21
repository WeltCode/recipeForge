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
