# RecipeForge — Plan de conversión a SaaS

> Documento de contexto para Claude Code. Vive **solo** en el repo de RecipeForge.
> No mezclar con Vicente Viajes ni ningún otro proyecto.

---

## 1. Qué es RecipeForge (visión SaaS)

App multi-inquilino (multi-tenant) para restaurantes: fichas técnicas de cocina
en A4, escandallos con coste por ración, alérgenos y acceso multiusuario en cocina.
Modelo de negocio: **suscripción mensual por local** + cuota de implantación única.

Stack actual: React 19 + Vite + Tailwind (frontend) · Django + DRF + PostgreSQL
(backend) · Cloudflare R2 (imágenes).

---

## 2. Dominios

### Estado ACTUAL (fase de arranque / demo primer cliente)
- **Web app:** `https://recipe-forge.netlify.app/` (frontend en Netlify).
  Es un único deploy: al iniciar sesión en el login, el usuario accede a **toda la
  funcionalidad** (recetas, escandallos, costes, roles, PDF... todo lo útil ya operativo).
- **Backend:** Django + DRF en Render.
- Objetivo de esta fase: que el primer cliente (Leche de Tigre) entre por el login y
  vea el producto COMPLETO funcionando de punta a punta. No hay landing separada todavía;
  lo que importa es que la app esté 100% usable tras el login.

### Estado OBJETIVO (migración a los pocos días, cuando la demo esté validada)
- `recipeforge.es`            → Landing comercial (marketing, ventas). Estática.
- `app.recipeforge.es`        → La aplicación. **Login único para TODOS los clientes.**
- `api.recipeforge.es`        → Backend Django (Render).

Migración = cambiar el dominio del frontend de Netlify a Cloudflare Pages / `recipeforge.es`
y mover el backend a `api.recipeforge.es`. Nada de la lógica de la app cambia; solo el dominio.

**Importante en ambas fases:** NO hay subdominio por cliente. Nada de
`lechedetigre.recipeforge.es`. El aislamiento lo hace el LOGIN, no el subdominio (sección 4).
Todos los restaurantes entran por la MISMA URL; el backend resuelve el `Membership` del
usuario autenticado y carga solo los datos de su restaurante.

---

## 3. Planes, features y límites de usuarios

| Plan     | €/mes | Usuarios | Incluye |
|----------|-------|----------|---------|
| Básico   | 19    | 1 (solo owner) | Fichas A4 ilimitadas, PDF, 1 local |
| Pro      | 39    | Hasta 8 + **viewers ilimitados** en cocina | Todo Básico + multiusuario, modo consulta, roles/permisos, marca, historial de versiones |
| Business | 69    | Hasta 20 + multi-local | Todo Pro + escandallos, alérgenos automáticos, panel de food cost, multi-local |

- Implantación inicial: 250–600 € (carga y maquetación de recetas del cliente).
- Prueba gratis: 14 días. Facturación anual con 2 meses gratis.
- **Los viewers (cocineros) no cuentan hacia el tope** si el plan tiene viewers
  ilimitados: son quienes hacen que el equipo use la app a diario (reduce churn).
- Usuarios extra como **add-on** (packs) antes de forzar el salto de plan.
- El límite se comprueba en el **backend** al invitar (rechaza con mensaje claro).

---

## 4. Multi-tenancy: aislamiento de datos (CRÍTICO)

**Modelo elegido: BDD y esquema compartidos, aislamiento por fila (`tenant_id`).**
NO una base de datos por cliente. Un solo backend sirve a todos los restaurantes.

### Modelos base
- `Restaurant` → el tenant (inquilino).
- `Membership` → une `User` ↔ `Restaurant` + `Role` + `title` (cargo, texto libre).
- **Todo** modelo de datos (`Recipe`, `Ingredient`, `Escandallo`, `Image`...) lleva
  `restaurant = ForeignKey(Restaurant)`.

### Reglas de oro (no negociables)
1. El aislamiento se aplica **SIEMPRE en el backend**, nunca confiando en el frontend.
2. Todo queryset se filtra por el restaurante del usuario autenticado, que sale del
   **token**, nunca del cuerpo de la petición.
3. **Nunca** aceptar `restaurant_id` desde el cliente. Lo pone el servidor.
4. En retrieve/update/delete, si el objeto no es de su restaurante → **404, no 403**.
5. Imágenes en R2 con prefijo por tenant: `restaurants/{id}/recipes/...`, servidas
   por el backend.
6. Escribir un **test** de aislamiento: usuario del restaurante A recibe 404 al pedir
   una receta del restaurante B. Ese test es el seguro anti-fugas.
7. Capa extra opcional (más adelante): PostgreSQL Row-Level Security (RLS).

### Patrón base de vistas
```python
class TenantScopedViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return super().get_queryset().filter(
            restaurant=self.request.user.membership.restaurant
        )
    def perform_create(self, serializer):
        serializer.save(restaurant=self.request.user.membership.restaurant)
```

Ver archivos `models.py` y `permissions_and_views.py` para la implementación completa.

