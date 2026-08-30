import json
from collections import OrderedDict
import base64
import os
from pathlib import Path

from django.db.models import F
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView

from accounts.models import (
    Restaurant,
    UserProfile,
    get_user_restaurant,
    get_user_role,
    plan_allows,
    plan_features,
)

from .models import Especial, Recipe
from .permissions import CanManageCarta, RecipeRolePermission
from .serializers import (
    EspecialSerializer,
    PublicCartaItemSerializer,
    PublicEspecialSerializer,
    RecipeDetailSerializer,
    RecipeListSerializer,
    media_url,
)


def _month_start():
    now = timezone.now()
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _trial_expired(restaurant, feats):
    return bool(
        feats.get('trial') and restaurant.trial_ends_at
        and timezone.now() > restaurant.trial_ends_at
    )


class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, _request):
        return Response({'status': 'ok', 'service': 'recipeforge-api'})


class MediaProxyView(APIView):
    """Sirve un archivo de media (foto/logo) desde el almacenamiento (R2).

    Evita depender del dominio público r2.dev (limitado/solo desarrollo): el
    backend lee el objeto por la API privada de R2 y lo entrega. Las imágenes
    son públicas (como hasta ahora), así que no requiere autenticación.
    """

    permission_classes = [AllowAny]

    def get(self, _request, path):
        import mimetypes
        from django.core.files.storage import default_storage
        from django.http import FileResponse, Http404

        if not path or not default_storage.exists(path):
            raise Http404('media no encontrado')
        content_type = mimetypes.guess_type(path)[0] or 'application/octet-stream'
        response = FileResponse(default_storage.open(path, 'rb'), content_type=content_type)
        response['Cache-Control'] = 'public, max-age=604800'  # 7 días
        return response


class RecipeViewSet(ModelViewSet):
    queryset = Recipe.objects.prefetch_related('ingredients', 'steps').all()
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    permission_classes = [RecipeRolePermission]

    def get_queryset(self):
        qs = Recipe.objects.prefetch_related('ingredients', 'steps').all()
        user = self.request.user
        if get_user_role(user) == UserProfile.ROLE_SUPERADMIN:
            # El super admin ve todo; puede filtrar por ?restaurant=<id>
            restaurant_id = self.request.query_params.get('restaurant')
            return qs.filter(restaurant_id=restaurant_id) if restaurant_id else qs
        # Los usuarios normales solo ven las recetas de su restaurante
        return qs.filter(restaurant=get_user_restaurant(user))

    def perform_create(self, serializer):
        user = self.request.user
        restaurant = get_user_restaurant(user)
        if get_user_role(user) == UserProfile.ROLE_SUPERADMIN:
            # El super admin indica el restaurante destino
            rid = self.request.data.get('restaurant')
            if rid:
                restaurant = Restaurant.objects.filter(pk=rid).first()

        # Límites del plan (no aplican al superadmin de plataforma).
        if restaurant and not user.is_superuser:
            feats = plan_features(restaurant)
            if _trial_expired(restaurant, feats):
                raise ValidationError({'plan': 'Tu periodo de prueba ha terminado. '
                                               'Elige un plan para seguir creando recetas.'})
            total_cap = feats.get('max_recipes_total')
            if total_cap is not None and restaurant.recipes.count() >= total_cap:
                raise ValidationError({'plan': f'El plan {restaurant.get_plan_display()} '
                                               f'permite {total_cap} recetas. Mejora tu plan para crear más.'})
            month_cap = feats.get('max_recipes_per_month')
            if month_cap is not None and restaurant.recipes.filter(created_at__gte=_month_start()).count() >= month_cap:
                raise ValidationError({'plan': f'Has llegado al límite de {month_cap} recetas este mes '
                                               f'del plan {restaurant.get_plan_display()}. Mejora a Premium '
                                               f'para crear ilimitadas.'})

        extra = {'restaurant': restaurant}
        # Si no se indicó plantilla, usar la por defecto del restaurante
        if not self.request.data.get('template') and restaurant:
            extra['template'] = restaurant.default_template
        serializer.save(**extra)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def register_pdf(self, request):
        """Registra una exportación a PDF y aplica el tope del plan (prueba: 5).

        El cliente llama a esto antes de generar el PDF. Devuelve
        {allowed: bool, reason?}. Cualquier miembro autenticado puede descargar
        (no requiere permiso de crear).
        """
        user = request.user
        restaurant = get_user_restaurant(user)
        if user.is_superuser or restaurant is None:
            return Response({'allowed': True})
        feats = plan_features(restaurant)
        if _trial_expired(restaurant, feats):
            return Response(
                {'allowed': False, 'reason': 'Tu periodo de prueba ha terminado. '
                                             'Elige un plan para seguir descargando.'},
                status=403,
            )
        cap = feats.get('max_pdf_total')
        if cap is not None and restaurant.pdf_exports_count >= cap:
            return Response(
                {'allowed': False, 'reason': f'Has usado tus {cap} PDF de prueba. '
                                             f'Elige un plan para seguir descargando.'},
                status=403,
            )
        if cap is not None:
            restaurant.pdf_exports_count = F('pdf_exports_count') + 1
            restaurant.save(update_fields=['pdf_exports_count'])
        return Response({'allowed': True})

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

    def update(self, request, *args, **kwargs):
        if request.content_type and 'multipart' in request.content_type:
            data = self._normalize_multipart(request)
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=data, partial=kwargs.get('partial', False))
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data)
        return super().update(request, *args, **kwargs)

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


