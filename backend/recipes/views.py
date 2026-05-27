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

    def get_serializer_class(self):
        if self.action == 'list':
            return RecipeListSerializer
        return RecipeDetailSerializer
