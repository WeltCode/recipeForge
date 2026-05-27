# RecipeForge

Web app para crear fichas tecnicas de cocina con formulario dinamico, vista previa e impresion/exportacion en formato A4 profesional.

## Vision del producto

RecipeForge permite:

1. Crear recetas mediante formulario estructurado.
2. Agregar insumos/ingredientes segun necesidad (lista dinamica).
3. Agregar pasos de produccion segun necesidad (lista dinamica).
4. Adjuntar foto del producto final.
5. Generar una ficha tecnica visualmente profesional.
6. Exportar e imprimir en formato A4 sin problemas de maquetacion.

## Referencia visual de ficha terminada

El estilo objetivo es editorial/profesional, basado en el ejemplo compartido por el usuario:

- Hero con foto del plato + nombre + descripcion.
- Barra de metricas rapidas (porciones, gramaje, tiempos, temperatura).
- Columna izquierda de ingredientes agrupados.
- Columna derecha de proceso paso a paso numerado.
- Footer tecnico con codigo de ficha/version.

## Stack elegido

### Frontend

- React + Vite
- Tailwind CSS

### Backend

- Django
- Django REST Framework
- django-cors-headers

### Datos y despliegue (plan)

- PostgreSQL para produccion.
- Almacenamiento de imagenes: S3/Cloudinary (segun costo/flujo).

## Requisito clave: PDF A4 perfecto

Para evitar diferencias entre navegadores e impresoras:

1. El frontend arma y valida la ficha.
2. El backend genera el HTML final de impresion.
3. El backend renderiza PDF A4 con reglas de paginacion (margenes, saltos, encabezados).
4. El usuario descarga PDF final listo para imprimir.

## Roadmap paso a paso (idea -> ejecucion)

### Fase 0 - Definicion funcional

1. Congelar plantilla de ficha tecnica base.
2. Definir campos obligatorios y opcionales.
3. Definir reglas de costeo y unidades.
4. Definir flujo de usuario (crear, editar, previsualizar, exportar).

### Fase 1 - MVP tecnico

1. Modelo de datos base de receta.
2. API CRUD para recetas, ingredientes, pasos.
3. Formulario dinamico en frontend.
4. Endpoint inicial de vista/descarga de ficha.

### Fase 2 - Calidad A4

1. Sistema tipografico y jerarquia visual.
2. Reglas de saltos de pagina para recetas largas.
3. Validar impresion en multiples navegadores/impresoras.
4. Ajustes finales para salida PDF estable.

### Fase 3 - Escalado

1. Versionado de recetas.
2. Escalado de cantidades por porciones.
3. Costeo historico de insumos.
4. Roles de usuario (chef, admin, operacion).

## Modelo de datos inicial (MVP)

1. Recipe
   - code, name, category, description, servings, yield_grams, prep_time_min, cook_time_min, service_temp_c, notes, final_photo
2. IngredientLine
   - recipe, group_name, ingredient_name, quantity, unit, note, order
3. ProductionStep
   - recipe, step_number, title, instruction, tip, order
4. RecipeMeta (opcional inicial)
   - allergens, techniques, doc_version

## Estructura creada en este primer paso

- frontend con React + Vite + Tailwind listo.
- backend con Django + DRF + CORS listo.
- endpoint base de salud API para pruebas.
- archivos de entorno ejemplo.
- hoja de ruta consolidada en este README.

## Estado actual (paso ejecutado)

1. Backend con dominio base implementado:
   - Modelos `Recipe`, `IngredientLine`, `ProductionStep`.
   - CRUD REST en `/api/recipes/`.
   - Endpoint de salud en `/api/health/`.
   - Migraciones iniciales aplicadas correctamente.
2. Frontend con formulario dinamico implementado:
   - Campos generales de ficha tecnica.
   - Lista dinamica de ingredientes (agregar/quitar).
   - Lista dinamica de pasos (agregar/quitar).
   - Envio al backend para guardar receta.
3. Validaciones tecnicas ejecutadas:
   - `python manage.py check` sin errores.
   - `npm run build` sin errores.

## Comandos de arranque local

### Frontend

1. cd frontend
2. npm install
3. npm run dev

### Backend

1. cd backend
2. .\\.venv\\Scripts\\python.exe -m pip install -r requirements.txt
3. .\\.venv\\Scripts\\python.exe manage.py migrate
4. .\\.venv\\Scripts\\python.exe manage.py runserver

## Siguiente paso sugerido

Construir el dominio base de recetas en backend (modelos + serializers + viewsets) y luego conectar el primer formulario dinamico en frontend.
