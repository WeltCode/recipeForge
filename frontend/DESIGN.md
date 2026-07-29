# Design

<!-- impeccable:design-schema 1 -->

## Direction: "La Línea" (the kitchen line / pass)

**THESIS.** Una app de fichas técnicas construida como la LÍNEA de una cocina profesional: la zona caliente oscura arriba (campana, salamandra, lámparas de calor al rojo) sobre la superficie de acero inoxidable brillante abajo, donde se trabaja. Rechaza el dashboard SaaS neutro de tarjetas flotantes iguales. Mezcla de "El Pase" (acero limpio + tablero de comandas vivo, tipo KDS/split-flap) y "La Fragua" (zona caliente oscura con brasa), unidos por el FUEGO como calor vivo.

**OWN-WORLD.** Dos zonas materiales que conviven en cada pantalla:
- **Zona caliente (oscura)** — cabeceras, nav, login, cabeceras de restaurante. Carbón cálido casi negro con resplandor de lámpara de calor (ámbar) y brasa viva. Aquí vive el fuego y el drama.
- **Superficie de trabajo (clara)** — el contenido: **acero inoxidable cepillado** claro con textura sutil de cepillado vertical, biseles/filos brillantes, juntas. Sobre ella, **celdas de datos negro mate** con mayúsculas condensadas (voz de tablero split-flap): filas de recetas/restaurantes leídas como un tablero de pase/KDS (CÓDIGO · NOMBRE · ESTADO · TIEMPO).
- El **filo del pase**: una línea de acero biselada brillante marca la transición entre zona caliente y superficie.

## Color

Fields, no acentos sueltos. La zona oscura ocupa regiones enteras (cabeceras); el acero ocupa el cuerpo.

- **Carbón / zona caliente:** `#0e0b09` → `#1a1310` (mesh cálido). Resplandores: lámpara ámbar `#ff9a4d`/`#ffb066` (radiales suaves), brasa `#e8531f`.
- **Acero cepillado:** ground `#dfe3e7`; panel `#eef1f3`/`#f5f7f8`; cepillado = franjas verticales muy sutiles (±2% luminancia); filo/bisel highlight `#ffffff` a 60% arriba, sombra `#aab2b8` abajo.
- **Celda de datos:** `#17130f` (negro mate cálido), texto `#f4efe8` condensado.
- **Fuego / acción (brasa):** primary `#e8531f`; hover `#ff6a2c`; deep `#c8371a`. Los botones de acción y lo "caliente/activo" son brasa.
- **Lámpara de calor (ámbar):** `#ff9a3d` glow para estado activo / "en carta" (punto que brilla).
- **Oro de fragua:** `#d89b3a` para detalles finos/premium (líneas, iconos de acento), nunca como texto de cuerpo.
- **Tinta sobre acero:** principal `#1c1611`; secundaria `#6a635c` (nunca gris frío puro).
- **Estados:** activo/en carta = lámpara ámbar; borrador = gris acero `#8a9098`; peligro/eliminar = rojo profundo `#b03418`.

Contraste: texto sobre acero ≥4.5:1 (tinta oscura); texto sobre celda negra = crema. Secundario tintado cálido, nunca gris frío.

## Type

- **Condensada (voz del tablero):** `Oswald` — cabeceras, códigos (`LT-001`), etiquetas de estado, kickers, números grandes de gauge. Mayúsculas, tracking apretado. Es la identidad; llévala a todo lo que sea "rótulo de línea".
- **UI / cuerpo:** `Inter` — texto de interfaz, formularios, párrafos. Workhorse legible (apropiado para Operate).
- **Readout numérico:** `DM Mono` SOLO para medidas reales (cantidades, tiempos, pesos, food cost) — feel de instrumento. Nunca mono como disfraz "técnico" de texto normal.
- **Fichas A4 (plantillas de impresión):** conservan su propio sistema (`Playfair Display`, `Lora`, `Bebas Neue`) por plantilla — son un artefacto imprimible aparte del shell de la app.
- Display máx ~6rem; tracking floor −0.04em; cabeceras balanceadas.

## Composition & components

- **Cabeceras** = zona caliente oscura (`rf-hot`) con glow de lámpara ámbar + brasa (`Embers`). Terminan en el **filo del pase** (bisel de acero brillante).
- **Contenido** = superficie de acero (`rf-steel-surface`).
- **Listas (recetas/restaurantes)** = filas de tablero: celda negra con código condensado + lámpara de estado, nombre, tiempo en mono. Alternativa en grid: **tarjetas-plato** (marco de acero, franja negra de cabecera con código, foto object-contain, botón brasa). Nunca tarjetas SaaS flotantes idénticas como estructura de página.
- **Stats** = **gauges de fogón**: celda negra/acero con número condensado grande + acento ámbar/brasa (no la plantilla "número gigante + label + acento" repetida; cada gauge es un instrumento del fogón).
- **Botones:** primario = brasa con glow de calor sutil; secundario = filo de acero (outline); peligro = rojo profundo. Nombran su acción.
- **Inputs:** pozos de acero embutidos (inset), foco = anillo brasa.
- **Lámpara de estado:** punto que brilla — ámbar (activo/en carta), gris acero (borrador).

## Motion

- Un momento firmado: **flip split-flap** en el código de la receta / número de gauge al cargar o actualizar (rápido, escalonado leve). Respeta `prefers-reduced-motion` (aparece sin flip).
- Brasa viva (`Embers`) solo en las zonas calientes oscuras, acotada.
- Ease-out exponencial desde un estado ya visible. Nada de una misma entrada idéntica en cada sección.

## Depth

Sombras con offset + blur reales (nunca halo de color a offset 0). El acero usa bisel (highlight arriba / sombra abajo) para relieve físico.

## Responsive

Móvil/tablet en la línea: filas de tablero colapsan a celdas apiladas; cabecera caliente se comprime; objetivos táctiles ≥44px. La ficha exporta siempre A4 portrait fiel.

## Bans (propios de este mundo)

- Sin **texto con gradiente** (énfasis por peso/tamaño).
- Sin tarjetas iguales icono+título+texto como estructura de página.
- Sin cristal/blur decorativo; el acero es material real (cepillado + bisel), no glassmorphism.
- Sin claro/oscuro por categoría: las zonas se eligen por la escena (caliente arriba, superficie de trabajo abajo).
