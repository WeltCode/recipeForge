# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

La plataforma sirve a tres perfiles simultáneos dentro de un mismo restaurante (tenant):

- **Chef / jefe de cocina (Premium):** crea, edita y elimina fichas técnicas; es el principal productor de contenido.
- **Equipo de cocina (Basic):** consulta y edita fichas existentes para seguir los procedimientos estandarizados.
- **Super Admin / consultor gastronómico:** gestiona múltiples restaurantes desde un panel unificado; crea tenants, asigna usuarios y supervisa todo el catálogo de recetas de cada cliente.

Escenario de uso predominante: cocina activa de restaurante, tableta o portátil, consultas frecuentes durante el servicio y actualizaciones periódicas de recetas.

## Product Purpose

RecipeForge permite a equipos de cocina crear, organizar y estandarizar sus recetas mediante fichas técnicas profesionales que se exportan como PDF listos para imprimir o compartir. Éxito = ningún cocinero improvisa porque todos siguen la misma ficha; ningún chef pierde horas formateando un documento.

## Positioning

El único gestor de fichas técnicas que combina multi-tenant para consultores, exportación PDF con plantillas de calidad editorial y estandarización operativa (código, categoría, revisión, rendimiento, tiempos) en una sola herramienta web, sin necesidad de Excel ni diseñador.

## Operating Context

- El chef crea o actualiza una ficha, elige plantilla y acento de color, y descarga el PDF.
- El equipo de cocina busca fichas por nombre, código o categoría durante el mise en place.
- El superadmin crea un restaurante, asigna un usuario premium como propietario y le da acceso a su equipo básico.
- Las fichas se imprimen y plastifican para colocarlas en la cocina, o se comparten digitalmente por WhatsApp/email.

## Capabilities and Constraints

**Capacidades confirmadas:**
- CRUD de recetas con campos: código, nombre, categoría, descripción, revisión, raciones, rendimiento, tiempos de prep/cocción, vida útil, observaciones, foto final.
- Ingredientes agrupados (12 grupos predefinidos) con cantidad, unidad y nota.
- Pasos de producción con título, instrucción y tip.
- 4 plantillas de ficha: Formal, Moderna, Tradicional, Llamativa.
- Color de acento personalizable por receta.
- Exportación a PDF por ficha.
- Multi-restaurante: cada restaurante tiene su propio catálogo aislado.
- Roles: basic / premium / superadmin.
- Prefijo de código configurable por restaurante (ej. `LT-001`, `CV-003`).

**Restricciones técnicas:**
- Backend Django REST Framework + PostgreSQL (Neon).
- Frontend React + Vite + Tailwind CSS.
- Almacenamiento de imágenes: Cloudflare R2.
- Deploy: Netlify (frontend) + Render (backend). El backend entra en reposo si no hay actividad; hay un ping automático cada 14 min para mantenerlo despierto.
- Sin Stripe aún; la gestión de suscripciones es manual.

**Hechos sin decidir:**
- Módulo de escandallo (costo por receta) — en roadmap, sin fecha.
- Alertas de alérgenos UE — en roadmap.
- PWA / modo offline — en roadmap.

## Brand Commitments

- **Nombre:** RecipeForge (fijo).
- **Logo:** `logorecipe.png` / `icon-color-1024.png` — no sustituir.
- **Paleta cálida:** beige/ámbar/índigo (`#f5f1ea` como fondo base, ámbar como acento premium, índigo para superadmin). Esta identidad es establecida y debe preservarse en cualquier trabajo de diseño.
- **Tipografía actual:** DM Sans (UI), DM Mono (códigos), Playfair Display / Lora (titulares editoriales), Bebas Neue (acentos).
- **Voz:** directa, profesional, sin jerga corporativa. Términos propios: "ficha técnica", "plantilla", "restaurante", "rol".

## Evidence on Hand

- Código fuente completo del frontend (`frontend/src/`) y backend (`backend/`).
- 4 plantillas de PDF implementadas en `frontend/src/templates/`.
- Logo e iconos en `frontend/src/assets/`.
- Producto desplegado y en uso real (Netlify + Render + Neon).
- Sin testimonios, casos de estudio ni métricas de uso disponibles — no fabricar.

## Product Principles

1. **La ficha manda.** El PDF resultante debe verse tan profesional que el restaurante quiera enmarcarlo — la calidad visual de la exportación es producto, no característica.
2. **El consultor es ciudadano de primera clase.** El superadmin que gestiona 10 restaurantes debe poder hacerlo desde un panel fluido; el multi-tenant no es accesorio.
3. **Cero improvisación en cocina.** Cada campo (revisión, rendimiento, tiempos, vida útil) existe para que el equipo replique el plato con exactitud — la estandarización es el propósito central.
4. **Simple para el cocinero, potente para el consultor.** La complejidad del sistema (roles, tenants, plantillas) no debe llegar a quien solo necesita buscar y consultar fichas.
5. **Identidad cálida y editorial.** La paleta y tipografía remiten al mundo de la gastronomía de calidad, no al software de gestión genérico.

## Accessibility & Inclusion

Sin requerimiento específico establecido. Uso en cocina activa sugiere tamaños de texto legibles a distancia media y contraste suficiente para condiciones de luz variables.
