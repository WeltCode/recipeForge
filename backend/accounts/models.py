import secrets
import string

from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.text import slugify


def generate_temp_password(length=10):
    """Contraseña temporal legible que cumple los validadores de Django
    (mezcla mayúscula, minúscula y dígito; longitud ≥ 8)."""
    alphabet = string.ascii_letters + string.digits
    while True:
        pw = ''.join(secrets.choice(alphabet) for _ in range(length))
        if (any(c.islower() for c in pw) and any(c.isupper() for c in pw)
                and any(c.isdigit() for c in pw)):
            return pw


# Plantillas de ficha técnica disponibles (diseños de exportación/impresión).
TEMPLATE_CHOICES = [
    ('formal', 'Formal'),
    ('moderna', 'Moderna'),
    ('tradicional', 'Tradicional'),
    ('llamativa', 'Llamativa'),
]


# Planes de suscripción (van en el RESTAURANTE, no en el usuario).
PLAN_PRUEBA = 'prueba'
PLAN_BASICO = 'basico'
PLAN_PRO = 'pro'         # se muestra como "Premium"
PLAN_BUSINESS = 'business'
PLAN_CHOICES = [
    (PLAN_PRUEBA, 'Prueba'),
    (PLAN_BASICO, 'Básico (Cocinero)'),
    (PLAN_PRO, 'Premium'),
    (PLAN_BUSINESS, 'Business'),
]
PLAN_STATUS_CHOICES = [
    ('trial', 'Prueba'),
    ('active', 'Activa'),
    ('past_due', 'Impago'),
    ('suspended', 'Suspendida'),
]

# Moneda del restaurante: se muestra en toda la app (precios, costes, ventas).
# El símbolo y su posición los resuelve el frontend (lib/money.js); aquí solo
# guardamos el código ISO. Mercados objetivo: España (EUR) + LATAM.
CURRENCY_CHOICES = [
    ('EUR', 'Euro (€)'),
    ('USD', 'Dólar (US$)'),
    ('GBP', 'Libra (£)'),
    ('PEN', 'Sol peruano (S/)'),
    ('MXN', 'Peso mexicano ($)'),
    ('COP', 'Peso colombiano ($)'),
    ('ARS', 'Peso argentino ($)'),
    ('CLP', 'Peso chileno ($)'),
    ('BRL', 'Real brasileño (R$)'),
]

# Techo de funciones y LÍMITES por plan. El plan del RESTAURANTE limita qué se
# puede hacer y cuánto; el rol reparte esas funciones entre las personas.
# Permiso efectivo = el plan lo incluye Y el rol lo concede. Límites: None = sin
# límite. `max_recipes_total` (tope absoluto, p.ej. prueba), `max_recipes_per_month`
# (tope mensual, p.ej. básico), `max_pdf_total` (tope de PDF, p.ej. prueba).
PLAN_FEATURES = {
    PLAN_PRUEBA: {
        'pdf': True, 'watermark': True, 'templates_custom': False,
        'allergens': False, 'escandallo': False, 'inventory': False, 'suppliers': False, 'carta': False,
        'multiuser': False, 'max_users': 1, 'multi_local': False,
        'max_recipes_total': 5, 'max_recipes_per_month': None, 'max_pdf_total': 5,
        'trial': True, 'trial_days': 30,
    },
    # Básico (Cocinero): plan individual para 1 cocinero. Recetas ilimitadas +
    # escandallo + alérgenos + moneda + logo. Sin multiusuario/plantillas/inventario.
    PLAN_BASICO: {
        'pdf': True, 'watermark': False, 'templates_custom': False,
        'allergens': True, 'escandallo': True, 'inventory': False, 'suppliers': False, 'carta': False,
        'multiuser': False, 'max_users': 1, 'multi_local': False,
        'max_recipes_total': None, 'max_recipes_per_month': None, 'max_pdf_total': None,
        'trial': False, 'trial_days': None,
    },
    PLAN_PRO: {
        'pdf': True, 'watermark': False, 'templates_custom': True,
        'allergens': True, 'escandallo': True, 'inventory': True, 'suppliers': False, 'carta': True,
        'multiuser': True, 'max_users': 8, 'multi_local': False,
        'max_recipes_total': None, 'max_recipes_per_month': None, 'max_pdf_total': None,
        'trial': False, 'trial_days': None,
    },
    PLAN_BUSINESS: {
        'pdf': True, 'watermark': False, 'templates_custom': True,
        'allergens': True, 'escandallo': True, 'inventory': True, 'suppliers': True, 'carta': True,
        'multiuser': True, 'max_users': 20, 'multi_local': True,
        'max_recipes_total': None, 'max_recipes_per_month': None, 'max_pdf_total': None,
        'trial': False, 'trial_days': None,
    },
}


