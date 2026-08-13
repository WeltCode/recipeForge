from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (
    Membership,
    Restaurant,
    Role,
    ROLE_ORDER,
    get_membership,
    get_user_permissions,
    get_user_restaurant,
    get_user_role,
)


def _abs_logo(restaurant, context):
    if restaurant and restaurant.logo:
        request = context.get('request')
        url = restaurant.logo.url
        return request.build_absolute_uri(url) if request else url
    return None


class MeSerializer(serializers.ModelSerializer):
    """Datos del usuario autenticado: rol, permisos (flags), plan y restaurante."""

    role = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    restaurant = serializers.SerializerMethodField()
    restaurant_name = serializers.SerializerMethodField()
    restaurant_prefix = serializers.SerializerMethodField()
    restaurant_logo = serializers.SerializerMethodField()
    restaurant_default_template = serializers.SerializerMethodField()
    restaurant_plan = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'role', 'permissions', 'title', 'restaurant', 'restaurant_name',
                  'restaurant_prefix', 'restaurant_logo', 'restaurant_default_template',
                  'restaurant_plan']

    def get_role(self, obj):
        return get_user_role(obj)

    def get_permissions(self, obj):
        return get_user_permissions(obj)

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


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Login que además incluye rol, permisos, username y restaurante."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = get_user_role(user)
        token['username'] = user.username
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        r = get_user_restaurant(user)
        data['role'] = get_user_role(user)
        data['permissions'] = get_user_permissions(user)
        data['username'] = user.username
        m = get_membership(user)
        data['title'] = m.title if m else ''
        data['restaurant'] = r.id if r else None
        data['restaurant_name'] = r.name if r else None
        data['restaurant_prefix'] = r.code_prefix if r else None
        data['restaurant_default_template'] = r.default_template if r else None
        data['restaurant_plan'] = r.plan if r else None
        data['restaurant_logo'] = _abs_logo(r, self.context)
        return data


class RoleSerializer(serializers.ModelSerializer):
    """Rol de un restaurante con sus flags (editables por el Owner/superadmin)."""

    class Meta:
        model = Role
        fields = ['id', 'restaurant', 'key', 'name',
                  'can_view_recipes', 'can_edit_recipes', 'can_create_recipes',
                  'can_delete_recipes', 'can_view_escandallo', 'can_manage_users']
        read_only_fields = ['restaurant', 'key']


class UserAdminSerializer(serializers.ModelSerializer):
    """Gestión de usuarios de un restaurante (Super Admin u Owner)."""

    role = serializers.CharField(required=False)  # key: owner|manager|editor|viewer
    role_name = serializers.SerializerMethodField()
    title = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(
        write_only=True, required=False, validators=[validate_password]
    )
    restaurant = serializers.PrimaryKeyRelatedField(
        queryset=Restaurant.objects.all(), required=False, allow_null=True
    )
    restaurant_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'role', 'role_name',
                  'title', 'restaurant', 'restaurant_name', 'is_active']

    def get_restaurant_name(self, obj):
        m = obj.memberships.select_related('restaurant').first()
        return m.restaurant.name if m else None

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
        restaurant = validated_data.pop('restaurant', None)
        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError({'password': 'La contraseña es obligatoria.'})
        user = User(**validated_data)
        user.set_password(password)
        user.save()  # el signal crea un UserProfile dormido; usamos Membership
        if restaurant is not None:
            Membership.objects.create(
                user=user, restaurant=restaurant,
                role=self._role_for(restaurant, role_key), title=title,
            )
        return user

    def update(self, instance, validated_data):
        role_key = validated_data.pop('role', None)
        title = validated_data.pop('title', serializers.empty)
        restaurant = validated_data.pop('restaurant', serializers.empty)
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()

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
        return data


class RestaurantSerializer(serializers.ModelSerializer):
    """Restaurantes (tenants). Permite crear opcionalmente un usuario inicial."""

    logo = serializers.ImageField(required=False, allow_null=True)
    recipe_count = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()

    owner_username = serializers.CharField(write_only=True, required=False)
    owner_password = serializers.CharField(
        write_only=True, required=False, validators=[validate_password]
    )
    owner_role = serializers.CharField(write_only=True, required=False)  # key

    class Meta:
        model = Restaurant
        fields = ['id', 'name', 'code_prefix', 'default_template', 'plan', 'plan_status',
                  'contact_email', 'contact_phone', 'address', 'logo',
                  'created_at', 'recipe_count', 'member_count', 'members',
                  'owner_username', 'owner_password', 'owner_role']

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

    def create(self, validated_data):
        owner_username = validated_data.pop('owner_username', None)
        owner_password = validated_data.pop('owner_password', None)
        owner_role = validated_data.pop('owner_role', 'owner')

        if owner_username and User.objects.filter(username=owner_username).exists():
            raise serializers.ValidationError(
                {'owner_username': 'Ya existe un usuario con ese nombre.'}
            )

        restaurant = Restaurant.objects.create(**validated_data)  # signal crea los 4 roles

        if owner_username and owner_password:
            user = User(username=owner_username)
            user.set_password(owner_password)
            user.save()
            role = Role.objects.filter(restaurant=restaurant, key=owner_role).first()
            Membership.objects.create(user=user, restaurant=restaurant, role=role)
        return restaurant

    def update(self, instance, validated_data):
        for f in ('owner_username', 'owner_password', 'owner_role'):
            validated_data.pop(f, None)
        return super().update(instance, validated_data)
