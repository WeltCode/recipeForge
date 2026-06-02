<div align="center">
  <img src="docs/lockup-white-on-dark.png" alt="RecipeForge" width="520" />
  <br /><br />
  <p><strong>Plataforma para crear, gestionar y exportar fichas técnicas de producción gastronómica en formato A4 profesional.</strong></p>
  <p>
    <img src="https://img.shields.io/badge/Django-5.x-092E20?style=flat-square&logo=django" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" />
    <img src="https://img.shields.io/badge/TailwindCSS-4.x-06B6D4?style=flat-square&logo=tailwindcss" />
    <img src="https://img.shields.io/badge/DRF-REST%20API-red?style=flat-square" />
  </p>
</div>

---

## Qué es RecipeForge

RecipeForge es una aplicación web full-stack orientada a cocinas profesionales. Permite a chefs y equipos de producción documentar sus recetas en fichas técnicas estandarizadas: con código de referencia, versión, ingredientes agrupados, proceso paso a paso y foto del producto final. Cada ficha se puede exportar como PDF A4 listo para imprimir.

---

## Características principales

| Funcionalidad | Descripción |
|---|---|
| **Formulario dinámico** | Agrega o quita ingredientes y pasos sin recargar la página |
| **Vista previa en vivo** | La ficha A4 se actualiza en tiempo real mientras editas |
| **Grupos de ingredientes** | Organiza los insumos por categoría (Proteínas, Vegetales, Lacteos, etc.) |
| **Tips técnicos** | Cada paso puede incluir una nota o tip de chef |
| **Foto del plato** | Sube la imagen del producto final; se muestra en la ficha |
| **Control de revisiones** | Cada actualización incrementa el número de revisión automáticamente |
| **Exportación PDF A4** | Imprime o guarda la ficha directamente desde el navegador, a escala exacta |
| **CRUD completo** | Crea, edita, lista y elimina recetas desde la misma interfaz |
| **API REST** | Todos los datos se gestionan vía endpoints JSON para integración futura |

---

## Estructura de la ficha técnica

Cada ficha generada por RecipeForge sigue una estructura editorial consistente:

```
┌─────────────────────────────────────────────────────────┐
│  Logo de establecimiento          FT-001 / Rev. 0.1     │  ← Header
├──────────────┬──────────────────────────────────────────┤
│              │  Categoría                               │
│   Foto A4    │  NOMBRE DEL PLATO                        │  ← Hero
│              │  Descripción del plato                   │
├──────┬───────┴───────┬──────────┬──────────┬────────────┤
│ Rac. │  Rendimiento  │  Prep    │  Cocción │  Vida útil │  ← Stats bar
├──────┴───────────────┼──────────┴──────────┴────────────┤
│  INGREDIENTES        │  PROCESO PASO A PASO             │
│  · Grupo A           │  ① Paso uno                      │
│    100 g  Insumo     │    Instrucción detallada         │  ← Body
│    50 g   Insumo     │    ► Tip técnico                 │
│  · Grupo B           │  ② Paso dos                      │
│    ...               │    ...                           │
├──────────────────────┴──────────────────────────────────┤
│  Establecimiento · Producción     FT-001 · junio 2026   │  ← Footer
└─────────────────────────────────────────────────────────┘
```

---

## Stack tecnológico

### Backend
- **Python 3.12** + **Django 5** + **Django REST Framework**
- Base de datos: **SQLite** (desarrollo) / PostgreSQL (producción)
- Almacenamiento de imágenes: sistema de archivos local (`media/`)
- Exportación: renderizado de plantilla HTML + diálogo de impresión del navegador

### Frontend
- **React 19** + **Vite 8**
- **Tailwind CSS 4**
- Comunicación con API vía `fetch` nativo

---

## Estructura del proyecto