---

## 5. Roles y permisos dentro de cada restaurante

**Separar dos conceptos:**
- **Cargo (`Membership.title`):** chef ejecutivo, sous chef, cocinero, coctelería…
  Es una ETIQUETA. No controla permisos.
- **Rol (`Role`):** lo que la persona PUEDE hacer. Es lo que decide accesos.

**Permisos por FLAGS booleanos** en el modelo `Role` (`can_view_escandallo`,
`can_edit_recipes`, `can_manage_users`…). Así un cliente puede, p.ej., permitir que
sus editores vean el coste activando un flag, sin tocar código.

### 4 roles por defecto (se crean al dar de alta el restaurante)
| Rol | Quién | Recetas | Escandallo (coste) | Usuarios/Facturación |
|-----|-------|---------|--------------------|----------------------|
| **Owner**   | Dueño / gerente | Todo | Ver y editar | Sí |
| **Manager** | Chef ejecutivo / sous chef | Todo | Ver y editar | No |
| **Editor**  | Jefe de partida | Editar (no crear/borrar) | **NO ve** | No |
| **Viewer**  | Cocinero / coctelero / línea | Solo consulta | **NO ve** | No |

### Regla crítica del escandallo
El coste/rentabilidad **se oculta en el BACKEND**, no solo en el frontend. Si el rol
no tiene `can_view_escandallo`, la API **ni siquiera devuelve** esos campos (el
serializer los omite). Ocultarlo con CSS es una fuga: se lee en las devtools.

Caso resuelto: el cocinero (viewer) abre la ficha en la tablet y ve ingredientes y
elaboración, pero el bloque de escandallo no existe para él ni en la API ni en pantalla.

---

## 6. Login y onboarding

**AHORA (Fase 0 · demo en Netlify):** el alta de Leche de Tigre la haces TÚ a mano en
`recipe-forge.netlify.app`. Creas su `Restaurant` + usuario `owner` + sus recetas reales
cargadas, y le das el login. Entra y ve el producto completo funcionando. Sin self-service
ni Stripe todavía.

### Alta de clientes — dos fases
**Fase 1 — Manual (primeros ~5-10 clientes).** Al cerrar venta, crear `Restaurant`
+ usuario `owner` desde el admin de Django y enviar invitación. Sirve para aprender
qué falla en el onboarding.

**Fase 2 — Self-service automático (cuando el alta manual quite tiempo).**
1. Dueño pulsa "Empieza gratis 14 días" en la landing.
2. Formulario: nombre del restaurante, email, contraseña.
3. Backend crea al vuelo: `Restaurant` (tenant vacío) + usuario `owner` + roles por
   defecto + contador de prueba de 14 días.
4. Entra directo a su portal vacío, listo para cargar recetas.
5. A los 14 días: sin tarjeta → cuenta limitada/pausada. Con pago (Stripe) → activa.

Automatización Fase 2: registro que crea tenant + Stripe + correos automáticos.

---

## 7. Infraestructura y cuándo pagar

Regla: **la infra la paga el cliente, no el bolsillo.** Detonante = primer cliente de pago.

| Servicio | Ahora (gratis) | Al 1er cliente de pago |
|----------|----------------|------------------------|
| Backend (Render)    | Free (se duerme 15 min, cold start 30-60s) | **Starter $7/mes** (always-on) |
| BDD (Neon)          | Free (100 CU-h, 0.5GB, scale-to-zero) | **Launch** (por uso, ~5-10€/mes) |
| Imágenes (R2)       | Free (10GB + 1M/10M ops, egress $0) | Sigue gratis mucho tiempo |
| Frontend            | Netlify free / **Cloudflare Pages** (ilimitado) | Sigue gratis |
| Dominio             | — | Comprar YA (~10-12€/año, Cloudflare Registrar) |

- **Coste total sirviendo a TODOS los clientes: ~15-20€/mes.** La infra NO escala por
  cliente → con 1 cliente a 39€ ya está cubierta 2x. Cada cliente extra es casi todo margen.
- Motivo del Render Starter: un cliente que paga no puede esperar 30-60s a que
  despierte el backend en pleno servicio.

---

## 8. Landing comercial (`recipeforge.es`)

