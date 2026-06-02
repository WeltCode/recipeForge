import json
from collections import OrderedDict
import base64
import os
from pathlib import Path

from django.http import HttpResponse
from django.template.loader import render_to_string
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView

from .models import Recipe
from .serializers import RecipeDetailSerializer, RecipeListSerializer


class HealthCheckView(APIView):
    def get(self, _request):
        return Response({'status': 'ok', 'service': 'recipeforge-api'})


class RecipeViewSet(ModelViewSet):
    queryset = Recipe.objects.prefetch_related('ingredients', 'steps').all()
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.action == 'list':
            return RecipeListSerializer
        return RecipeDetailSerializer

    def _normalize_multipart(self, request):
        """Normalize multipart form data for recipe creation."""
        # Construir diccionario con todos los datos de request.data
        # Preservando archivos y otros tipos de datos
        data = {}
        
        # Copiar todos los campos de request.data
        for key in request.data:
            value = request.data.get(key)
            
            # Normalizar JSON strings para ingredientes y pasos
            if key in ('ingredients', 'steps'):
                if isinstance(value, str):
                    try:
                        data[key] = json.loads(value)
                    except (json.JSONDecodeError, ValueError):
                        data[key] = []
                else:
                    data[key] = value
            else:
                # Pasar todos los demás campos tal cual
                # (incluyendo UploadedFile para final_photo)
                data[key] = value
        
        # Asegurar que final_photo esté incluido si viene en FILES
        if 'final_photo' in request.FILES:
            data['final_photo'] = request.FILES['final_photo']
        
        return data

    def create(self, request, *args, **kwargs):
        if request.content_type and 'multipart' in request.content_type:
            data = self._normalize_multipart(request)
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            return Response(serializer.data, status=201)
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def sheet_html(self, _request, **kwargs):
        """Retorna el HTML de la ficha técnica profesional"""
        recipe = self.get_object()
        ingredients_by_group = OrderedDict()

        for ingredient in recipe.ingredients.all():
            group_name = ingredient.group_name.strip() if ingredient.group_name else 'Ingredientes'
            ingredients_by_group.setdefault(group_name, []).append(ingredient)

        steps = list(recipe.steps.all())

        # Leer y convertir logo a base64
        logo_path = os.path.join(
            os.path.dirname(__file__), '..', '..', 'frontend', 'src', 'assets', 'ldt.png'
        )
        logo_base64 = ''
        if os.path.exists(logo_path):
            with open(logo_path, 'rb') as f:
                logo_base64 = base64.b64encode(f.read()).decode()

        # Leer y convertir foto a base64
        photo_data = ''
        photo_mime = 'image/jpeg'
        if recipe.final_photo:
            try:
                file_ext = Path(recipe.final_photo.path).suffix.lower()
                mime_map = {
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.webp': 'image/webp',
                    '.gif': 'image/gif',
                }
                photo_mime = mime_map.get(file_ext, 'image/jpeg')
                with open(recipe.final_photo.path, 'rb') as f:
                    photo_data = base64.b64encode(f.read()).decode()
            except (OSError, IOError, AttributeError):
                photo_data = ''

        context = {
            'recipe': recipe,
            'ingredients_by_group': list(ingredients_by_group.items()),
            'steps': steps,
            'logo_base64': logo_base64,
            'photo_data': photo_data,
            'photo_mime': photo_mime,
        }

        html = render_to_string('recipe_sheet.html', context)
        response = HttpResponse(html, content_type='text/html; charset=utf-8')
        response['Content-Disposition'] = f'inline; filename="{recipe.code}.html"'
        return response
