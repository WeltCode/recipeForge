from django.contrib import admin

from .models import IngredientLine, ProductionStep, Recipe


class IngredientInline(admin.TabularInline):
    model = IngredientLine
    extra = 1


class StepInline(admin.TabularInline):
    model = ProductionStep
    extra = 1


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'restaurant', 'category', 'servings', 'revision', 'updated_at']
    list_filter = ['restaurant', 'category']
    search_fields = ['code', 'name', 'category']
    inlines = [IngredientInline, StepInline]
