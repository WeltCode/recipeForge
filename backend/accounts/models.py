from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class Restaurant(models.Model):
    """Cliente/tenant de la plataforma: un restaurante con sus propias recetas."""

    name = models.CharField(max_length=180)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=40, blank=True)
    address = models.CharField(max_length=255, blank=True)
    logo = models.ImageField(upload_to='restaurant_logos/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


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
def ensure_profile(sender, instance, created, **kwargs):
    """Crea automáticamente un perfil (rol básico) al crear un usuario."""
    if created:
        UserProfile.objects.create(user=instance)


def get_user_role(user):
    """Devuelve el rol efectivo del usuario.

    Un superusuario de Django siempre tiene rol de superadmin,
    independientemente de lo que diga su perfil.
    """
    if not user or not user.is_authenticated:
        return None
    if user.is_superuser:
        return UserProfile.ROLE_SUPERADMIN
    profile = getattr(user, 'profile', None)
    if profile is None:
        return UserProfile.ROLE_BASIC
    return profile.role


def get_user_restaurant(user):
    """Devuelve el restaurante (tenant) al que pertenece el usuario, o None."""
    if not user or not user.is_authenticated:
        return None
    profile = getattr(user, 'profile', None)
    return profile.restaurant if profile else None