# ── Fase 2: carta pública + especiales ──────────────────────────────────────

def _clampi(v, lo, hi, default):
    try:
        n = int(round(float(v)))
    except (TypeError, ValueError):
        return default
    return max(lo, min(hi, n))


def _design_for(request, r, surface):
    """Diseño resuelto para 'carta' o 'especiales'. Los especiales HEREDAN de la
    carta cuando su campo está vacío, así por defecto se ven igual pero el
    restaurante puede darle un diseño propio a cada una."""
    esp = surface == 'especiales'
    theme = (r.especiales_theme if esp else '') or r.carta_theme or 'marea'
    font = (r.especiales_font if esp else '') or r.carta_font or ''
    text = (r.especiales_text_color if esp else '') or r.carta_text_color or ''
    accent = (r.especiales_accent_color if esp else '') or r.carta_accent_color or ''
    img = (r.especiales_bg_image if esp else None) or r.carta_bg_image
    fx = (r.especiales_bg_fx if esp else None) or r.carta_bg_fx or {}
    return {
        'theme': theme, 'font': font, 'text_color': text, 'accent_color': accent,
        'bg_image': media_url(request, img.name) if img else None, 'bg_fx': fx or {},
    }


def _restaurant_header(request, r, surface='carta'):
    """Cabecera pública del restaurante (sin datos internos) + diseño de la carta
    solicitada (carta o especiales)."""
    logo = r.logo.name if r.logo else None
    return {
        'name': r.name, 'logo': media_url(request, logo), 'currency': r.currency,
        'design': _design_for(request, r, surface),
    }


class EspecialViewSet(ModelViewSet):
    """CRUD de especiales fuera de carta. Owner/chef con plan carta; superadmin
    todo. Aislado al restaurante del usuario (nunca otro tenant)."""

    serializer_class = EspecialSerializer
    permission_classes = [CanManageCarta]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        u = self.request.user
        qs = Especial.objects.select_related('restaurant').order_by('order', '-created_at')
        if u.is_superuser:
            rid = self.request.query_params.get('restaurant')
            return qs.filter(restaurant_id=rid) if rid else qs
        return qs.filter(restaurant=get_user_restaurant(u))

    def perform_create(self, serializer):
        u = self.request.user
        r = get_user_restaurant(u)
        if u.is_superuser and not r:
            rid = self.request.data.get('restaurant') or self.request.query_params.get('restaurant')
            r = get_object_or_404(Restaurant, pk=rid) if rid else None
        serializer.save(restaurant=r)


