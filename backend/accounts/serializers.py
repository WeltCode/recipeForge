from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Restaurant, UserProfile, get_user_role, get_user_restaurant


class MeSerializer(serializers.ModelSerializer):
    """Datos del usuario autenticado, incluyendo su rol y restaurante."""

    role = serializers.SerializerMethodField()
    restaurant = serializers.SerializerMethodField()
    restaurant_name = serializers.SerializerMethodField()
    restaurant_prefix = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'role', 'restaurant', 'restaurant_name', 'restaurant_prefix']

    def get_role(self, obj):
        return get_user_role(obj)

    def get_restaurant(self, obj):
        r = get_user_restaurant(obj)
        return r.id if r else None

    def get_restaurant_name(self, obj):
        r = get_user_restaurant(obj)
        return r.name if r else None

    def get_restaurant_prefix(self, obj):
        r = get_user_restaurant(obj)
        return r.code_prefix if r else None


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Login que además incluye el rol y el username en la respuesta."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = get_user_role(user)
        token['username'] = user.username
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['role'] = get_user_role(self.user)
        data['username'] = self.user.username
        r = get_user_restaurant(self.user)
        data['restaurant'] = r.id if r else None
        data['restaurant_name'] = r.name if r else None
        data['restaurant_prefix'] = r.code_prefix if r else None
        return data


class UserAdminSerializer(serializers.ModelSerializer):
    """Gestión de usuarios por parte del Super Admin."""

    role = serializers.ChoiceField(choices=UserProfile.ROLE_CHOICES, required=False)
    password = serializers.CharField(
        write_only=True, required=False, validators=[validate_password]
    )
    restaurant = serializers.PrimaryKeyRelatedField(
        queryset=Restaurant.objects.all(), required=False, allow_null=True
    )
    restaurant_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'role',
                  'restaurant', 'restaurant_name', 'is_active']

    def get_restaurant_name(self, obj):
        prof = getattr(obj, 'profile', None)
        return prof.restaurant.name if prof and prof.restaurant else None

    def create(self, validated_data):
        role = validated_data.pop('role', UserProfile.ROLE_BASIC)
        restaurant = validated_data.pop('restaurant', None)
        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError({'password': 'La contraseña es obligatoria.'})
        user = User(**validated_data)
        user.set_password(password)
        user.save()  # el signal crea el perfil
        profile = user.profile
        profile.role = role
        if restaurant is not None:
            profile.restaurant = restaurant
        profile.save()
        return user

    def update(self, instance, validated_data):
        role = validated_data.pop('role', None)
        restaurant = validated_data.pop('restaurant', serializers.empty)
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        profile = instance.profile
        if role is not None:
            profile.role = role
        if restaurant is not serializers.empty:
            profile.restaurant = restaurant
        profile.save()
        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['role'] = get_user_role(instance)
        return data


class RestaurantSerializer(serializers.ModelSerializer):
    """Restaurantes (tenants). Permite crear opcionalmente un usuario inicial."""

    logo = serializers.ImageField(required=False, allow_null=True)
    recipe_count = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()

    # Campos write-only para crear un usuario junto con el restaurante
    owner_username = serializers.CharField(write_only=True, required=False)
    owner_password = serializers.CharField(
        write_only=True, required=False, validators=[validate_password]
    )
    owner_role = serializers.ChoiceField(
        choices=UserProfile.ROLE_CHOICES, write_only=True, required=False
    )

    class Meta:
        model = Restaurant
        fields = ['id', 'name', 'code_prefix', 'contact_email', 'contact_phone', 'address', 'logo',
                  'created_at', 'recipe_count', 'member_count', 'members',
                  'owner_username', 'owner_password', 'owner_role']

    def get_recipe_count(self, obj):
        return obj.recipes.count()

    def get_member_count(self, obj):
        return obj.members.count()

    def get_members(self, obj):
        return [
            {'id': m.user.id, 'username': m.user.username, 'role': get_user_role(m.user)}
            for m in obj.members.select_related('user').all()
        ]

    def create(self, validated_data):
        owner_username = validated_data.pop('owner_username', None)
        owner_password = validated_data.pop('owner_password', None)
        owner_role = validated_data.pop('owner_role', UserProfile.ROLE_BASIC)

        if owner_username and User.objects.filter(username=owner_username).exists():
            raise serializers.ValidationError(
                {'owner_username': 'Ya existe un usuario con ese nombre.'}
            )

        restaurant = Restaurant.objects.create(**validated_data)

        if owner_username and owner_password:
            user = User(username=owner_username)
            user.set_password(owner_password)
            user.save()
            profile = user.profile
            profile.role = owner_role
            profile.restaurant = restaurant
            profile.save()
        return restaurant

    def update(self, instance, validated_data):
        for f in ('owner_username', 'owner_password', 'owner_role'):
            validated_data.pop(f, None)
        return super().update(instance, validated_data)
