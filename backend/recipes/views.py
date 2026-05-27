import json
from collections import OrderedDict

from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView

from .models import Recipe
from .pdf import build_recipe_pdf
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
        """When the request is multipart, ingredients and steps arrive as JSON strings."""
        data = request.data.copy()
        for key in ('ingredients', 'steps'):
            if key in data and isinstance(data[key], str):
                try:
                    data[key] = json.loads(data[key])
                except (json.JSONDecodeError, ValueError):
                    pass
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
    def pdf(self, _request, **kwargs):
        if kwargs.get('pk') is None:
            pass
        recipe = self.get_object()
        ingredients_by_group = OrderedDict()

        for ingredient in recipe.ingredients.all():
            group_name = ingredient.group_name.strip() if ingredient.group_name else 'Ingredientes'
            ingredients_by_group.setdefault(group_name, []).append(ingredient)

        photo_path = recipe.final_photo.path if recipe.final_photo else None
        pdf_file = build_recipe_pdf(recipe, list(ingredients_by_group.items()), list(recipe.steps.all()), photo_path=photo_path)
        response = HttpResponse(pdf_file, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{recipe.code}.pdf"'
        return response