class CartaSettingsView(APIView):
    """Publicar/despublicar y PERSONALIZAR la carta pública (owner/chef con
    plan carta): diseño, fuente, colores e imagen de fondo."""

    permission_classes = [CanManageCarta]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def _surface(self, request, r, prefix):
        img = getattr(r, f'{prefix}bg_image')
        return {
            'theme': getattr(r, f'{prefix}theme') or ('marea' if prefix == 'carta_' else ''),
            'font': getattr(r, f'{prefix}font') or '', 'text_color': getattr(r, f'{prefix}text_color') or '',
            'accent_color': getattr(r, f'{prefix}accent_color') or '',
            'bg_image': media_url(request, img.name) if img else None,
            'bg_fx': getattr(r, f'{prefix}bg_fx') or {},
        }

    def _payload(self, request, r):
        return {
            'public_slug': r.public_slug, 'carta_published': r.carta_published,
            'carta': self._surface(request, r, 'carta_'),
            'especiales': self._surface(request, r, 'especiales_'),
        }

    def get(self, request):
        r = get_user_restaurant(request.user)
        if not r:
            return Response({'detail': 'No tienes un restaurante asignado.'}, status=400)
        return Response(self._payload(request, r))

    def patch(self, request):
        import json
        r = get_user_restaurant(request.user)
        if not r:
            return Response({'detail': 'No tienes un restaurante asignado.'}, status=400)
        data = request.data
        fields = []
        if 'carta_published' in data:
            r.carta_published = str(data.get('carta_published')).lower() in ('1', 'true', 'on', 'yes')
            fields.append('carta_published')
        p = 'especiales_' if data.get('surface') == 'especiales' else 'carta_'
        if 'theme' in data:
            val = data.get('theme') or ''
            allowed = ('marea', 'lienzo', 'carbon') + (('',) if p == 'especiales_' else ())
            if val in allowed:
                setattr(r, f'{p}theme', val); fields.append(f'{p}theme')
        for key in ('font', 'text_color', 'accent_color'):
            if key in data:
                setattr(r, f'{p}{key}', (data.get(key) or '')[:16 if key == 'font' else 9]); fields.append(f'{p}{key}')
        if 'bg_fx' in data:
            raw = data.get('bg_fx')
            try:
                fx = raw if isinstance(raw, dict) else json.loads(raw or '{}')
            except (ValueError, TypeError):
                fx = {}
            clean = {
                'opacity': _clampi(fx.get('opacity'), 0, 100, 100),
                'blur': _clampi(fx.get('blur'), 0, 20, 0),
                'filter': fx.get('filter') if fx.get('filter') in ('none', 'gris', 'sepia', 'calido') else 'none',
                'overlay': _clampi(fx.get('overlay'), 0, 100, 70),
            }
            setattr(r, f'{p}bg_fx', clean); fields.append(f'{p}bg_fx')
        if str(data.get('bg_image_clear')).lower() in ('1', 'true'):
            setattr(r, f'{p}bg_image', None); fields.append(f'{p}bg_image')
        elif 'bg_image' in request.FILES:
            setattr(r, f'{p}bg_image', request.FILES['bg_image']); fields.append(f'{p}bg_image')
        if fields:
            r.save(update_fields=list(set(fields)))
        return Response(self._payload(request, r))


class PublicCartaView(APIView):
    """Carta pública (sin login) por slug. Solo si el plan incluye carta y está
    publicada. Devuelve platos agrupados por sección, sin costes."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, slug):
        r = get_object_or_404(Restaurant, public_slug=slug)
        if not (r.carta_published and plan_allows(r, 'carta')):
            return Response({'detail': 'Carta no disponible.'}, status=404)
        items = Recipe.objects.filter(restaurant=r, on_menu=True).order_by(
            'menu_section', 'menu_order', 'name',
        )
        rows = PublicCartaItemSerializer(items, many=True, context={'request': request}).data
        sections = []
        for it in rows:
            sec = it.get('menu_section') or ''
            if not sections or sections[-1]['name'] != sec:
                sections.append({'name': sec, 'items': []})
            sections[-1]['items'].append(it)
        return Response({'restaurant': _restaurant_header(request, r, 'carta'), 'sections': sections})


class PublicEspecialesView(APIView):
    """Especiales fuera de carta públicos (sin login) por slug. Solo si el plan
    incluye carta. Devuelve los disponibles, sin datos internos."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, slug):
        r = get_object_or_404(Restaurant, public_slug=slug)
        if not plan_allows(r, 'carta'):
            return Response({'detail': 'No disponible.'}, status=404)
        qs = Especial.objects.filter(restaurant=r, available=True).order_by('order', '-created_at')
        rows = PublicEspecialSerializer(qs, many=True, context={'request': request}).data
        return Response({'restaurant': _restaurant_header(request, r, 'especiales'), 'especiales': rows})