def plan_features(restaurant):
    """Funciones y límites del plan del restaurante."""
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


# Diseños de carta pública. Cada tema es un mundo visual propio; el
# restaurante puede además cambiar fuente, colores y fondo.
CARTA_THEME_CHOICES = [
    ('marea', 'Marea — oscuro elegante (fine dining)'),
    ('lienzo', 'Lienzo — bistró claro y cálido (kraft/pizarra)'),
    ('carbon', 'Carbón — minimal alto contraste (urbano)'),
]
CARTA_FONT_CHOICES = [
    ('', 'La del diseño'),
    ('serif', 'Serif elegante'),
    ('sans', 'Sans moderna'),
    ('mono', 'Mono técnica'),
    ('script', 'Manuscrita'),
]


BUSINESS_TYPE_CHOICES = [
    ('restaurant', 'Restaurante'),
    ('individual', 'Cocinero particular'),
]


class Restaurant(models.Model):
    """Cliente/tenant de la plataforma: un restaurante con sus propias recetas."""

    name = models.CharField(max_length=180)
    # Tipo de cuenta (elegido en el alta): restaurante o cocinero particular.
    # Orienta el plan al pasar a pago (particular → Básico/Cocinero).
    business_type = models.CharField(
        max_length=20, choices=BUSINESS_TYPE_CHOICES, default='restaurant',
    )
    default_template = models.CharField(
        max_length=20, choices=TEMPLATE_CHOICES, default='formal',
    )
    code_prefix = models.CharField(
        max_length=12, blank=True,
        help_text='Prefijo para los códigos de receta, ej. LT o CV103.',
    )
    tax_id = models.CharField(max_length=40, blank=True)  # CIF/NIF del restaurante
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='EUR')
    # Suscripción (el plan lo lee la app para permisos/límites; el cobro se
    # gestiona manual por ahora, Stripe más adelante).
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default=PLAN_BASICO)
    plan_status = models.CharField(
        max_length=20, choices=PLAN_STATUS_CHOICES, default='active',
    )
    # Fin del periodo de prueba (solo plan 'prueba'); null si no aplica.
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    # Contador de PDF exportados (para el tope del plan de prueba).
    pdf_exports_count = models.PositiveIntegerField(default=0)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=40, blank=True)
    address = models.CharField(max_length=255, blank=True)
    logo = models.ImageField(upload_to='restaurant_logos/', null=True, blank=True)
    # Carta pública (Fase 2): slug para las URLs públicas /carta/<slug> y
    # /especiales/<slug>; carta_published controla si la carta es visible.
    public_slug = models.SlugField(max_length=80, unique=True, null=True, blank=True)
    carta_published = models.BooleanField(default=False)
    # Personalización de la carta pública (diseño, fuente, colores, fondo).
    carta_theme = models.CharField(max_length=16, choices=CARTA_THEME_CHOICES, default='marea')
    carta_font = models.CharField(max_length=16, blank=True, default='')
    carta_text_color = models.CharField(max_length=9, blank=True, default='')
    carta_accent_color = models.CharField(max_length=9, blank=True, default='')
    carta_bg_image = models.ImageField(upload_to='carta_bg/', null=True, blank=True)
    carta_bg_fx = models.JSONField(default=dict, blank=True)  # {opacity, blur, filter, overlay}
    # Diseño INDEPENDIENTE de la carta de especiales (vacío = hereda de la carta).
    especiales_theme = models.CharField(max_length=16, blank=True, default='')
    especiales_font = models.CharField(max_length=16, blank=True, default='')
    especiales_text_color = models.CharField(max_length=9, blank=True, default='')
    especiales_accent_color = models.CharField(max_length=9, blank=True, default='')
    especiales_bg_image = models.ImageField(upload_to='carta_bg/', null=True, blank=True)
    especiales_bg_fx = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.public_slug:
            base = slugify(self.name)[:70] or 'restaurante'
            slug, i = base, 2
            while Restaurant.objects.exclude(pk=self.pk).filter(public_slug=slug).exists():
                slug = f'{base}-{i}'
                i += 1
            self.public_slug = slug
        super().save(*args, **kwargs)

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
    phone = models.CharField(max_length=40, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    # Local activo (multi-local): si el usuario pertenece a varios restaurantes,
    # este es el que está operando ahora. Debe ser uno de sus memberships; si es
    # inválido o None, get_membership() cae al primero. Solo presentación/scoping.
    active_restaurant = models.ForeignKey(
        Restaurant, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='+',
    )
    # True mientras el usuario use una contraseña temporal/por defecto: al entrar
    # se le obliga a definir la suya. Se pone al crear (auto) y al restablecer.
    must_change_password = models.BooleanField(default=False)
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


class PlanChangeRequest(models.Model):
    """Solicitud de cambio de plan hecha por el owner de un restaurante. El
    superadmin la ve y activa el plan a mano (el cobro es manual por ahora)."""

    STATUS_PENDING = 'pending'
    STATUS_DONE = 'done'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pendiente'),
        (STATUS_DONE, 'Aplicada'),
        (STATUS_REJECTED, 'Rechazada'),
    ]

    restaurant = models.ForeignKey(
        Restaurant, on_delete=models.CASCADE, related_name='plan_requests',
    )
    requested_plan = models.CharField(max_length=20, choices=PLAN_CHOICES)
    note = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='+',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at', '-id']

    def __str__(self):
        return f'{self.restaurant.name} → {self.get_requested_plan_display()} ({self.status})'