```
recipeForge/
├── backend/
│   ├── backend/               # Configuración Django (settings, urls, wsgi)
│   ├── recipes/
│   │   ├── models.py          # Recipe, IngredientLine, ProductionStep
│   │   ├── serializers.py     # Serializadores DRF
│   │   ├── views.py           # ViewSet + exportación HTML
│   │   ├── urls.py            # Rutas de la API
│   │   └── templates/
│   │       └── recipe_sheet.html   # Plantilla de exportación A4
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Formulario + lista + lógica principal
│   │   ├── components/
│   │   │   └── RecipeSheetPreview.jsx  # Componente de ficha A4
│   │   └── assets/
│   ├── index.html
│   └── package.json
├── docs/
│   └── lockup-white-on-dark.png
└── .gitignore
```

---

## Modelo de datos

### `Recipe`
| Campo | Tipo | Descripción |
|---|---|---|
| `code` | CharField | Código único de ficha (ej. `FT-001`) |
| `name` | CharField | Nombre del plato |
| `category` | CharField | Categoría culinaria |
| `description` | TextField | Descripción libre |
| `revision` | PositiveInteger | Versión de la ficha (autoincrementa) |
| `servings` | PositiveInteger | Número de raciones |
| `yield_quantity` | Decimal | Rendimiento total |
| `yield_unit` | CharField | Unidad de rendimiento (`g` / `kg`) |
| `prep_time_min` | PositiveInteger | Tiempo de preparación en minutos |
| `cook_time_min` | PositiveInteger | Tiempo de cocción en minutos |
| `shelf_life_value` | PositiveInteger | Vida útil numérica |
| `shelf_life_unit` | CharField | Unidad de vida útil (`dias` / `meses`) |
| `final_photo` | ImageField | Foto del plato terminado |

### `IngredientLine`
Ingrediente vinculado a una receta, con grupo, cantidad, unidad y nota opcional. Ordenable.

### `ProductionStep`
Paso de producción con título, instrucción y tip técnico. Ordenable.

---

## API REST

Base URL: `http://localhost:8000/api/`

| Método | Endpoint | Acción |
|---|---|---|
| `GET` | `/api/` | Health check de la API |
| `GET` | `/api/recipes/` | Listar todas las fichas |
| `POST` | `/api/recipes/` | Crear nueva ficha |
| `GET` | `/api/recipes/{id}/` | Detalle de una ficha |
| `PUT` | `/api/recipes/{id}/` | Actualizar ficha completa |
| `DELETE` | `/api/recipes/{id}/` | Eliminar ficha |
| `GET` | `/api/recipes/{id}/sheet_html/` | HTML de exportación A4 |

La creación y edición soporta tanto `application/json` como `multipart/form-data` (necesario para subir la foto).

---

## Cómo ejecutar en local

### Requisitos previos
- Python 3.12+
- Node.js 20+

### Backend

```bash
cd backend

# Crear y activar entorno virtual
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux

pip install -r requirements.txt

python manage.py migrate
python manage.py runserver
# → API disponible en http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → App disponible en http://localhost:5173
```

---

## Exportación a PDF

1. Guarda o edita una receta en el formulario.
2. Haz clic en **Descargar PDF** (o en el botón PDF de la lista).
3. Se abre una nueva ventana con la ficha renderizada en A4.
4. El diálogo de impresión del navegador se lanza automáticamente.
5. Selecciona **Guardar como PDF** en el destino de impresión.

> La ficha está diseñada para escala 100 % en papel A4, sin márgenes adicionales del navegador.

---

## Categorías de recetas soportadas

Plato Fuerte · Entrante · Aderezos y Salsas · Sopas y Cremas · Ensaladas · Postres · Panes y Masas · Bebidas · Fondos y Caldos · Guarniciones · Tapas y Aperitivos · Snacks · Fermentados · Pre-elaborados

---

## Roadmap

- [ ] Escalado de cantidades por número de raciones
- [ ] Costeo de insumos por receta
- [ ] Múltiples páginas para recetas largas
- [ ] Roles de usuario (chef, admin, operaciones)
- [ ] Deploy en producción con PostgreSQL y almacenamiento en nube

---

<div align="center">
  <sub>Desarrollado con Django · React · Tailwind CSS</sub>
</div>
