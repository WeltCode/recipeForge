"""Registro de actividad para viewsets (quién crea/edita/borra qué)."""
from .models import log_activity


class ActivityLogMixin:
    """Registra actividad si `activity_entity` está fijado en el viewset.
    Debe ir PRIMERO en la herencia; siempre llama a super() para no alterar el
    guardado real. El `perform_create` de cada base añade su propio log (porque
    la base ya lo sobreescribe para fijar el restaurante)."""

    activity_entity = None

    def _act_name(self, obj):
        for f in ('name', 'code'):
            v = getattr(obj, f, None)
            if v:
                return str(v)
        for f in ('product', 'insumo', 'partida'):
            rel = getattr(obj, f, None)
            if rel is not None and getattr(rel, 'name', None):
                return str(rel.name)
        return str(obj)

    def _act_restaurant(self, obj):
        r = getattr(obj, 'restaurant', None)
        if r is not None:
            return r
        ins = getattr(obj, 'insumo', None)   # p.ej. formato de compra → insumo → restaurante
        return getattr(ins, 'restaurant', None) if ins else None

    def _log(self, obj, action):
        if self.activity_entity:
            log_activity(self._act_restaurant(obj), self.request.user, action, self.activity_entity, self._act_name(obj))

    def perform_update(self, serializer):
        obj = serializer.save()
        self._log(obj, 'update')

    def perform_destroy(self, instance):
        ent = self.activity_entity
        if ent:
            r, name = self._act_restaurant(instance), self._act_name(instance)
        super().perform_destroy(instance)
        if ent:
            log_activity(r, self.request.user, 'delete', ent, name)
