from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (
    Membership,
    PlanChangeRequest,
    Restaurant,
    Role,
    ROLE_ORDER,
    find_owner_by_identifier,
    generate_temp_password,
    get_membership,
    get_user_features,
    get_user_memberships,
    get_user_permissions,
    get_user_restaurant,
    get_user_role,
    plan_features,
)


def _media(name, context):
    """URL de una imagen: directa desde R2 (custom domain) si `R2_PUBLIC_BASE`
    está configurado, o por el proxy /api/media como respaldo."""
    if not name:
        return None
    from django.conf import settings
    base = getattr(settings, 'R2_PUBLIC_BASE', '')
    if base:
        return f'{base.rstrip("/")}/{name}'
    request = (context or {}).get('request')
    path = f'/api/media/{name}'
    return request.build_absolute_uri(path) if request else path


def _abs_logo(restaurant, context):
    """URL del logo del restaurante (R2 directo o proxy)."""
    return _media(restaurant.logo.name, context) if (restaurant and restaurant.logo) else None


def _restaurants_payload(user, context):
    """Lista de locales del usuario para el selector multi-local. Marca el activo
    (el que resuelve get_membership) con is_active."""
    active = get_membership(user)
    active_id = active.restaurant_id if active else None
    out = []
    for m in get_user_memberships(user):
        r = m.restaurant
        out.append({
            'id': r.id,
            'name': r.name,
            'role': m.role.key if m.role else None,
            'role_name': m.role.name if m.role else None,
            'plan': r.plan,
            'logo': _abs_logo(r, context),
            'is_active': r.id == active_id,
        })
    return out


class MeSerializer(serializers.ModelSerializer):
    """Datos del usuario autenticado: rol, permisos (flags), plan y restaurante."""

    role = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    features = serializers.SerializerMethodField()
    usage = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    must_change_password = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    restaurant = serializers.SerializerMethodField()
    restaurant_name = serializers.SerializerMethodField()
    restaurant_prefix = serializers.SerializerMethodField()
    restaurant_logo = serializers.SerializerMethodField()
    restaurant_default_template = serializers.SerializerMethodField()
    restaurant_plan = serializers.SerializerMethodField()
    restaurant_currency = serializers.SerializerMethodField()
    restaurant_public_slug = serializers.SerializerMethodField()
    restaurant_carta_published = serializers.SerializerMethodField()
    restaurants = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'role', 'permissions', 'features', 'usage', 'title', 'phone',
                  'must_change_password', 'avatar', 'restaurant', 'restaurant_name',
                  'restaurant_prefix', 'restaurant_logo', 'restaurant_default_template',
                  'restaurant_plan', 'restaurant_currency',
                  'restaurant_public_slug', 'restaurant_carta_published', 'restaurants']

    def get_restaurants(self, obj):
        return _restaurants_payload(obj, self.context)

    def get_phone(self, obj):
        p = getattr(obj, 'profile', None)
        return p.phone if p else ''

    def get_must_change_password(self, obj):
        p = getattr(obj, 'profile', None)
        return bool(p.must_change_password) if p else False

    def get_avatar(self, obj):
        p = getattr(obj, 'profile', None)
        return _media(p.avatar.name, self.context) if (p and getattr(p, 'avatar', None)) else None

    def get_role(self, obj):
        return get_user_role(obj)

    def get_permissions(self, obj):
        return get_user_permissions(obj)

    def get_features(self, obj):
        return get_user_features(obj)

    def get_usage(self, obj):
        """Uso actual del restaurante para mostrar contadores/candados."""
        from django.utils import timezone
        r = get_user_restaurant(obj)
        if not r:
            return {}
        month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return {
            'recipes_total': r.recipes.count(),
            'recipes_this_month': r.recipes.filter(created_at__gte=month_start).count(),
            'pdf_exports_count': r.pdf_exports_count,
            'trial_ends_at': r.trial_ends_at.isoformat() if r.trial_ends_at else None,
        }

    def get_title(self, obj):
        m = get_membership(obj)
        return m.title if m else ''

    def get_restaurant(self, obj):
        r = get_user_restaurant(obj)
        return r.id if r else None

    def get_restaurant_name(self, obj):
        r = get_user_restaurant(obj)
        return r.name if r else None

    def get_restaurant_prefix(self, obj):
        r = get_user_restaurant(obj)
        return r.code_prefix if r else None

    def get_restaurant_logo(self, obj):
        return _abs_logo(get_user_restaurant(obj), self.context)

    def get_restaurant_default_template(self, obj):
        r = get_user_restaurant(obj)
        return r.default_template if r else None

    def get_restaurant_plan(self, obj):
        r = get_user_restaurant(obj)
        return r.plan if r else None

    def get_restaurant_currency(self, obj):
        r = get_user_restaurant(obj)
        return r.currency if r else 'EUR'

    def get_restaurant_public_slug(self, obj):
        r = get_user_restaurant(obj)
        return r.public_slug if r else None

    def get_restaurant_carta_published(self, obj):
        r = get_user_restaurant(obj)
        return bool(r.carta_published) if r else False


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Login que además incluye rol, permisos, username y restaurante."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = get_user_role(user)
        token['username'] = user.username
        return token

    def validate(self, attrs):
        # Login por CORREO o usuario: si el identificador no es un username
        # existente pero sí un correo único, se resuelve al username real antes
        # de autenticar. Los usuarios de restaurante (username = correo) no se ven
        # afectados. Superadmins pueden así entrar con su correo aunque su usuario
        # sea otro (p. ej. DedSec5).
        ident = attrs.get(self.username_field)
        if ident and not User.objects.filter(username__iexact=ident).exists():
            by_email = User.objects.filter(email__iexact=ident)
            if by_email.count() == 1:
                attrs[self.username_field] = by_email.first().username

        data = super().validate(attrs)
        user = self.user
        r = get_user_restaurant(user)
        data['role'] = get_user_role(user)
        data['permissions'] = get_user_permissions(user)
        data['features'] = get_user_features(user)
        data['username'] = user.username
        data['first_name'] = user.first_name
        prof = getattr(user, 'profile', None)
        data['must_change_password'] = bool(prof.must_change_password) if prof else False
        # Avatar: se incluye en el login para que el cliente no muestre la foto del
        # usuario anterior hasta recargar (el estado se refresca al iniciar sesión).
        data['avatar'] = _media(prof.avatar.name, self.context) if (prof and getattr(prof, 'avatar', None)) else None
        m = get_membership(user)
        data['title'] = m.title if m else ''
        data['restaurant'] = r.id if r else None
        data['restaurant_name'] = r.name if r else None
        data['restaurant_prefix'] = r.code_prefix if r else None
        data['restaurant_default_template'] = r.default_template if r else None
        data['restaurant_plan'] = r.plan if r else None
        data['restaurant_currency'] = r.currency if r else 'EUR'
        data['restaurant_public_slug'] = r.public_slug if r else None
        data['restaurant_carta_published'] = bool(r.carta_published) if r else False
        data['restaurant_logo'] = _abs_logo(r, self.context)
        data['restaurants'] = _restaurants_payload(user, self.context)
        return data