SUPERADMIN = 'superadmin'  # rol de plataforma (is_superuser), no es un rol de restaurante

PERMISSION_FLAGS = [
    'can_view_recipes', 'can_edit_recipes', 'can_create_recipes',
    'can_delete_recipes', 'can_view_escandallo', 'can_manage_users',
]


def get_membership(user):
    """Membership ACTIVA del usuario, o None.

    Multi-local: si el usuario tiene un `active_restaurant` válido (uno de sus
    memberships), devuelve ese; si no, el primero. Todo el aislamiento por tenant
    pasa por aquí, así que fijar el local activo basta para que querysets,
    permisos y features sigan al local elegido sin tocar cada llamada."""
    if not user or not user.is_authenticated:
        return None
    qs = user.memberships.select_related('role', 'restaurant')
    prof = getattr(user, 'profile', None)
    active_id = getattr(prof, 'active_restaurant_id', None) if prof else None
    if active_id:
        m = qs.filter(restaurant_id=active_id).first()
        if m:
            return m
    return qs.first()


def get_user_memberships(user):
    """Todos los memberships del usuario (para el selector de local), o []."""
    if not user or not user.is_authenticated:
        return []
    return list(user.memberships.select_related('role', 'restaurant').order_by('restaurant__name'))


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
        return {
            'pdf': True, 'watermark': False, 'templates_custom': True,
            'allergens': True, 'escandallo': True, 'inventory': True, 'suppliers': True, 'carta': True,
            'multiuser': True, 'max_users': 9999, 'multi_local': True,
            'max_recipes_total': None, 'max_recipes_per_month': None, 'max_pdf_total': None,
            'trial': False, 'trial_days': None,
        }
    return plan_features(get_user_restaurant(user))


def plan_allows(restaurant, feature):
    """True si el plan del restaurante incluye la función `feature`."""
    return bool(plan_features(restaurant).get(feature, False))


class ActivityLog(models.Model):
    """Registro de actividad: quién creó/editó/borró qué. Se llena a partir de
    ahora (no hay histórico previo). Alimenta el Dashboard."""

    ACTION_CHOICES = [('create', 'Creó'), ('update', 'Editó'), ('delete', 'Borró')]
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='activity')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    user_name = models.CharField(max_length=180, blank=True)   # denormalizado (sobrevive al borrado del usuario)
    action = models.CharField(max_length=8, choices=ACTION_CHOICES)
    entity = models.CharField(max_length=20, default='receta')
    entity_name = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


def user_display_name(user):
    if not user:
        return ''
    return (getattr(user, 'first_name', '') or getattr(user, 'username', '') or getattr(user, 'email', '') or '').strip()


def log_activity(restaurant, user, action, entity, name):
    """Crea una entrada de actividad sin romper nunca la petición si algo falla."""
    if not restaurant:
        return
    try:
        ActivityLog.objects.create(
            restaurant=restaurant,
            user=user if getattr(user, 'is_authenticated', False) else None,
            user_name=user_display_name(user), action=action, entity=entity,
            entity_name=(name or '')[:200],
        )
    except Exception:
        pass
