from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


# Plantillas de ficha técnica disponibles (diseños de exportación/impresión).
TEMPLATE_CHOICES = [
    ('formal', 'Formal'),
    ('moderna', 'Moderna'),
    ('tradicional', 'Tradicional'),
    ('llamativa', 'Llamativa'),
]


# Planes de suscripción (van en el RESTAURANTE, no en el usuario).
PLAN_BASICO = 'basico'
PLAN_PRO = 'pro'
PLAN_BUSINESS = 'business'
PLAN_CHOICES = [
    (PLAN_BASICO, 'Básico'),
    (PLAN_PRO, 'Pro'),
    (PLAN_BUSINESS, 'Business'),
]
PLAN_STATUS_CHOICES = [
    ('trial', 'Prueba'),
    ('active', 'Activa'),
    ('past_due', 'Impago'),
    ('suspended', 'Suspendida'),
]

# Techo de funciones por plan (el plan del RESTAURANTE limita qué se puede
# hacer; el rol reparte esas funciones entre las personas). Permiso efectivo =
# el plan lo incluye Y el rol lo concede.
PLAN_FEATURES = {
    PLAN_BASICO: {
        'pdf': False, 'templates_custom': False, 'escandallo': False,
        'allergens': False, 'multiuser': False, 'max_users': 1,
    },
    PLAN_PRO: {
        'pdf': True, 'templates_custom': True, 'escandallo': False,
        'allergens': False, 'multiuser': True, 'max_users': 8,
    },
    PLAN_BUSINESS: {
        'pdf': True, 'templates_custom': True, 'escandallo': True,
        'allergens': True, 'multiuser': True, 'max_users': 20,
    },
}


def plan_features(restaurant):
    """Funciones incluidas en el plan del restaurante."""
    plan = restaurant.plan if restaurant else PLAN_BASICO
    return dict(PLAN_FEATURES.get(plan, PLAN_FEATURES[PLAN_BASICO]))

# Roles por defecto que se crean con cada restaurante. Los flags son EDITABLES
# por restaurante (el Owner puede cambiarlos). El backend hace cumplir los
# permisos; el frontend solo refleja lo que el backend permite.
ROLE_ORDER = ['owner', 'manager', 'editor', 'viewer']
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


class Restaurant(models.Model):
    """Cliente/tenant de la plataforma: un restaurante con sus propias recetas."""

    name = models.CharField(max_length=180)
    default_template = models.CharField(
        max_length=20, choices=TEMPLATE_CHOICES, default='formal',
    )
    code_prefix = models.CharField(
        max_length=12, blank=True,
        help_text='Prefijo para los códigos de receta, ej. LT o CV103.',
    )
    # Suscripción (el plan lo lee la app para permisos/límites; el cobro se
    # gestiona manual por ahora, Stripe más adelante).
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default=PLAN_BASICO)
    plan_status = models.CharField(
        max_length=20, choices=PLAN_STATUS_CHOICES, default='active',
    )
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=40, blank=True)
    address = models.CharField(max_length=255, blank=True)
    logo = models.ImageField(upload_to='restaurant_logos/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Role(models.Model):
    """Rol dentro de un restaurante, con permisos por flags EDITABLES.

    Cada restaurante tiene sus 4 roles por defecto (owner/manager/editor/
    viewer), y el Owner puede ajustar los flags sin tocar código.
    """

    restaurant = models.ForeignKey(
        Restaurant, on_delete=models.CASCADE, related_name='roles',
    )
    key = models.CharField(max_length=20)  # owner|manager|editor|viewer (estable)
    name = models.CharField(max_length=60)  # etiqueta editable

    can_view_recipes = models.BooleanField(default=True)
    can_edit_recipes = models.BooleanField(default=False)
    can_create_recipes = models.BooleanField(default=False)
    can_delete_recipes = models.BooleanField(default=False)
    can_view_escandallo = models.BooleanField(default=False)
    can_manage_users = models.BooleanField(default=False)

    class Meta:
        ordering = ['restaurant', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['restaurant', 'key'], name='unique_role_key_per_restaurant',
            ),
        ]

    def __str__(self):
        return f'{self.name} @ {self.restaurant.name}'