class PlanChangeRequestSerializer(serializers.ModelSerializer):
    restaurant_name = serializers.SerializerMethodField()
    requested_plan_display = serializers.CharField(source='get_requested_plan_display', read_only=True)

    class Meta:
        model = PlanChangeRequest
        fields = ['id', 'restaurant', 'restaurant_name', 'requested_plan',
                  'requested_plan_display', 'note', 'status', 'created_at', 'resolved_at']
        read_only_fields = ['restaurant', 'created_at', 'resolved_at']

    def get_restaurant_name(self, obj):
        return obj.restaurant.name


class RoleSerializer(serializers.ModelSerializer):
    """Rol de un restaurante con sus flags (editables por el Owner/superadmin)."""

    class Meta:
        model = Role
        fields = ['id', 'restaurant', 'key', 'name',
                  'can_view_recipes', 'can_edit_recipes', 'can_create_recipes',
                  'can_delete_recipes', 'can_view_escandallo', 'can_manage_users']
        read_only_fields = ['restaurant', 'key']


class UserAdminSerializer(serializers.ModelSerializer):
    """Gestión de usuarios de un restaurante (Super Admin u Owner).

    Usuarios de restaurante: se identifican y entran con su CORREO (username =
    email). La contraseña se GENERA por defecto (temporal) y el usuario la cambia
    al entrar. Superadmins de plataforma: se crean con `username` explícito."""

    role = serializers.CharField(required=False)  # key: owner|manager|editor|viewer
    role_name = serializers.SerializerMethodField()
    title = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    # Contraseña opcional: si no viene se genera una temporal (se devuelve una vez).
    password = serializers.CharField(
        write_only=True, required=False, allow_blank=True, validators=[validate_password]
    )
    restaurant = serializers.PrimaryKeyRelatedField(
        queryset=Restaurant.objects.all(), required=False, allow_null=True
    )
    restaurant_name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'phone',
                  'password', 'role', 'role_name', 'title', 'restaurant',
                  'restaurant_name', 'avatar', 'is_active']
        extra_kwargs = {'username': {'required': False}}

    def get_restaurant_name(self, obj):
        m = obj.memberships.select_related('restaurant').first()
        return m.restaurant.name if m else None

    def get_avatar(self, obj):
        p = getattr(obj, 'profile', None)
        return _media(p.avatar.name, self.context) if (p and getattr(p, 'avatar', None)) else None

    def get_role_name(self, obj):
        m = obj.memberships.select_related('role').first()
        return m.role.name if (m and m.role) else None

    def _role_for(self, restaurant, key):
        if not restaurant or not key:
            return None
        return Role.objects.filter(restaurant=restaurant, key=key).first()

    def create(self, validated_data):
        role_key = validated_data.pop('role', 'viewer')
        title = validated_data.pop('title', '')
        phone = validated_data.pop('phone', '')
        restaurant = validated_data.pop('restaurant', None)
        password = validated_data.pop('password', None) or None
        is_super = role_key == 'superadmin'
        email = (validated_data.get('email') or '').strip()

        # Identidad de acceso: restaurante = correo; superadmin = username explícito.
        if is_super:
            if not validated_data.get('username'):
                raise serializers.ValidationError({'username': 'El usuario es obligatorio.'})
        else:
            if not email:
                raise serializers.ValidationError({'email': 'El correo es obligatorio.'})
            validated_data['username'] = email
        existing = User.objects.filter(username__iexact=validated_data['username']).first()
        if existing:
            # Multi-local: si es un usuario de restaurante EXISTENTE y se indica un
            # restaurante, se VINCULA a ese local (nuevo membership) en vez de
            # recrearlo — así el superadmin da a un dueño un segundo local por su
            # correo. En cualquier otro caso, sigue siendo un duplicado inválido.
            if is_super or restaurant is None or existing.is_superuser:
                key = 'username' if is_super else 'email'
                raise serializers.ValidationError({key: 'Ya existe una cuenta con ese correo/usuario.'})
            if Membership.objects.filter(user=existing, restaurant=restaurant).exists():
                raise serializers.ValidationError({'email': 'Este usuario ya pertenece a este restaurante.'})
            max_users = plan_features(restaurant)['max_users']
            if restaurant.memberships.count() >= max_users:
                raise serializers.ValidationError({
                    'plan': f'El plan {restaurant.get_plan_display()} permite hasta '
                            f'{max_users} usuario(s). Sube de plan para añadir más.'
                })
            Membership.objects.create(
                user=existing, restaurant=restaurant,
                role=self._role_for(restaurant, role_key), title=title,
            )
            self._generated_password = None
            self._linked_existing = True
            return existing

        # Límite de usuarios por plan del restaurante (no aplica a superadmins).
        if not is_super and restaurant is not None:
            max_users = plan_features(restaurant)['max_users']
            if restaurant.memberships.count() >= max_users:
                raise serializers.ValidationError({
                    'plan': f'El plan {restaurant.get_plan_display()} permite hasta '
                            f'{max_users} usuario(s). Sube de plan para añadir más.'
                })

        # Contraseña: si el admin no la puso, se genera una temporal y se fuerza cambio.
        generated = None
        if not password:
            password = generate_temp_password()
            generated = password

        user = User(**validated_data)
        if is_super:
            user.is_superuser = True
            user.is_staff = True
        user.set_password(password)
        user.save()  # el signal crea el UserProfile
        prof = user.profile
        prof.phone = phone
        prof.must_change_password = bool(generated)
        prof.save(update_fields=['phone', 'must_change_password'])
        if not is_super and restaurant is not None:
            Membership.objects.create(
                user=user, restaurant=restaurant,
                role=self._role_for(restaurant, role_key), title=title,
            )
        self._generated_password = generated
        return user

    def update(self, instance, validated_data):
        role_key = validated_data.pop('role', None)
        title = validated_data.pop('title', serializers.empty)
        phone = validated_data.pop('phone', serializers.empty)
        restaurant = validated_data.pop('restaurant', serializers.empty)
        password = validated_data.pop('password', None) or None
        new_username = validated_data.pop('username', None)
        # El username sí se puede editar (p. ej. renombrar un superadmin), con
        # comprobación de unicidad. Los usuarios de restaurante entran con su
        # correo, así que rara vez se toca aquí.
        if new_username and new_username.strip() and new_username != instance.username:
            if User.objects.filter(username__iexact=new_username).exclude(pk=instance.pk).exists():
                raise serializers.ValidationError({'username': 'Ese usuario ya está en uso.'})
            instance.username = new_username.strip()
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()

        if phone is not serializers.empty:
            prof = instance.profile
            prof.phone = phone
            if password:
                prof.must_change_password = False
            prof.save(update_fields=['phone', 'must_change_password'])
        elif password:
            prof = instance.profile
            prof.must_change_password = False
            prof.save(update_fields=['must_change_password'])

        m = instance.memberships.first()
        target_restaurant = restaurant if restaurant is not serializers.empty else (m.restaurant if m else None)
        if target_restaurant is not None:
            if m is None:
                m = Membership.objects.create(user=instance, restaurant=target_restaurant)
            elif restaurant is not serializers.empty and m.restaurant_id != getattr(target_restaurant, 'id', None):
                m.restaurant = target_restaurant
            if role_key:
                m.role = self._role_for(m.restaurant, role_key)
            if title is not serializers.empty:
                m.title = title
            m.save()
        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['role'] = get_user_role(instance)
        m = instance.memberships.first()
        data['title'] = m.title if m else ''
        prof = getattr(instance, 'profile', None)
        data['phone'] = prof.phone if prof else ''
        data['dni'] = prof.dni if prof else ''
        data['must_change_password'] = prof.must_change_password if prof else False
        # Todos los restaurantes del usuario (para ver a qué pertenece; un dueño
        # con varios locales los muestra todos).
        data['restaurants'] = [
            {'id': mm.restaurant_id, 'name': mm.restaurant.name, 'role': mm.role.key if mm.role else None}
            for mm in instance.memberships.select_related('restaurant', 'role').all()
        ]
        # La contraseña temporal generada se devuelve UNA vez (tras crear/restablecer).
        if getattr(self, '_generated_password', None):
            data['generated_password'] = self._generated_password
        # Usuario existente vinculado a este local (multi-local): sin contraseña nueva.
        if getattr(self, '_linked_existing', False):
            data['linked_existing'] = True
        return data


