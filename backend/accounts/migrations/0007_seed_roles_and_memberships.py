"""Puebla roles por defecto + memberships desde los UserProfile actuales.

Preserva TODO: cada usuario con restaurante recibe una Membership con el rol
equivalente a su rol antiguo (premium→owner, basic→editor). Leche de Tigre
pasa a plan Business. Los superusuarios (plataforma) no reciben membership.
"""
from django.db import migrations

# Flags de los 4 roles por defecto (self-contained, no importa de models).
DEFAULT_ROLES = {
    'owner': dict(
        name='Owner (Dueño)', can_view_recipes=True, can_edit_recipes=True,
        can_create_recipes=True, can_delete_recipes=True,
        can_view_escandallo=True, can_manage_users=True,
    ),
    'manager': dict(
        name='Manager (Chef)', can_view_recipes=True, can_edit_recipes=True,
        can_create_recipes=True, can_delete_recipes=True,
        can_view_escandallo=True, can_manage_users=False,
    ),
    'editor': dict(
        name='Editor', can_view_recipes=True, can_edit_recipes=True,
        can_create_recipes=False, can_delete_recipes=False,
        can_view_escandallo=False, can_manage_users=False,
    ),
    'viewer': dict(
        name='Viewer (Cocina)', can_view_recipes=True, can_edit_recipes=False,
        can_create_recipes=False, can_delete_recipes=False,
        can_view_escandallo=False, can_manage_users=False,
    ),
}
ROLE_ORDER = ['owner', 'manager', 'editor', 'viewer']
ROLE_FOR_OLD_ROLE = {'premium': 'owner', 'basic': 'editor'}


def forwards(apps, schema_editor):
    Restaurant = apps.get_model('accounts', 'Restaurant')
    Role = apps.get_model('accounts', 'Role')
    Membership = apps.get_model('accounts', 'Membership')
    UserProfile = apps.get_model('accounts', 'UserProfile')

    # 1) Roles por defecto en cada restaurante + plan de Leche de Tigre.
    for r in Restaurant.objects.all():
        for key in ROLE_ORDER:
            Role.objects.get_or_create(restaurant=r, key=key, defaults=DEFAULT_ROLES[key])
        if 'leche de tigre' in (r.name or '').lower():
            r.plan = 'business'
            r.plan_status = 'active'
            r.save(update_fields=['plan', 'plan_status'])

    # 2) Membership desde cada perfil con restaurante (excepto superusuarios).
    for p in UserProfile.objects.select_related('user', 'restaurant').all():
        user = p.user
        if user.is_superuser or p.restaurant_id is None:
            continue
        role_key = ROLE_FOR_OLD_ROLE.get(p.role, 'viewer')
        role = Role.objects.filter(restaurant_id=p.restaurant_id, key=role_key).first()
        Membership.objects.get_or_create(
            user=user, restaurant_id=p.restaurant_id,
            defaults={'role': role, 'title': ''},
        )


def backwards(apps, schema_editor):
    apps.get_model('accounts', 'Membership').objects.all().delete()
    apps.get_model('accounts', 'Role').objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0006_restaurant_plan_restaurant_plan_status_role_and_more'),
    ]
    operations = [migrations.RunPython(forwards, backwards)]
