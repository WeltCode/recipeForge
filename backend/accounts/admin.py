from django.contrib import admin

from .models import Restaurant, UserProfile


@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_email', 'contact_phone', 'created_at']
    search_fields = ['name', 'contact_email']


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'restaurant', 'created_at']
    list_filter = ['role', 'restaurant']
    search_fields = ['user__username', 'user__email']