class RestaurantSerializer(serializers.ModelSerializer):
    """Restaurantes (tenants). Permite crear opcionalmente un usuario inicial."""

    logo = serializers.ImageField(required=False, allow_null=True)
    recipe_count = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()
    pending_plan_request = serializers.SerializerMethodField()

    # Owner inicial (opcional). Entra con su CORREO; contraseña temporal si no se da.
    owner_username = serializers.CharField(write_only=True, required=False, allow_blank=True)
    owner_password = serializers.CharField(
        write_only=True, required=False, allow_blank=True, validators=[validate_password]
    )
    owner_role = serializers.CharField(write_only=True, required=False)  # key
    owner_first_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    owner_last_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    owner_email = serializers.EmailField(write_only=True, required=False, allow_blank=True)
    owner_phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    owner_dni = serializers.CharField(write_only=True, required=False, allow_blank=True)  # NIE/DNI del dueño nuevo
    # Multi-local: si es True, se VINCULA a un dueño YA existente (2º restaurante).
    owner_existing = serializers.BooleanField(write_only=True, required=False, default=False)
    # Identificador para buscar al dueño existente: correo, NIE/DNI o CIF/NIF.
    owner_identifier = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Restaurant
        fields = ['id', 'name', 'code_prefix', 'tax_id', 'currency', 'default_template', 'plan', 'plan_status',
                  'trial_ends_at', 'pdf_exports_count',
                  'contact_email', 'contact_phone', 'address', 'logo',
                  'created_at', 'recipe_count', 'member_count', 'members', 'pending_plan_request',
                  'owner_username', 'owner_password', 'owner_role',
                  'owner_first_name', 'owner_last_name', 'owner_email', 'owner_phone', 'owner_dni',
                  'owner_existing', 'owner_identifier']
        read_only_fields = ['trial_ends_at', 'pdf_exports_count']

    def get_pending_plan_request(self, obj):
        req = obj.plan_requests.filter(status=PlanChangeRequest.STATUS_PENDING).first()
        return {'id': req.id, 'requested_plan': req.requested_plan,
                'requested_plan_display': req.get_requested_plan_display()} if req else None

    def get_recipe_count(self, obj):
        return obj.recipes.count()

    def get_member_count(self, obj):
        return obj.memberships.count()

    def get_members(self, obj):
        return [
            {
                'id': m.user.id,
                'username': m.user.username,
                'role': m.role.key if m.role else None,
                'role_name': m.role.name if m.role else None,
                'title': m.title,
            }
            for m in obj.memberships.select_related('user', 'role').all()
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['logo'] = _abs_logo(instance, self.context)  # servir por el proxy, no r2.dev
        if getattr(self, '_owner_generated_password', None):
            data['owner_generated_password'] = self._owner_generated_password
        if getattr(self, '_linked_existing', False):
            data['linked_existing'] = True
        return data

    def _ensure_trial_clock(self, restaurant):
        """Arranca el reloj de 30 días al poner (o crear con) plan de prueba."""
        from datetime import timedelta
        from django.utils import timezone
        feats = plan_features(restaurant)
        if feats.get('trial') and restaurant.trial_ends_at is None:
            days = feats.get('trial_days') or 30
            restaurant.trial_ends_at = timezone.now() + timedelta(days=days)
            restaurant.save(update_fields=['trial_ends_at'])

    def create(self, validated_data):
        owner_role = validated_data.pop('owner_role', 'owner')
        first = validated_data.pop('owner_first_name', '')
        last = validated_data.pop('owner_last_name', '')
        phone = validated_data.pop('owner_phone', '')
        owner_password = validated_data.pop('owner_password', None) or None
        # El correo es el identificador de acceso; se acepta owner_email o el viejo
        # owner_username por compatibilidad.
        owner_existing = validated_data.pop('owner_existing', False)
        owner_dni = (validated_data.pop('owner_dni', '') or '').strip()
        owner_identifier = (validated_data.pop('owner_identifier', '') or '').strip()
        owner_login = (validated_data.pop('owner_email', '') or validated_data.pop('owner_username', '') or '').strip()

        # Vincular a un dueño EXISTENTE (2º local del mismo dueño): se localiza por
        # correo/usuario, NIE/DNI o CIF/NIF de uno de sus restaurantes.
        existing_user = None
        if owner_existing:
            ident = owner_identifier or owner_login
            if not ident:
                raise serializers.ValidationError({'owner_identifier': 'Indica el correo, CIF/NIF o NIE/DNI del dueño.'})
            existing_user = find_owner_by_identifier(ident)
            if not existing_user:
                raise serializers.ValidationError({'owner_identifier': 'No se encontró un dueño con ese correo, CIF/NIF o NIE/DNI.'})
        elif owner_login and User.objects.filter(username__iexact=owner_login).exists():
            raise serializers.ValidationError({'owner_email': 'Ya existe una cuenta con ese correo.'})

        restaurant = Restaurant.objects.create(**validated_data)  # signal crea los 4 roles
        self._ensure_trial_clock(restaurant)

        if existing_user is not None:
            role = Role.objects.filter(restaurant=restaurant, key=owner_role).first()
            Membership.objects.get_or_create(
                user=existing_user, restaurant=restaurant, defaults={'role': role, 'title': ''},
            )
            self._linked_existing = True
        elif owner_login:
            generated = None
            if not owner_password:
                owner_password = generate_temp_password()
                generated = owner_password
            user = User(username=owner_login, email=owner_login, first_name=first, last_name=last)
            user.set_password(owner_password)
            user.save()
            prof = user.profile
            prof.phone = phone
            prof.dni = owner_dni
            prof.must_change_password = bool(generated)
            prof.save(update_fields=['phone', 'dni', 'must_change_password'])
            role = Role.objects.filter(restaurant=restaurant, key=owner_role).first()
            Membership.objects.create(user=user, restaurant=restaurant, role=role)
            self._owner_generated_password = generated
        return restaurant

    def update(self, instance, validated_data):
        for f in ('owner_username', 'owner_password', 'owner_role', 'owner_first_name',
                  'owner_last_name', 'owner_email', 'owner_phone', 'owner_dni',
                  'owner_existing', 'owner_identifier'):
            validated_data.pop(f, None)
        instance = super().update(instance, validated_data)
        self._ensure_trial_clock(instance)
        return instance