class Membership(models.Model):
    """Une un usuario con un restaurante (tenant) + su rol y su cargo.

    Sustituye la responsabilidad de UserProfile (rol + restaurante). El
    superadmin de plataforma (is_superuser) NO tiene membership.
    """

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='memberships',
    )
    restaurant = models.ForeignKey(
        Restaurant, on_delete=models.CASCADE, related_name='memberships',
    )
    role = models.ForeignKey(
        Role, null=True, blank=True, on_delete=models.SET_NULL, related_name='memberships',
    )
    title = models.CharField(max_length=80, blank=True)  # cargo (chef, sous chef…)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'restaurant'], name='unique_membership_user_restaurant',
            ),
        ]

    def __str__(self):
        role = self.role.name if self.role else 'sin rol'
        return f'{self.user.username} · {role} @ {self.restaurant.name}'


def create_default_roles(restaurant):
    """Crea (si faltan) los 4 roles por defecto de un restaurante."""
    for key in ROLE_ORDER:
        Role.objects.get_or_create(
            restaurant=restaurant, key=key, defaults=DEFAULT_ROLES[key],
        )


@receiver(post_save, sender=Restaurant)
def ensure_default_roles(sender, instance, created, raw=False, **kwargs):
    if created and not raw:
        create_default_roles(instance)


class UserProfile(models.Model):
    """Perfil que extiende al User de Django con un rol de negocio."""

    ROLE_BASIC = 'basic'
    ROLE_PREMIUM = 'premium'
    ROLE_SUPERADMIN = 'superadmin'
    ROLE_CHOICES = [
        (ROLE_BASIC, 'Básico'),
        (ROLE_PREMIUM, 'Premium'),
        (ROLE_SUPERADMIN, 'Super Admin'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_BASIC)
    restaurant = models.ForeignKey(
        Restaurant, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='members',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} ({self.get_role_display()})'


@receiver(post_save, sender=User)
def ensure_profile(sender, instance, created, raw=False, **kwargs):
    """Crea automáticamente un perfil (rol básico) al crear un usuario.

    'raw' es True durante loaddata (importación de fixtures): en ese caso no
    creamos el perfil para no duplicar el que ya viene en los datos importados.
    """
    if created and not raw:
        UserProfile.objects.create(user=instance)


SUPERADMIN = 'superadmin'  # rol de plataforma (is_superuser), no es un rol de restaurante

PERMISSION_FLAGS = [
    'can_view_recipes', 'can_edit_recipes', 'can_create_recipes',
    'can_delete_recipes', 'can_view_escandallo', 'can_manage_users',
]


def get_membership(user):
    """Membership del usuario (por ahora 1 por usuario), o None."""
    if not user or not user.is_authenticated:
        return None
    return user.memberships.select_related('role', 'restaurant').first()


def get_user_role(user):
    """Clave de rol: 'superadmin' (plataforma) o el key del rol en su
    restaurante (owner/manager/editor/viewer), o None."""
    if not user or not user.is_authenticated:
        return None
    if user.is_superuser:
        return SUPERADMIN
    m = get_membership(user)
    return m.role.key if (m and m.role) else None


def get_user_restaurant(user):
    """Restaurante (tenant) del usuario, o None."""
    if not user or not user.is_authenticated:
        return None
    m = get_membership(user)
    return m.restaurant if m else None


def get_user_permissions(user):
    """Diccionario de flags de permiso efectivos. El superadmin puede todo."""
    if not user or not user.is_authenticated:
        return {f: False for f in PERMISSION_FLAGS}
    if user.is_superuser:
        return {f: True for f in PERMISSION_FLAGS}
    m = get_membership(user)
    role = m.role if m else None
    return {f: bool(getattr(role, f, False)) for f in PERMISSION_FLAGS}


def user_can(user, flag):
    """True si el usuario tiene el permiso `flag`. Superadmin siempre True."""
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    m = get_membership(user)
    return bool(getattr(m.role, flag, False)) if (m and m.role) else False


def get_user_features(user):
    """Funciones disponibles según el plan del restaurante del usuario.

    El superadmin tiene todo. Un usuario sin restaurante cae al plan Básico.
    """
    if user and user.is_authenticated and user.is_superuser:
        return {'pdf': True, 'templates_custom': True, 'escandallo': True,
                'allergens': True, 'multiuser': True, 'max_users': 9999}
    return plan_features(get_user_restaurant(user))


def plan_allows(restaurant, feature):
    """True si el plan del restaurante incluye la función `feature`."""
    return bool(plan_features(restaurant).get(feature, False))