Vende **resultados, no software**. Público: dueños de restaurante (no técnicos).
Tono: directo, plano, en español. Tema visual "forge": carbón + naranja ember
(#191817 / #E33C09), tipografías Space Grotesk (display) + Inter (texto) + Space Mono (datos).
Ver `landing.html` como implementación de referencia.

### Estructura de secciones
1. **Nav** — logo, enlaces (cómo funciona, funciones, precios), CTA "Empieza gratis".
2. **Hero** — titular de resultado ("Estandariza tu cocina y descubre cuánto ganas
   con cada plato"), subtítulo, CTA doble (prueba 14 días / ver cómo funciona), visual
   de ficha A4 con badge de food cost. Nota: "sin tarjeta · cargamos tus recetas por ti".
3. **Strip** — para quién es (restaurantes, catering, grupos, cocina central).
4. **Problema** — 4 dolores: recetas en la cabeza, márgenes a ciegas, formación lenta,
   papeles desfasados. Fondo oscuro para contraste emocional.
5. **Solución (3 bloques)** — Estandariza / Controla el coste / Alinea al equipo.
6. **Cómo funciona (3 pasos)** — Carga tus recetas → Equipo consulta en cocina →
   Controla rentabilidad.
7. **Funciones** — fichas A4, escandallos, alérgenos, roles, marca, PDF, multiusuario,
   multi-local, datos aislados.
8. **Testimonio** — Leche de Tigre (PLACEHOLDER: rellenar tras implantación).
9. **Precios** — 3 planes (Pro destacado) + cuota de implantación + prueba gratis.
10. **FAQ** — no técnico / datos aislados / cocinero no ve coste / probar gratis / multi-local.
11. **CTA final** + footer ("Un producto de WeltBrave").

### Principios de copy
- Voz activa, frases cortas, sin jerga técnica.
- Cada sección vende un beneficio, no una feature.
- El botón que dice "Empezar gratis" produce un estado coherente en toda la app.

---

## 9. Checklist para vender a Leche de Tigre (primer cliente)

Mínimo imprescindible para la reunión (NO hace falta el producto entero):

**Imprescindible (sin esto no hay demo):**
- [ ] Login funcional en `app.recipeforge.es`.
- [ ] Restaurante "Leche de Tigre" creado con datos y logo.
- [ ] 8-10 de SUS recetas reales cargadas (no genéricas).
- [ ] Vista de ficha A4 + exportación/impresión a PDF.
- [ ] Escandallo de un plato suyo calculado (ej. Ají de Gallina, margen real).
- [ ] Roles en vivo: demostrar que un viewer NO ve el coste y el chef sí.
- [ ] Modo consulta usable en móvil/tablet.

**Muy recomendable (cierra la venta):**
- [ ] Alérgenos visibles en la ficha (obligación legal).
- [ ] Su marca/logo en las fichas.
- [ ] Usuarios de ejemplo (dueño + cocinero) para demostrar accesos.

**NO necesario para esta primera venta (dejar para después):**
- Self-service / registro automático · Stripe · multi-local · packs de usuarios · correos.
- A Leche de Tigre se le puede cobrar por transferencia al principio.

**Venta:** oferta de "cliente fundador" (precio reducido bloqueado de por vida +
implantación gratis) a cambio de testimonio, caso de estudio y 2-3 presentaciones a
otros restaurantes. Objetivo real del primer cliente: caso de estudio + referidos.

---

## 10. Orden de construcción (roadmap técnico)

> **PRIORIDAD AHORA (Fase demo en Netlify):** que un usuario entre por el login de
> `recipe-forge.netlify.app` y tenga TODA la funcionalidad operativa de punta a punta.
> Esto son los pasos 1–6. El dominio propio (`recipeforge.es`) y la automatización de
> venta (7–10) vienen DESPUÉS de validar la demo con el primer cliente.

1. **Auth + tenancy base:** modelos `Restaurant`, `Membership`, `Role` (flags), roles
   por defecto. `TenantScopedViewSet`. **Test de aislamiento A↔B (404).** ← empezar aquí.
2. Migrar modelos de recetas para que lleven `restaurant` FK.
3. **Login en el frontend (hoy `recipe-forge.netlify.app`)** + carga de datos del tenant.
   Tras iniciar sesión, el usuario accede a todas las secciones según su rol.
4. Roles en UI + serializer que oculta escandallo según `can_view_escandallo`.
5. Imágenes R2 con prefijo por tenant, servidas por backend.
6. Módulo escandallos (Business): coste/ración, food cost, PVP recomendado.
   ← con esto la app está COMPLETA para la demo al primer cliente.
7. **Migración de dominio:** frontend a Cloudflare Pages/`recipeforge.es`, backend a
   `api.recipeforge.es`. Solo cambia el dominio; la lógica no se toca.
8. Landing comercial en `recipeforge.es` (`landing.html` como base).
9. Self-service: registro auto-crea tenant + prueba 14 días.
10. Stripe: cobro, planes, gestión de prueba/suscripción.
11. Correos automáticos (bienvenida, fin de prueba, avisos).

Del 1 al 6 = **app completa y vendible manualmente en Netlify** (suficiente para la demo
y venta a Leche de Tigre). Del 7 al 11 = dominio propio + automatización de la venta.

---

## 11. Cómo pasar esto a Claude Code

1. Guardar este archivo como `CLAUDE.md` (o `docs/SAAS.md` referenciado) en la **raíz
   del repo de RecipeForge**. Incluir también `models.py` y `permissions_and_views.py`
   como referencia de implementación.
2. `git commit` del estado actual antes de que Claude Code toque nada.
3. Pedir a Claude Code que empiece por el **paso 1 del roadmap** (auth + tenancy +
   test de aislamiento) y que muestre el resumen de cambios antes de aplicarlos.
4. Mantener separado de Vicente Viajes: no compartir contexto, sesiones ni ramas.
