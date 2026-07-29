# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Personal de cocina de restaurante** (cocineros, jefes de partida): consultan y editan fichas técnicas durante el servicio o la preparación (mise en place). Entorno real de cocina: prisa, manos ocupadas, superficies de acero, poca tolerancia a interfaces lentas o ambiguas. Muchos consultan desde móvil/tablet en la línea.
- **Propietarios / responsables de restaurante** (rol Premium): crean, editan y eliminan recetas; gestionan usuarios de su restaurante, contacto y logo.
- **Superadministrador de la plataforma** (el desarrollador, WeltBrave): da de alta restaurantes, asigna planes y usuarios, ve todos los clientes.

## Product Purpose

RecipeForge es un SaaS multi-restaurante para crear y gestionar **fichas técnicas de recetas** (technical sheets / escandallo) y exportarlas/imprimirlas en A4. Cada restaurante ve solo sus recetas. El éxito es que una cocina pueda estandarizar sus platos: cualquier cocinero abre la ficha y reproduce el plato igual, con cantidades, tiempos, procedimiento y foto claros; y que el dueño imprima fichas impecables para la pared/carpeta de cocina.

## Positioning

Herramienta enfocada y muy bien hecha de **fichas técnicas** (frente a suites amplias tipo Gastro Kaizen). Multi-tenant con prefijo de código por restaurante (p.ej. LT-001 Leche de Tigre, CV103 Ceviche 103), plantillas de ficha intercambiables por restaurante y por receta, y export A4 fiel para cocina real. Diferenciador: fichas legibles en cocina (alto contraste, tipografía grande, imprimibles) + branding propio de cada restaurante en cada ficha.

## Operating Context

- Cliente actual en producción: **Leche de Tigre** (restaurante peruano en Barcelona, España), usándolo activamente (53+ recetas, crece). Próximos: Ceviche 103, y más.
- Flujos: login por usuario → dashboard de recetas del restaurante → editor de receta (ingredientes agrupados, cantidades con decimales por coma, tiempos prep/cocción, foto del plato, categoría) → vista previa de ficha con plantilla → descargar/imprimir A4.
- Superadmin: panel de restaurantes → detalle de restaurante (recetas / usuarios / información + plantilla por defecto + logo).
- Uso en cocina: pantallas grandes de escritorio para gestión y móvil/tablet en la línea. Cierre de sesión por inactividad (15 min).

## Capabilities and Constraints

- Stack: **React 19 + Vite 8 + Tailwind v4** (frontend), **Django 6 + DRF + SimpleJWT** (backend), Neon PostgreSQL, Cloudflare R2 (media), Netlify + Render (hosting gratuito permanente).
- Roles: `basic` (ver + editar recetas existentes), `premium` (crear/editar/eliminar + escandallo/alérgenos/plantillas), `superadmin` (gestión de restaurantes y usuarios).
- Sistema de **plantillas de ficha**: `formal`, `moderna`, `tradicional`, `llamativa`. Cada restaurante tiene una por defecto; cada receta puede usar otra si el plan lo permite. Plantillas no-formales admiten color de acento personalizado (por defecto el actual). La ficha usa logo y nombre del restaurante desde su perfil.
- **Export/impresión siempre en A4 portrait** (no Carta), con fondos de color impresos (`print-color-adjust: exact`).
- Decimales con **coma** (1,50), sin ceros sobrantes; inputs `inputMode="decimal"`.
- Roadmap (no aún construido): escandallo (coste/food cost), 14 alérgenos UE obligatorios, sub-recetas, responsive completo + PWA instalable, suscripción (manual → Stripe).
- Idioma de toda la interfaz: **español**.

## Brand Commitments

- Nombre: **RecipeForge**. "Forge" (fragua) es intencional → metáfora de fuego + forjar.
- Logo de marca: `src/assets/logorecipe.png` (llama). Variantes en assets: `icon-color-1024.png`, `icon-white-*.png`, `lockup-color.png`, `lockup-white-on-dark.png`, `favicon-32.png`.
- **"Powered by WeltBrave"** debe aparecer (componente en `src/components/branding`). WeltBrave es el estudio/desarrollador.
- Logo de cada restaurante (subido, en R2) aparece en su cabecera y en sus fichas.
- Video de fondo del login: `src/assets/wokvideo.mp4` (cocineros/wok). Petición previa del usuario: en el login dejar **solo el video, ligeramente oscurecido**, sin filtros de color ni animaciones de iconos.

## Evidence on Hand

- Producto real desplegado y en uso (recipe-forge.netlify.app + recipeforge-api.onrender.com). Datos reales de recetas de Leche de Tigre. NO fabricar testimonios, métricas, número de clientes ni precios en la UI.
- Assets reales en `src/assets/`: `logorecipe.png`, `wokvideo.mp4`, `hero.png`, logos e iconos de marca, `LDTlogo.png`/`ldt.png` (logo del cliente).
- Fuentes ya cargadas: DM Sans, DM Mono, Playfair Display, Lora, Bebas Neue.

## Product Principles

1. **Legible en cocina primero.** Alto contraste, tipografía grande, jerarquía clara; debe leerse de un vistazo con prisa, manos ocupadas y a distancia. La fidelidad de impresión A4 es sagrada.
2. **Cada restaurante es su propio mundo.** Aislamiento estricto de datos; su nombre, logo y color viven en su experiencia y en sus fichas.
3. **Rápido y sin fricción.** Editor directo, feedback inmediato, nada de pasos ceremoniales. La cocina no espera.
4. **La marca es fuego forjado.** RecipeForge = fragua: fuego (calor, brasa, energía) y acero inoxidable (limpieza, precisión, cocina profesional). El branding se expresa en detalles precisos, no en ruido.
5. **No mentir en la interfaz.** Sin datos, cifras ni afirmaciones inventadas; solo contenido real del restaurante.

## Accessibility & Inclusion

- Legibilidad en condiciones reales de cocina (distancia, prisa, posible poca luz o reflejos en pantallas): contraste alto, objetivos táctiles amplios para móvil/tablet en la línea.
- Interfaz en español.
