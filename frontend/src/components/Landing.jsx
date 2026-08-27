/*
  DIRECTION · Landing "Vitrina Clara" (Persuade) — glass claro + cocina viva
  THESIS. Web de ventas luminosa con alma de cocina real: fondo claro cálido,
  vídeo de cocina al wok + vapor, vidrio esmerilado, iconos dibujados a carbón
  y mucho detalle real de la app (ficha FORMAL, escandallo, carta QR). Trilingüe.
  OWN-WORLD. #fdfaf5 + blobs de calor; glass frosted-white real; acento brasa
  #e8531f/#ff7a34 + oro; Bricolage display + Inter + DM Mono; iconos propios
  con trazo de lápiz carbón; vapor y brasas animados. Nada de plantilla IA.
  STORY. Un dueño/chef llega, siente la cocina, ve qué recibe, se antoja y
  empieza sus 30 días. En su idioma (ES/CA/EN).
*/
import { useEffect, useRef, useState } from 'react'
import Logo from './Logo'
import PoweredByWeltBrave from './branding/PoweredByWeltBrave'
import wokVideo from '../assets/wokvideo.mp4'
import dishPhoto from '../assets/dish-suquet.jpg'

const CONTACT = { whatsapp: '34600750758', email: 'weltcode@gmail.com' }
const APP_URL = 'https://app.recipeforge.es'
const waMsg = (t) => `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(t)}`

const C = { ink: '#241a12', inkSoft: '#6f6152', line: '#eee2d0', ember: '#e8531f', emberHi: '#ff7a34', emberDeep: '#c8371a', gold: '#c8870a' }
const DISP = "'Bricolage Grotesque', system-ui, sans-serif"
const MONO = "'DM Mono', ui-monospace, monospace"

/* ─────────────── i18n ES / CA / EN ─────────────── */
const T = {
  es: {
    nav: ['Cómo funciona', 'Módulos', 'Planes', 'Preguntas'], access: 'Acceder', trial: 'Prueba gratis',
    heroTitleA: 'Estandariza tu cocina.', heroTitleB: 'Controla el coste', heroTitleC: ' de cada plato.',
    heroSub: 'Fichas técnicas, escandallo, inventario y ', heroSubStrong: 'carta digital con QR', heroSubEnd: ', en una sola app. Te cargamos tus recetas y empiezas hoy.',
    ctaTrial: 'Empieza tus 30 días gratis', ctaPlans: 'Ver planes', trust: ['Fichas', 'Escandallo', 'Carta QR', 'PWA'],
    showKick: ['Fichas técnicas', 'Escandallo · food cost', 'Carta digital con QR'],
    showTitle: ['Fichas que cualquiera reproduce igual', 'El coste real de cada plato, sin calcular a ojo', 'Tu carta en la mesa con un código QR'],
    showBody: ['Ingredientes por partida, proceso paso a paso, tiempos y foto. Export A4 impecable para la pared de cocina.', 'A partir de tus formatos de compra, RecipeForge calcula el coste por ración y el food cost. Sabes cuánto ganas con cada plato.', 'Publica tu carta y tus especiales. El comensal escanea y ve todo con alérgenos. La cambias cuando quieras, sin reimprimir.'],
    showCta: 'Probarlo gratis',
    modKick: 'Y además', modTitle: 'Todo lo que tu cocina necesita',
    mods: [['Inventario y proveedores', 'Insumos con peso, pack y stock mínimo; proveedores y precios de compra siempre a mano.'], ['Multiusuario y roles', 'Tu equipo, cada uno con su rol: dueño, gestor, cocina. Permisos claros por persona.'], ['Alérgenos y PWA', 'Los 14 alérgenos obligatorios y una app instalable en móvil y tablet para la línea.']],
    stepKick: 'Empezar es fácil', stepTitle: 'De tus recetas al control en 3 pasos',
    steps: [['Cargamos tus recetas', 'Nos das lo que tienes (fotos, Excel, libretas) y montamos tus fichas por ti.'], ['Controlas coste e inventario', 'Ves el food cost de cada plato, gestionas insumos y proveedores, estandarizas.'], ['Publicas tu carta con QR', 'Tu carta y tus especiales en la mesa con un QR. La cambias cuando quieras.']],
    whyKick: 'Por qué RecipeForge', whyTitle: 'Competimos con producto, no con humo',
    whys: [['Diseño pensado para cocina', 'Alto contraste, legible con prisa. Instalable como app en móvil y tablet.'], ['Soporte local y directo', 'Nos escribes por WhatsApp y construimos lo que tu cocina necesita.'], ['Onboarding hecho por nosotros', 'No empiezas de cero: cargamos tus recetas para que veas valor el primer día.'], ['Profundidad real', 'Escandallo, inventario, proveedores y roles de verdad, no una maqueta.']],
    priceKick: 'Precios claros', priceTitle: 'Elige tu plan. Empieza con 30 días gratis.', annual: 'Anual · ahorra', monthly: 'Mensual',
    plansWho: ['Para probarlo con tus propias recetas', 'Para un cocinero, sus recetas y su coste', 'Para un restaurante con equipo', 'Para grupos y operaciones serias'],
    plansCta: ['Empieza gratis', 'Solicitar', 'Empieza 30 días', 'Solicitar'],
    plansFeats: [['Acceso guiado 30 días', 'Cargamos tus recetas contigo', 'Sin tarjeta, sin compromiso'], ['1 usuario · recetas ilimitadas', 'Escandallo y food cost', 'Alérgenos y export A4', 'PDF sin marca'], ['Todo lo de Básico', 'Multiusuario y roles', 'Plantillas personalizables', 'Inventario', 'Carta digital con QR'], ['Todo lo de Premium', 'Proveedores y precios de compra', 'Hasta 20 usuarios', 'Roles avanzados']],
    free: 'Gratis', freeNote: '30 días · sin tarjeta', ivaNote: (v, a) => `+ IVA (${v} € con IVA)${a ? ' · pago anual' : ''}`, onlyAnnual: 'solo anual', featured: 'Más elegido',
    priceFoot: 'Todos los precios son + IVA. El plan anual equivale a ~2 meses gratis frente al mensual.',
    faqKick: 'Preguntas frecuentes', faqTitle: 'Lo que suelen preguntarnos',
    faqs: [['¿Tengo que migrar mis recetas yo mismo?', 'No. Cargamos tus recetas por ti como parte del arranque, para que veas valor desde el primer día.'], ['¿Funciona en el móvil y la tablet?', 'Sí. RecipeForge es una app instalable (PWA) pensada para usarse en la línea de cocina.'], ['¿Mis datos son míos y están aislados?', 'Sí. Cada restaurante trabaja en su propio espacio aislado. Puedes exportar e imprimir tus fichas.'], ['¿Puedo cambiar de plan o cancelar?', 'Sí, sin permanencia. Empiezas por la prueba de 30 días y decides con calma.'], ['¿Qué incluye la prueba de 30 días?', 'Acceso para probar la app con tus propias recetas, sin coste y sin tarjeta. Te la montamos nosotros.'], ['¿Cómo empiezo?', 'Escríbenos por WhatsApp o email. Te montamos la prueba y cargamos tus primeras recetas contigo.']],
    ctaTitle: 'Enciende tu cocina hoy', ctaSub: 'Empieza tus 30 días gratis. Cargamos tus recetas contigo y ves el coste real de tus platos desde el primer día.', ctaEmail: 'Escríbenos por email',
    footTag: 'Software para estandarizar la cocina profesional: fichas técnicas, escandallo y carta QR.', footAccess: 'Acceder a la app',
    waTip: '¡Cocinemos juntos!', mockEx: 'Ejemplo', mockIng: 'Ingredientes', mockProc: 'Proceso', mockCosteR: 'Coste ración', mockPrice: 'Precio de venta', mockFC: 'Food cost', mockScan: 'Escanea en la mesa', mockScanSub: 'Se actualiza al instante, sin reimprimir.', mockSheet: 'Ficha técnica de producción',
    waMsgTrial: 'Hola, quiero empezar mis 30 días de prueba de RecipeForge para mi restaurante.', waMsgDemo: 'Hola, me interesa RecipeForge. ¿Podemos ver una demo?',
  },
  ca: {
    nav: ['Com funciona', 'Mòduls', 'Plans', 'Preguntes'], access: 'Entrar', trial: 'Prova gratis',
    heroTitleA: 'Estandarditza la teva cuina.', heroTitleB: 'Controla el cost', heroTitleC: ' de cada plat.',
    heroSub: 'Fitxes tècniques, escandall, inventari i ', heroSubStrong: 'carta digital amb QR', heroSubEnd: ', en una sola app. Et carreguem les teves receptes i comences avui.',
    ctaTrial: 'Comença els teus 30 dies gratis', ctaPlans: 'Veure plans', trust: ['Fitxes', 'Escandall', 'Carta QR', 'PWA'],
    showKick: ['Fitxes tècniques', 'Escandall · food cost', 'Carta digital amb QR'],
    showTitle: ['Fitxes que qualsevol reprodueix igual', 'El cost real de cada plat, sense calcular a ull', 'La teva carta a taula amb un codi QR'],
    showBody: ['Ingredients per partida, procés pas a pas, temps i foto. Exportació A4 impecable per a la paret de cuina.', 'A partir dels teus formats de compra, RecipeForge calcula el cost per ració i el food cost. Saps quant guanyes amb cada plat.', 'Publica la teva carta i els teus especials. El comensal escaneja i ho veu tot amb al·lèrgens. La canvies quan vulguis, sense reimprimir.'],
    showCta: 'Provar-ho gratis',
    modKick: 'I a més', modTitle: 'Tot el que la teva cuina necessita',
    mods: [['Inventari i proveïdors', 'Insums amb pes, pack i estoc mínim; proveïdors i preus de compra sempre a mà.'], ['Multiusuari i rols', "El teu equip, cadascú amb el seu rol: propietari, gestor, cuina. Permisos clars per persona."], ['Al·lèrgens i PWA', 'Els 14 al·lèrgens obligatoris i una app instal·lable a mòbil i tauleta per a la línia.']],
    stepKick: 'Començar és fàcil', stepTitle: 'De les teves receptes al control en 3 passos',
    steps: [['Carreguem les teves receptes', 'Ens dones el que tens (fotos, Excel, llibretes) i muntem les teves fitxes per tu.'], ['Controles cost i inventari', 'Veus el food cost de cada plat, gestiones insums i proveïdors, estandarditzes.'], ['Publiques la teva carta amb QR', 'La teva carta i els teus especials a taula amb un QR. La canvies quan vulguis.']],
    whyKick: 'Per què RecipeForge', whyTitle: 'Competim amb producte, no amb fum',
    whys: [['Disseny pensat per a cuina', 'Alt contrast, llegible amb pressa. Instal·lable com a app a mòbil i tauleta.'], ['Suport local i directe', 'Ens escrius per WhatsApp i construïm el que la teva cuina necessita.'], ['Onboarding fet per nosaltres', 'No comences de zero: carreguem les teves receptes perquè vegis valor el primer dia.'], ['Profunditat real', 'Escandall, inventari, proveïdors i rols de veritat, no una maqueta.']],
    priceKick: 'Preus clars', priceTitle: 'Tria el teu pla. Comença amb 30 dies gratis.', annual: 'Anual · estalvia', monthly: 'Mensual',
    plansWho: ['Per provar-ho amb les teves receptes', 'Per a un cuiner, les seves receptes i el seu cost', 'Per a un restaurant amb equip', 'Per a grups i operacions serioses'],
    plansCta: ['Comença gratis', 'Sol·licitar', 'Comença 30 dies', 'Sol·licitar'],
    plansFeats: [['Accés guiat 30 dies', 'Carreguem les teves receptes amb tu', 'Sense targeta, sense compromís'], ['1 usuari · receptes il·limitades', 'Escandall i food cost', 'Al·lèrgens i exportació A4', 'PDF sense marca'], ['Tot el del Bàsic', 'Multiusuari i rols', 'Plantilles personalitzables', 'Inventari', 'Carta digital amb QR'], ['Tot el del Premium', 'Proveïdors i preus de compra', 'Fins a 20 usuaris', 'Rols avançats']],
    free: 'Gratis', freeNote: '30 dies · sense targeta', ivaNote: (v, a) => `+ IVA (${v} € amb IVA)${a ? ' · pagament anual' : ''}`, onlyAnnual: 'només anual', featured: 'Més triat',
    priceFoot: 'Tots els preus són + IVA. El pla anual equival a ~2 mesos gratis respecte al mensual.',
    faqKick: 'Preguntes freqüents', faqTitle: 'El que ens solen preguntar',
    faqs: [['He de migrar les meves receptes jo mateix?', 'No. Carreguem les teves receptes per tu com a part de l’arrencada, perquè vegis valor des del primer dia.'], ['Funciona al mòbil i la tauleta?', 'Sí. RecipeForge és una app instal·lable (PWA) pensada per usar-se a la línia de cuina.'], ['Les meves dades són meves i estan aïllades?', 'Sí. Cada restaurant treballa en el seu propi espai aïllat. Pots exportar i imprimir les teves fitxes.'], ['Puc canviar de pla o cancel·lar?', 'Sí, sense permanència. Comences per la prova de 30 dies i decideixes amb calma.'], ['Què inclou la prova de 30 dies?', 'Accés per provar l’app amb les teves receptes, sense cost i sense targeta. Te la muntem nosaltres.'], ['Com començo?', 'Escriu-nos per WhatsApp o email. Et muntem la prova i carreguem les teves primeres receptes amb tu.']],
    ctaTitle: 'Encén la teva cuina avui', ctaSub: 'Comença els teus 30 dies gratis. Carreguem les teves receptes amb tu i veus el cost real dels teus plats des del primer dia.', ctaEmail: 'Escriu-nos per email',
    footTag: 'Programari per estandarditzar la cuina professional: fitxes tècniques, escandall i carta QR.', footAccess: 'Entrar a l’app',
    waTip: 'Cuinem junts!', mockEx: 'Exemple', mockIng: 'Ingredients', mockProc: 'Procés', mockCosteR: 'Cost ració', mockPrice: 'Preu de venda', mockFC: 'Food cost', mockScan: 'Escaneja a taula', mockScanSub: "S'actualitza a l'instant, sense reimprimir.", mockSheet: 'Fitxa tècnica de producció',
    waMsgTrial: 'Hola, vull començar els meus 30 dies de prova de RecipeForge per al meu restaurant.', waMsgDemo: 'Hola, m’interessa RecipeForge. Podem veure una demo?',
  },
  en: {
    nav: ['How it works', 'Modules', 'Plans', 'FAQ'], access: 'Log in', trial: 'Free trial',
    heroTitleA: 'Standardize your kitchen.', heroTitleB: 'Control the cost', heroTitleC: ' of every dish.',
    heroSub: 'Technical recipe sheets, food cost, inventory and a ', heroSubStrong: 'digital QR menu', heroSubEnd: ', in one app. We load your recipes and you start today.',
    ctaTrial: 'Start your 30-day free trial', ctaPlans: 'See plans', trust: ['Recipe sheets', 'Food cost', 'QR menu', 'PWA'],
    showKick: ['Technical recipe sheets', 'Food cost / costing', 'Digital QR menu'],
    showTitle: ['Recipe sheets anyone reproduces identically', 'The real cost of each dish, no guesswork', 'Your menu at the table with a QR code'],
    showBody: ['Ingredients by station, step-by-step process, times and photo. Flawless A4 export for the kitchen wall.', 'From your purchase formats, RecipeForge computes cost per serving and food cost. You know what you earn on every dish.', 'Publish your menu and your specials. Guests scan and see everything with allergens. Change it anytime, no reprinting.'],
    showCta: 'Try it free',
    modKick: 'And more', modTitle: 'Everything your kitchen needs',
    mods: [['Inventory & suppliers', 'Items with weight, pack and minimum stock; suppliers and purchase prices always at hand.'], ['Multi-user & roles', 'Your team, each with their role: owner, manager, kitchen. Clear permissions per person.'], ['Allergens & PWA', 'The 14 mandatory allergens and an installable app for phone and tablet on the line.']],
    stepKick: 'Getting started is easy', stepTitle: 'From your recipes to control in 3 steps',
    steps: [['We load your recipes', 'Give us what you have (photos, Excel, notebooks) and we build your sheets for you.'], ['You control cost & inventory', 'See the food cost of each dish, manage items and suppliers, standardize.'], ['You publish your QR menu', 'Your menu and specials at the table with a QR. Change it whenever you want.']],
    whyKick: 'Why RecipeForge', whyTitle: 'We compete with product, not hype',
    whys: [['Designed for the kitchen', 'High contrast, legible in a rush. Installable as an app on phone and tablet.'], ['Local, direct support', 'You message us on WhatsApp and we build what your kitchen needs.'], ['Onboarding done for you', "You don't start from scratch: we load your recipes so you see value on day one."], ['Real depth', 'Costing, inventory, suppliers and roles for real, not a mockup.']],
    priceKick: 'Clear pricing', priceTitle: 'Pick your plan. Start with 30 days free.', annual: 'Yearly · save', monthly: 'Monthly',
    plansWho: ['To try it with your own recipes', 'For one cook, their recipes and their cost', 'For a restaurant with a team', 'For groups and serious operations'],
    plansCta: ['Start free', 'Request', 'Start 30 days', 'Request'],
    plansFeats: [['Guided 30-day access', 'We load your recipes with you', 'No card, no commitment'], ['1 user · unlimited recipes', 'Costing and food cost', 'Allergens and A4 export', 'Unbranded PDF'], ['Everything in Basic', 'Multi-user and roles', 'Custom templates', 'Inventory', 'Digital QR menu'], ['Everything in Premium', 'Suppliers and purchase prices', 'Up to 20 users', 'Advanced roles']],
    free: 'Free', freeNote: '30 days · no card', ivaNote: (v, a) => `+ VAT (${v} € incl. VAT)${a ? ' · billed yearly' : ''}`, onlyAnnual: 'yearly only', featured: 'Most chosen',
    priceFoot: 'All prices are + VAT. The yearly plan equals ~2 months free vs. monthly.',
    faqKick: 'Frequently asked', faqTitle: 'What people usually ask us',
    faqs: [['Do I have to migrate my recipes myself?', 'No. We load your recipes for you as part of onboarding, so you see value from day one.'], ['Does it work on phone and tablet?', 'Yes. RecipeForge is an installable app (PWA) built to be used on the kitchen line.'], ['Is my data mine and isolated?', 'Yes. Each restaurant works in its own isolated space. You can export and print your sheets anytime.'], ['Can I change plan or cancel?', 'Yes, no lock-in. You start with the 30-day trial and decide calmly.'], ['What does the 30-day trial include?', 'Access to try the app with your own recipes, free and without a card. We set it up for you.'], ['How do I start?', 'Message us on WhatsApp or email. We set up the trial and load your first recipes with you.']],
    ctaTitle: 'Fire up your kitchen today', ctaSub: 'Start your 30-day free trial. We load your recipes with you and you see the real cost of your dishes from day one.', ctaEmail: 'Email us',
    footTag: 'Software to standardize the professional kitchen: technical sheets, food cost and QR menu.', footAccess: 'Go to the app',
    waTip: "Let's cook together!", mockEx: 'Example', mockIng: 'Ingredients', mockProc: 'Process', mockCosteR: 'Cost / serving', mockPrice: 'Sale price', mockFC: 'Food cost', mockScan: 'Scan at the table', mockScanSub: 'Updates instantly, no reprinting.', mockSheet: 'Production recipe sheet',
    waMsgTrial: "Hi, I'd like to start my 30-day RecipeForge trial for my restaurant.", waMsgDemo: 'Hi, I’m interested in RecipeForge. Can we see a demo?',
  },
}
const LANGS = [['es', 'ES', 'Español'], ['ca', 'CA', 'Català'], ['en', 'EN', 'English']]

/* ─────────────── Iconos propios (trazo de carbón) ─────────────── */
const SK = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', filter: 'url(#rf-charcoal)' }
const IcWhisk = ({ s = 26 }) => (<svg width={s} height={s} viewBox="0 0 32 32" {...SK}><path d="M16 3v13" /><path d="M11 6c-2 3-2 7 0 10 M21 6c2 3 2 7 0 10 M13.5 5c-1 4-1 8 0 12 M18.5 5c1 4 1 8 0 12" /><path d="M13 18h6l-1.5 9a2 2 0 0 1-3 0Z" /></svg>)
const IcKnife = ({ s = 26 }) => (<svg width={s} height={s} viewBox="0 0 32 32" {...SK}><path d="M5 20c8-2 15-9 20-16 1 6-1 13-6 17-4 3-9 3-14-1Z" /><path d="M5 20l-2 6 5-2" /></svg>)
const IcPot = ({ s = 26 }) => (<svg width={s} height={s} viewBox="0 0 32 32" {...SK}><path d="M6 13h20v8a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5Z" /><path d="M3 13h26 M9 13V9 M23 13V9" /><path d="M12 5c0 2 1 2 1 4 M17 4c0 2 1 2 1 4 M22 5c0 2 1 2 1 4" /></svg>)
const IcReceipt = ({ s = 26 }) => (<svg width={s} height={s} viewBox="0 0 32 32" {...SK}><path d="M8 3h16v26l-3-2-3 2-3-2-3 2-3-2-1 1z" /><path d="M12 10h8 M12 15h8 M12 20h5" /></svg>)
const IcCoins = ({ s = 26 }) => (<svg width={s} height={s} viewBox="0 0 32 32" {...SK}><ellipse cx="12" cy="9" rx="8" ry="4" /><path d="M4 9v6c0 2.2 3.6 4 8 4s8-1.8 8-4V9" /><ellipse cx="20" cy="21" rx="8" ry="4" /><path d="M12 21v4c0 2.2 3.6 4 8 4s8-1.8 8-4v-4" /></svg>)
const IcBox = ({ s = 26 }) => (<svg width={s} height={s} viewBox="0 0 32 32" {...SK}><path d="M16 3l11 6v14l-11 6-11-6V9Z" /><path d="M5 9l11 6 11-6 M16 15v14" /></svg>)
const IcUsers = ({ s = 26 }) => (<svg width={s} height={s} viewBox="0 0 32 32" {...SK}><circle cx="12" cy="11" r="4" /><path d="M4 27c0-4 4-7 8-7s8 3 8 7" /><path d="M21 8a4 4 0 0 1 0 7 M23 20c3 1 5 3.5 5 7" /></svg>)
const IcLeaf = ({ s = 26 }) => (<svg width={s} height={s} viewBox="0 0 32 32" {...SK}><path d="M27 5C13 5 6 12 6 23c0 2 1 4 1 4s2 1 4 1c11 0 18-7 18-21 0-1-1-2-2-3Z" /><path d="M8 26C14 18 20 13 27 10" /></svg>)
const IcQr = ({ s = 26 }) => (<svg width={s} height={s} viewBox="0 0 32 32" {...SK}><path d="M5 5h8v8H5Z M19 5h8v8h-8Z M5 19h8v8H5Z" /><path d="M19 19h3v3h-3Z M25 19h2 M27 22v3 M19 27h3 M24 25v3" /></svg>)
const IcCloche = ({ s = 26 }) => (<svg width={s} height={s} viewBox="0 0 32 32" {...SK}><path d="M4 24h24 M6 24a10 10 0 0 1 20 0" /><path d="M16 14V9 M13 9h6" /></svg>)
const IcFlame = ({ s = 18 }) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c1 3-1 5-2.5 6.5C8 10 7 11.5 7 14a5 5 0 0 0 10 0c0-2-1-3.5-2-5 .5 1 .5 2 0 3 .3-2-1-4-3-5.5C10.5 8 13 5 12 2Z" /></svg>)
const IcChevron = ({ s = 16 }) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>)
const IcGlobe = ({ s = 16 }) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18" /></svg>)
const IcCheck = ({ s = 16 }) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>)
const IcWhatsApp = ({ s = 30 }) => (<svg width={s} height={s} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16 3.2C8.9 3.2 3.2 8.9 3.2 16c0 2.3.6 4.4 1.7 6.3L3 29l6.9-1.8c1.8 1 3.9 1.5 6.1 1.5 7.1 0 12.8-5.7 12.8-12.8S23.1 3.2 16 3.2Zm0 23.3c-2 0-3.8-.5-5.4-1.5l-.4-.2-4 1 1.1-3.9-.3-.4a10.4 10.4 0 0 1-1.6-5.6c0-5.8 4.7-10.5 10.6-10.5 5.8 0 10.5 4.7 10.5 10.5S21.8 26.5 16 26.5Zm5.8-7.8c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-2-1.8-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.4-.6.1-.2 0-.4 0-.6l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.3 1.4 3.5c.2.2 2.4 3.7 5.9 5.1.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 2-.8 2.2-1.6.3-.8.3-1.4.2-1.6-.1-.1-.3-.2-.6-.3Z" /></svg>)
const MOD_ICONS = [IcBox, IcUsers, IcLeaf]

const QRGrid = ({ s = 54 }) => (<div className="grid gap-[2px]" style={{ width: s, height: s, gridTemplateColumns: 'repeat(6,1fr)' }} aria-hidden>{Array.from({ length: 36 }).map((_, i) => <span key={i} className="rounded-[1px]" style={{ background: [0, 1, 2, 6, 8, 12, 14, 3, 4, 5, 11, 17, 18, 24, 30, 20, 22, 27, 29, 33, 34, 35, 25].includes(i) ? C.ink : 'transparent' }} />)}</div>)


const IVA = 1.21
const eur = (n) => n === 0 ? '0' : String(Math.round(n * 100) / 100).replace('.', ',')
const PLANS = [{ id: 'prueba', name: 'Prueba', annual: 0, monthly: 0, unit: '30 días', free: true }, { id: 'basico', name: 'Básico', tag: 'Cocinero', annual: 25, annualOnly: true, unit: 'año' }, { id: 'premium', name: 'Premium', annual: 190, monthly: 19, unit: 'año', featured: true }, { id: 'business', name: 'Business', annual: 290, monthly: 29, unit: 'año' }]

function useReveal(dep) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.lp-reveal'))
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return }
    const io = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target) } }), { threshold: 0.1, rootMargin: '0px 0px -8% 0px' })
    els.forEach((e) => io.observe(e)); return () => io.disconnect()
  }, [dep])
}
function useMagnet() {
  const ref = useRef(null)
  const onMouseMove = (e) => { const el = ref.current; if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * 0.16}px, ${(e.clientY - (r.top + r.height / 2)) * 0.26}px)` }
  const onMouseLeave = () => { if (ref.current) ref.current.style.transform = '' }
  return { ref, onMouseMove, onMouseLeave }
}

/* ─────────────── Ficha FORMAL (datos inventados, no revela receta) ─────────────── */
function FichaFormal({ t }) {
  const ing = [['Base', [['Fondo de pescado', '400 ml'], ['Sofrito de la casa', '120 g'], ['Patata monalisa', '2 u']]], ['Terminación', [['Aceite de hierbas', '15 ml'], ['Picada de almendra', '20 g']]]]
  const steps = [['Base', 'Levantar el fondo con el sofrito y cocer la patata al punto.'], ['Cocción', 'Napar el género y ligar suavemente sin remover en exceso.'], ['Pase', 'Terminar con el aceite de hierbas y la picada al momento.']]
  return (
    <div className="w-full overflow-hidden rounded-xl bg-white text-left shadow-[0_24px_60px_-24px_rgba(30,20,10,.5)]" style={{ maxWidth: 360, border: '2px solid #1a1a18', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="flex items-center justify-between border-b-2 border-[#1a1a18] px-3 py-2">
        <span className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#1a1a18]" style={{ fontFamily: DISP }}>Casa Marea</span>
        <div className="text-right"><p className="text-[8px] uppercase tracking-[0.14em] text-[#999]" style={{ fontFamily: MONO }}>{t.mockSheet}</p><p className="text-[11px] font-medium text-[#1a1a18]" style={{ fontFamily: MONO }}>CM-024 / Rev. 2</p></div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '96px 1fr' }}>
        <div className="overflow-hidden border-r-2 border-b-2 border-[#1a1a18]" style={{ height: 92 }}><img src={dishPhoto} alt="Suquet de marisc" loading="lazy" className="h-full w-full object-cover" /></div>
        <div className="border-b-2 border-[#1a1a18] px-3 py-2">
          <p className="text-[8px] uppercase tracking-[0.14em] text-[#999]" style={{ fontFamily: MONO }}>Plato principal</p>
          <h3 className="text-[19px] font-extrabold leading-tight text-[#1a1a18]" style={{ fontFamily: DISP }}>Suquet de temporada</h3>
          <p className="mt-1 border-t border-[#e0e0e0] pt-1 text-[10px] leading-snug text-[#555]">Guiso marinero ligado, de mercado y temporada.</p>
        </div>
      </div>
      <div className="flex border-b-2 border-[#1a1a18] bg-[#f5f5f5]">
        {[['4', 'rac.'], ['35′', 'prep'], ['25′', 'cocción'], ['3 d', 'vida']].map(([v, l], i) => (
          <div key={l} className={`flex flex-1 flex-col items-center py-1.5 ${i < 3 ? 'border-r border-[#ddd]' : ''}`}><span className="text-[13px] font-bold text-[#1a1a18]">{v}</span><span className="text-[7.5px] uppercase tracking-wide text-[#888]" style={{ fontFamily: MONO }}>{l}</span></div>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: '110px 1fr' }}>
        <aside className="border-r-2 border-[#1a1a18] px-2 py-2">
          <p className="mb-1.5 text-[8px] font-bold uppercase tracking-wide text-[#1a1a18]" style={{ fontFamily: MONO }}>{t.mockIng}</p>
          {ing.map(([g, its]) => (
            <div key={g} className="mb-1.5"><p className="mb-0.5 border-l-2 border-[#1a1a18] pl-1 text-[8.5px] font-bold uppercase text-[#1a1a18]">{g}</p>{its.map(([n, q], j) => <div key={j} className="grid border-b border-[#eee] py-0.5" style={{ gridTemplateColumns: '42px 1fr' }}><span className="border-r border-[#ccc] pr-1 text-right text-[9px] font-medium text-[#1a1a18]" style={{ fontFamily: MONO }}>{q}</span><span className="pl-1 text-[9px] leading-tight text-[#1a1a18]">{n}</span></div>)}</div>
          ))}
        </aside>
        <section className="px-2.5 py-2" style={{ background: '#fafafa' }}>
          <p className="mb-1.5 text-[8px] font-bold uppercase tracking-wide text-[#1a1a18]" style={{ fontFamily: MONO }}>{t.mockProc}</p>
          {steps.map(([ti, tx], i) => (
            <div key={i} className="mb-1.5 grid" style={{ gridTemplateColumns: '22px 1fr' }}>
              <div className="grid h-[20px] w-[20px] place-items-center rounded-full text-[10px] font-medium" style={{ background: '#1a1a18', color: C.gold, fontFamily: MONO }}>{i + 1}</div>
              <div className="pl-1.5"><p className="text-[9px] font-bold uppercase text-[#1a1a18]">{ti}</p><p className="text-[9px] leading-tight text-[#333]">{tx}</p></div>
            </div>
          ))}
        </section>
      </div>
      <div className="flex items-center justify-between border-t-2 border-[#1a1a18] bg-[#f5f5f5] px-3 py-1"><span className="text-[7.5px] uppercase tracking-wide text-[#888]" style={{ fontFamily: MONO }}>{t.mockEx}</span><span className="text-[7.5px] font-medium text-[#1a1a18]" style={{ fontFamily: MONO }}>CM-024 · 1/1</span></div>
    </div>
  )
}

function EscandalloMock({ t }) {
  const rows = [['Fondo de pescado', '400 ml', '1,10'], ['Sofrito', '120 g', '0,60'], ['Patata', '2 u', '0,40'], ['Picada', '20 g', '0,50']]
  return (
    <div className="gl w-full rounded-3xl p-5" style={{ maxWidth: 360 }}>
      <div className="flex items-center justify-between"><span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: C.emberDeep }}><IcCoins s={15} /> {t.showKick[1]}</span><span className="text-[10px] uppercase tracking-[0.16em]" style={{ color: C.inkSoft, fontFamily: MONO }}>{t.mockEx}</span></div>
      <div className="mt-3">{rows.map(([a, q, c]) => (<div key={a} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b py-1.5 text-[13px]" style={{ borderColor: C.line }}><span style={{ color: C.ink }}>{a}</span><span className="text-right" style={{ color: C.inkSoft, fontFamily: MONO }}>{q}</span><span className="w-14 text-right font-medium" style={{ color: C.ink, fontFamily: MONO }}>{c} €</span></div>))}</div>
      <div className="mt-3 space-y-1.5 rounded-2xl p-3" style={{ background: '#fff6ec' }}>
        <div className="flex justify-between text-[13px]"><span style={{ color: C.inkSoft }}>{t.mockCosteR}</span><span className="font-semibold" style={{ color: C.ink, fontFamily: MONO }}>2,60 €</span></div>
        <div className="flex justify-between text-[13px]"><span style={{ color: C.inkSoft }}>{t.mockPrice}</span><span className="font-semibold" style={{ color: C.ink, fontFamily: MONO }}>13,50 €</span></div>
        <div className="flex items-center justify-between pt-1"><span className="text-[13px] font-semibold" style={{ color: C.ink }}>{t.mockFC}</span><span className="rounded-full px-2.5 py-1 text-[13px] font-bold text-white" style={{ background: '#2f9e5f', fontFamily: MONO }}>19%</span></div>
      </div>
    </div>
  )
}
function CartaMock({ t }) {
  const items = [['Suquet de temporada', '13,50'], ['Tàrtar de gamba', '15,00'], ['Escalivada i anxova', '9,50']]
  return (
    <div className="gl w-full rounded-3xl p-5" style={{ maxWidth: 340 }}>
      <div className="flex items-center justify-between"><span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: C.emberDeep }}><IcCloche s={15} /> {t.showKick[2]}</span><span className="text-[10px] uppercase tracking-[0.16em]" style={{ color: C.inkSoft, fontFamily: MONO }}>{t.mockEx}</span></div>
      <div className="mt-3 space-y-2.5">{items.map(([n, p]) => (<div key={n} className="flex items-baseline gap-2 text-[14px]"><span style={{ color: C.ink }}>{n}</span><span className="flex-1 border-b border-dotted" style={{ borderColor: C.gold, transform: 'translateY(-3px)' }} /><span className="font-semibold" style={{ color: C.gold, fontFamily: MONO }}>{p} €</span></div>))}</div>
      <div className="mt-4 flex items-center gap-3 rounded-2xl p-3" style={{ background: '#fff6ec' }}><QRGrid s={54} /><div><p className="text-[13px] font-semibold" style={{ color: C.ink }}>{t.mockScan}</p><p className="text-[11px]" style={{ color: C.inkSoft }}>{t.mockScanSub}</p></div></div>
    </div>
  )
}
const SHOW_MOCKS = [FichaFormal, EscandalloMock, CartaMock]

export function Landing() {
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('rf_lang') || 'es' } catch { return 'es' } })
  const t = T[lang] || T.es
  useReveal(lang)
  const [annual, setAnnual] = useState(true)
  const [openFaq, setOpenFaq] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const heroCta = useMagnet()
  const winRef = useRef(null), fichaRef = useRef(null)
  const onHero3D = (e) => { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; const r = e.currentTarget.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5; if (winRef.current) winRef.current.style.transform = `perspective(1100px) rotateY(${px * 13}deg) rotateX(${-py * 13}deg) scale(1.01)`; if (fichaRef.current) fichaRef.current.style.transform = `translate3d(${px * 30}px, ${py * 24}px, 70px)` }
  const offHero3D = () => { if (winRef.current) winRef.current.style.transform = 'perspective(1100px)'; if (fichaRef.current) fichaRef.current.style.transform = '' }
  useEffect(() => { if (!langOpen) return; const h = () => setLangOpen(false); document.addEventListener('click', h); return () => document.removeEventListener('click', h) }, [langOpen])
  const WA_TRIAL = waMsg(t.waMsgTrial), WA_DEMO = waMsg(t.waMsgDemo)
  const MAIL = `mailto:${CONTACT.email}?subject=${encodeURIComponent('RecipeForge')}`
  const setLng = (l) => { setLang(l); try { localStorage.setItem('rf_lang', l) } catch { /* ignore */ } }

  useEffect(() => { const s = () => setScrolled(window.scrollY > 16); s(); window.addEventListener('scroll', s, { passive: true }); return () => window.removeEventListener('scroll', s) }, [])
  const NAV = [['#como', t.nav[0]], ['#modulos', t.nav[1]], ['#planes', t.nav[2]], ['#faq', t.nav[3]]]

  return (
    <div style={{ minHeight: '100vh', background: '#fdfaf5', color: C.ink, fontFamily: "'Inter', system-ui, sans-serif", overflowX: 'hidden' }}>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden><filter id="rf-charcoal" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.026 0.032" numOctaves="4" seed="4" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" /></filter></svg>
      <style>{`
        @keyframes lp-blob{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(26px,-20px) scale(1.1)}}
        @keyframes lp-fl{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes lp-in{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
        @keyframes lp-steam{0%{opacity:0;transform:translateY(0) scale(1)}25%{opacity:.5}100%{opacity:0;transform:translateY(-70px) scale(1.8)}}
        @keyframes lp-wa{0%{box-shadow:0 0 0 0 rgba(232,83,31,.5)}70%{box-shadow:0 0 0 18px rgba(232,83,31,0)}100%{box-shadow:0 0 0 0 rgba(232,83,31,0)}}
        @keyframes lp-marq{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .lp-marq{animation:lp-marq 28s linear infinite}
        @media (prefers-reduced-motion:reduce){.lp-marq{animation:none}}
        .gl{background:rgba(255,255,255,.62);backdrop-filter:blur(20px) saturate(150%);-webkit-backdrop-filter:blur(20px) saturate(150%);border:1px solid rgba(255,255,255,.75);box-shadow:0 24px 54px -26px rgba(90,60,30,.30),inset 0 1px 0 rgba(255,255,255,.9)}
        .lp-reveal{opacity:0;transform:translateY(26px);transition:opacity .75s cubic-bezier(.2,.7,.2,1),transform .75s cubic-bezier(.2,.7,.2,1)}.lp-reveal.in{opacity:1;transform:none}
        .lp-in{animation:lp-in .9s cubic-bezier(.2,.8,.2,1) both}
        .disp{font-family:${DISP};font-weight:800;letter-spacing:-0.02em}
        .lp-ember{background:linear-gradient(180deg,${C.emberHi},${C.ember});box-shadow:0 12px 28px -8px rgba(232,83,31,.5);transition:filter .2s,box-shadow .2s}.lp-ember:hover{filter:brightness(1.06);box-shadow:0 16px 40px -8px rgba(255,122,52,.65)}
        .lp-mag{transition:transform .18s cubic-bezier(.2,.8,.2,1)}
        .lp-link{color:${C.inkSoft};transition:color .2s}.lp-link:hover{color:${C.ink}}
        .lp-pop{transition:transform .3s cubic-bezier(.2,.7,.2,1),box-shadow .3s}.lp-pop:hover{transform:translateY(-6px);box-shadow:0 34px 64px -28px rgba(90,60,30,.4)}
        .steam span{position:absolute;bottom:0;width:26px;height:26px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.9),transparent 70%);filter:blur(6px)}
        @media (prefers-reduced-motion:reduce){[style*="lp-blob"],[style*="lp-fl"],.steam span{animation:none!important}.lp-in{animation:none}}
      `}</style>

      {/* blobs cálidos */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-32 -top-16 h-[460px] w-[460px] rounded-full" style={{ background: 'radial-gradient(circle,rgba(255,150,90,.4),transparent 66%)', animation: 'lp-blob 15s ease-in-out infinite' }} />
        <div className="absolute right-[-8%] top-1/4 h-[540px] w-[540px] rounded-full" style={{ background: 'radial-gradient(circle,rgba(255,206,120,.4),transparent 66%)', animation: 'lp-blob 19s ease-in-out infinite reverse' }} />
      </div>

      <div className="relative z-10">
        {/* NAV */}
        <header className="fixed inset-x-0 top-0 z-40 transition-all" style={scrolled || menuOpen ? { background: 'rgba(253,250,245,.72)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${C.line}` } : {}}>
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 md:px-8">
            <a href="#top" aria-label="RecipeForge" onClick={() => setMenuOpen(false)}><Logo variant="light" className="text-[26px] md:text-[32px]" /></a>
            <div className="hidden items-center gap-7 md:flex">{NAV.map(([h, l]) => <a key={h} href={h} className="lp-link text-sm font-medium">{l}</a>)}</div>
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <button onClick={(e) => { e.stopPropagation(); setLangOpen((v) => !v) }} className="gl flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-bold" style={{ color: C.ink }} aria-haspopup="listbox" aria-expanded={langOpen} aria-label="Idioma"><IcGlobe s={15} /> {(LANGS.find((l) => l[0] === lang) || LANGS[0])[1]} <span className={`transition-transform ${langOpen ? 'rotate-90' : ''}`} style={{ color: C.inkSoft }}><IcChevron s={12} /></span></button>
                {langOpen && <div onClick={(e) => e.stopPropagation()} className="absolute right-0 z-50 mt-2 w-36 overflow-hidden rounded-2xl gl" role="listbox">{LANGS.map(([code, lbl, full]) => <button key={code} onClick={() => { setLng(code); setLangOpen(false) }} role="option" aria-selected={lang === code} className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[13px] font-semibold transition hover:bg-white/70" style={lang === code ? { color: C.ember } : { color: C.ink }}><span>{full}</span><span className="text-[11px]" style={{ fontFamily: MONO, color: lang === code ? C.ember : C.inkSoft }}>{lbl}</span></button>)}</div>}
              </div>
              <a href={APP_URL} className="hidden rounded-full border px-4 py-2 text-sm font-semibold md:inline-block" style={{ borderColor: C.ember, color: C.ember }}>{t.access}</a>
              <a href={WA_TRIAL} target="_blank" rel="noreferrer" className="lp-ember rounded-full px-4 py-2 text-[15px] font-semibold text-white">{t.trial}</a>
              <button onClick={() => setMenuOpen((v) => !v)} className="grid h-10 w-10 place-items-center rounded-lg md:hidden" style={{ color: C.ink }} aria-label="Menú" aria-expanded={menuOpen}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">{menuOpen ? <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></> : <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>}</svg></button>
            </div>
          </nav>
          {menuOpen && <div className="border-t px-5 pb-4 pt-1 md:hidden" style={{ borderColor: C.line, background: 'rgba(253,250,245,.96)' }}><div className="flex flex-col">{NAV.map(([h, l]) => <a key={h} href={h} onClick={() => setMenuOpen(false)} className="border-b py-3 text-[15px] font-medium" style={{ borderColor: C.line, color: C.ink }}>{l}</a>)}<a href={APP_URL} onClick={() => setMenuOpen(false)} className="border-b py-3 text-[15px] font-semibold" style={{ borderColor: C.line, color: C.ember }}>{t.footAccess} →</a><div className="mt-2 flex gap-1.5">{LANGS.map(([code, lbl]) => <button key={code} onClick={() => setLng(code)} className="rounded-full px-3 py-1 text-[13px] font-bold" style={lang === code ? { background: C.ember, color: '#fff' } : { background: '#fff', color: C.inkSoft, border: `1px solid ${C.line}` }}>{lbl}</button>)}</div></div></div>}
        </header>

        {/* HERO con vídeo de cocina + vapor */}
        <section id="top" className="relative px-5 pb-16 pt-28 md:px-8 md:pb-24 md:pt-36">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.02fr_.98fr]">
            <div className="lp-in">
              <h1 className="disp" style={{ fontSize: 'clamp(40px,7.5vw,72px)', lineHeight: 1.02, color: C.ink }}>{t.heroTitleA}<br /><span style={{ color: C.ember }}>{t.heroTitleB}</span>{t.heroTitleC}</h1>
              <p className="mt-6 max-w-xl text-[16px] leading-relaxed md:text-[17px]" style={{ color: C.inkSoft }}>{t.heroSub}<strong style={{ color: C.ink }}>{t.heroSubStrong}</strong>{t.heroSubEnd}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a href={WA_TRIAL} target="_blank" rel="noreferrer" ref={heroCta.ref} onMouseMove={heroCta.onMouseMove} onMouseLeave={heroCta.onMouseLeave} className="lp-ember lp-mag inline-flex items-center gap-2 rounded-full px-7 py-4 text-[16px] font-semibold text-white"><IcFlame s={18} /> {t.ctaTrial}</a>
                <a href="#planes" className="gl inline-flex items-center gap-1.5 rounded-full px-6 py-4 text-[15px] font-semibold" style={{ color: C.ink }}>{t.ctaPlans} <IcChevron s={16} /></a>
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] font-medium uppercase tracking-[0.08em]" style={{ color: C.inkSoft, fontFamily: MONO }}>{[IcReceipt, IcCoins, IcQr, IcPot].map((Ic, i) => <span key={i} className="flex items-center gap-1.5" style={{ color: C.ember }}><Ic s={15} /> <span style={{ color: C.inkSoft }}>{t.trust[i]}</span></span>)}</div>
            </div>
            {/* Ventana de cocina viva: vídeo wok + vapor + ficha formal, en 3D */}
            <div className="relative mx-auto w-full max-w-md" style={{ transformStyle: 'preserve-3d' }} onMouseMove={onHero3D} onMouseLeave={offHero3D}>
              <div ref={winRef} className="relative overflow-hidden rounded-[28px] border-2 border-white shadow-[0_30px_70px_-30px_rgba(60,35,15,.6)] transition-transform duration-200 ease-out" style={{ aspectRatio: '4/5', transform: 'perspective(1100px)' }}>
                <video className="h-full w-full object-cover" autoPlay muted loop playsInline poster="" style={{ filter: 'saturate(1.05) contrast(1.03)' }}><source src={wokVideo} type="video/mp4" /></video>
                <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(255,240,225,.12),rgba(40,20,8,.28))' }} />
                <div className="steam pointer-events-none absolute inset-x-0 bottom-24" aria-hidden>{[20, 44, 68].map((l, i) => <span key={i} style={{ left: `${l}%`, animation: `lp-steam ${5 + i}s ease-in ${i * 1.2}s infinite` }} />)}</div>
              </div>
              <div ref={fichaRef} className="absolute -bottom-6 -left-4 w-[62%] min-w-[220px] transition-transform duration-200 ease-out" style={{ willChange: 'transform' }}><div style={{ animation: 'lp-fl 8s ease-in-out infinite' }}><FichaFormal t={t} /></div></div>
              <div className="gl absolute -right-2 top-6 flex items-center gap-2 rounded-2xl px-3 py-2" style={{ transform: 'translateZ(40px)' }}><span className="rounded-full px-2 py-0.5 text-[12px] font-bold text-white" style={{ background: '#2f9e5f', fontFamily: MONO }}>19%</span><span className="text-[12px] font-medium" style={{ color: C.ink }}>{t.mockFC}</span></div>
            </div>
          </div>
        </section>

        {/* SHOWCASES — cada uno con su propia esencia */}
        {[0, 1, 2].map((i) => {
          const Mock = SHOW_MOCKS[i], reverse = i === 1, dark = i === 2
          const bg = i === 0
            ? { background: '#fffdf8', backgroundImage: 'repeating-linear-gradient(0deg, rgba(200,135,10,.07) 0 1px, transparent 1px 30px)' }
            : i === 1
              ? { background: '#fbf6ee', backgroundImage: 'repeating-linear-gradient(0deg, rgba(60,40,20,.055) 0 1px, transparent 1px 26px), repeating-linear-gradient(90deg, rgba(60,40,20,.055) 0 1px, transparent 1px 26px)' }
              : { background: 'linear-gradient(155deg,#26190f 0%,#3a2416 100%)' }
          const kickC = dark ? '#e6b45c' : C.ember, titleC = dark ? '#f6efe3' : C.ink, bodyC = dark ? '#d8cbb4' : C.inkSoft, ctaC = dark ? C.emberHi : C.ember
          const Deco = [IcWhisk, IcCoins, IcCloche][i]
          return (
            <section key={i} className="relative overflow-hidden px-5 py-16 md:px-8 md:py-24" style={bg}>
              {dark && <><video className="pointer-events-none absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline aria-hidden style={{ opacity: 0.28 }}><source src={wokVideo} type="video/mp4" /></video><div className="pointer-events-none absolute inset-0" aria-hidden style={{ background: 'linear-gradient(155deg,rgba(30,20,12,.86),rgba(46,29,17,.9))' }} /></>}
              <div className="pointer-events-none absolute -right-8 -top-10 hidden md:block" style={{ color: dark ? '#fff' : C.ink, opacity: dark ? 0.08 : 0.05 }} aria-hidden><Deco s={240} /></div>
              {dark && <div className="pointer-events-none absolute inset-0" aria-hidden style={{ background: 'radial-gradient(60% 60% at 80% 20%, rgba(232,83,31,.22), transparent 60%)' }} />}
              <div className={`relative mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2 ${reverse ? 'md:[direction:rtl]' : ''}`}>
                <div className="lp-reveal" style={{ direction: 'ltr' }}>
                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.16em]" style={{ background: dark ? 'rgba(255,255,255,.08)' : '#fff', border: `1px solid ${dark ? 'rgba(230,180,92,.4)' : C.line}`, color: kickC }}><Deco s={15} /> {t.showKick[i]}</span>
                  <h2 className="disp mt-4" style={{ fontSize: 'clamp(26px,4.4vw,42px)', lineHeight: 1.06, color: titleC }}>{t.showTitle[i]}</h2>
                  <p className="mt-4 max-w-md text-[16px] leading-relaxed" style={{ color: bodyC }}>{t.showBody[i]}</p>
                  <a href={WA_TRIAL} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-bold" style={{ color: ctaC }}>{t.showCta} <IcChevron s={16} /></a>
                </div>
                <div className="lp-reveal grid place-items-center" style={{ direction: 'ltr' }}><Mock t={t} /></div>
              </div>
            </section>
          )
        })}

        {/* MÓDULOS */}
        <section id="modulos" className="relative overflow-hidden px-5 py-16 md:px-8 md:py-24" style={{ background: '#fbf6ee' }}><div className="pointer-events-none absolute -left-10 -bottom-8 hidden md:block" style={{ color: C.ink, opacity: 0.05 }} aria-hidden><IcKnife s={210} /></div><div className="relative mx-auto max-w-6xl">
          <div className="max-w-2xl lp-reveal"><p className="text-[13px] font-bold uppercase tracking-[0.2em]" style={{ color: C.ember }}>{t.modKick}</p><h2 className="disp mt-3" style={{ fontSize: 'clamp(24px,4vw,40px)', color: C.ink }}>{t.modTitle}</h2></div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">{t.mods.map(([ti, bo], i) => { const Ic = MOD_ICONS[i]; return (
            <article key={i} className="gl lp-pop lp-reveal rounded-3xl p-6" style={{ transitionDelay: `${i * 70}ms` }}>
              <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl" style={{ background: '#fbf6ec', border: `1px solid ${C.line}`, color: '#463f36' }}><Ic s={30} /></div>
              <h3 className="disp text-lg" style={{ color: C.ink }}>{ti}</h3><p className="mt-2 text-[15px] leading-relaxed" style={{ color: C.inkSoft }}>{bo}</p>
            </article>) })}</div>
        </div></section>

        {/* CÓMO */}
        <section id="como" className="relative overflow-hidden px-5 py-16 md:px-8 md:py-24"><div className="pointer-events-none absolute right-0 top-10 hidden md:block" style={{ color: C.ink, opacity: 0.05 }} aria-hidden><IcPot s={200} /></div><div className="relative mx-auto max-w-6xl">
          <div className="max-w-2xl lp-reveal"><p className="text-[13px] font-bold uppercase tracking-[0.2em]" style={{ color: C.ember }}>{t.stepKick}</p><h2 className="disp mt-3" style={{ fontSize: 'clamp(24px,4vw,40px)', color: C.ink }}>{t.stepTitle}</h2></div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">{t.steps.map(([ti, bo], i) => (
            <div key={i} className="gl lp-reveal rounded-3xl p-6" style={{ transitionDelay: `${i * 80}ms` }}><span className="disp text-5xl" style={{ color: C.emberHi }}>{String(i + 1).padStart(2, '0')}</span><h3 className="disp mt-2 text-lg" style={{ color: C.ink }}>{ti}</h3><p className="mt-2 text-[15px] leading-relaxed" style={{ color: C.inkSoft }}>{bo}</p></div>
          ))}</div>
        </div></section>

        {/* POR QUÉ */}
        <section className="relative overflow-hidden px-5 py-16 md:px-8 md:py-24" style={{ background: '#fbf6ee' }}><div className="relative mx-auto max-w-6xl">
          <div className="max-w-2xl lp-reveal"><p className="text-[13px] font-bold uppercase tracking-[0.2em]" style={{ color: C.ember }}>{t.whyKick}</p><h2 className="disp mt-3" style={{ fontSize: 'clamp(24px,4vw,40px)', color: C.ink }}>{t.whyTitle}</h2></div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">{t.whys.map(([ti, bo], i) => (
            <div key={i} className="gl lp-reveal flex items-start gap-4 rounded-3xl p-6" style={{ transitionDelay: `${(i % 2) * 70}ms` }}><span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-white" style={{ background: C.ember }}><IcCheck s={16} /></span><div><h3 className="disp text-lg" style={{ color: C.ink }}>{ti}</h3><p className="mt-1 text-[15px] leading-relaxed" style={{ color: C.inkSoft }}>{bo}</p></div></div>
          ))}</div>
        </div></section>

        {/* PLANES */}
        <section id="planes" className="relative px-5 py-14 md:px-8 md:py-20"><div className="mx-auto max-w-6xl">
          <div className="text-center lp-reveal"><p className="text-[13px] font-bold uppercase tracking-[0.2em]" style={{ color: C.ember }}>{t.priceKick}</p><h2 className="disp mt-3" style={{ fontSize: 'clamp(26px,4.5vw,42px)', color: C.ink }}>{t.priceTitle}</h2>
            <div className="mt-6 inline-flex items-center gap-1 rounded-full p-1 text-sm gl"><button onClick={() => setAnnual(true)} className="rounded-full px-4 py-1.5 font-semibold transition" style={annual ? { background: C.ember, color: '#fff' } : { color: C.inkSoft }}>{t.annual}</button><button onClick={() => setAnnual(false)} className="rounded-full px-4 py-1.5 font-semibold transition" style={!annual ? { background: C.ember, color: '#fff' } : { color: C.inkSoft }}>{t.monthly}</button></div>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-4">{PLANS.map((p, i) => {
            const showMonthly = !annual && p.monthly != null && !p.annualOnly && !p.free
            const price = p.free ? '0' : showMonthly ? eur(p.monthly) : eur(p.annual)
            const unit = p.free ? p.unit : showMonthly ? 'mes' : p.unit
            const withIva = p.free ? null : showMonthly ? eur(p.monthly * IVA) : eur(p.annual * IVA)
            const href = i === 0 || i === 2 ? WA_TRIAL : WA_DEMO
            return (
              <div key={p.id} className="gl lp-reveal relative flex flex-col rounded-3xl p-6" style={{ transitionDelay: `${i * 60}ms`, ...(p.featured ? { boxShadow: '0 28px 60px -22px rgba(232,83,31,.5)', border: `1px solid ${C.emberHi}` } : {}) }}>
                {p.featured && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-white" style={{ background: C.ember }}>{t.featured}</span>}
                <div className="flex items-baseline gap-2"><h3 className="disp text-xl" style={{ color: C.ink }}>{p.name}</h3>{p.tag && <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.ember }}>{p.tag}</span>}</div>
                <p className="mt-1 min-h-[40px] text-[13px] leading-snug" style={{ color: C.inkSoft }}>{t.plansWho[i]}</p>
                <div className="mt-4 flex flex-wrap items-end gap-1.5"><span className="disp text-4xl" style={{ color: C.ink }}>{price === '0' ? t.free : `${price} €`}</span>{price !== '0' && <span className="mb-1 text-sm" style={{ color: C.inkSoft }}>/{unit}</span>}{!annual && p.annualOnly && <span className="mb-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase" style={{ background: '#fff1e3', color: C.emberDeep }}>{t.onlyAnnual}</span>}</div>
                <p className="mt-1 text-[11px]" style={{ color: C.inkSoft, fontFamily: MONO }}>{p.free ? t.freeNote : t.ivaNote(withIva, p.annualOnly)}</p>
                <a href={href} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center justify-center rounded-full px-4 py-3 text-[15px] font-semibold transition" style={p.featured || p.free ? { background: `linear-gradient(180deg,${C.emberHi},${C.ember})`, color: '#fff', boxShadow: '0 12px 28px -10px rgba(232,83,31,.5)' } : { border: `1px solid ${C.line}`, color: C.ink, background: 'rgba(255,255,255,.6)' }}>{t.plansCta[i]}</a>
                <ul className="mt-5 space-y-2.5">{t.plansFeats[i].map((f) => <li key={f} className="flex items-start gap-2 text-[14px]" style={{ color: C.ink }}><span className="mt-0.5" style={{ color: C.ember }}><IcCheck s={15} /></span> {f}</li>)}</ul>
              </div>
            )
          })}</div>
          <p className="mt-6 text-center text-[13px]" style={{ color: C.inkSoft }}>{t.priceFoot}</p>
        </div></section>

        {/* FAQ */}
        <section id="faq" className="relative px-5 py-14 md:px-8 md:py-20"><div className="mx-auto max-w-3xl">
          <div className="text-center lp-reveal"><p className="text-[13px] font-bold uppercase tracking-[0.2em]" style={{ color: C.ember }}>{t.faqKick}</p><h2 className="disp mt-3" style={{ fontSize: 'clamp(26px,4.5vw,40px)', color: C.ink }}>{t.faqTitle}</h2></div>
          <div className="mt-8 space-y-3">{t.faqs.map(([q, a], i) => { const open = openFaq === i; return (
            <div key={i} className="gl overflow-hidden rounded-2xl lp-reveal">
              <button onClick={() => setOpenFaq(open ? -1 : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left" aria-expanded={open} aria-controls={`faq-${i}`}><span className="text-[15px] font-semibold md:text-base" style={{ color: C.ink }}>{q}</span><span className={`shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} style={{ color: C.ember }}><IcChevron s={18} /></span></button>
              <div id={`faq-${i}`} role="region" aria-hidden={!open} className="grid transition-all duration-300" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}><div className="overflow-hidden"><p className="px-5 pb-4 text-[14.5px] leading-relaxed" style={{ color: C.inkSoft }}>{a}</p></div></div>
            </div>) })}</div>
        </div></section>

        {/* CTA FINAL */}
        <section className="relative px-5 py-20 md:px-8 md:py-28"><div className="relative mx-auto max-w-4xl overflow-hidden rounded-[32px] px-6 py-14 text-center lp-reveal" style={{ background: `linear-gradient(155deg,${C.emberHi},${C.emberDeep})`, boxShadow: '0 34px 80px -34px rgba(232,83,31,.6)' }}>
          <h2 className="disp text-white" style={{ fontSize: 'clamp(28px,5vw,48px)' }}>{t.ctaTitle}</h2>
          <p className="mx-auto mt-4 max-w-xl text-[16px] text-white/90">{t.ctaSub}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3"><a href={WA_TRIAL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 text-[16px] font-bold" style={{ color: C.emberDeep }}><IcFlame s={18} /> {t.ctaTrial}</a><a href={MAIL} className="inline-flex items-center gap-1.5 rounded-full border border-white/50 px-6 py-4 text-[15px] font-semibold text-white transition hover:bg-white/10">{t.ctaEmail}</a></div>
        </div></section>

        {/* FOOTER */}
        <footer className="relative px-5 py-12 md:px-8" style={{ borderTop: `1px solid ${C.line}` }}>
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 md:flex-row md:items-start md:justify-between">
            <div className="text-center md:text-left"><Logo variant="light" className="text-2xl" /><p className="mt-3 max-w-xs text-[14px] leading-relaxed" style={{ color: C.inkSoft }}>{t.footTag}</p></div>
            <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm">{NAV.map(([h, l]) => <a key={h} href={h} className="lp-link font-medium">{l}</a>)}<a href={APP_URL} className="lp-link font-medium">{t.footAccess}</a><a href={WA_DEMO} target="_blank" rel="noreferrer" className="lp-link font-medium">WhatsApp</a></div>
          </div>
          <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-between gap-4 pt-8 md:flex-row" style={{ borderTop: `1px solid ${C.line}` }}><p className="text-[13px]" style={{ color: C.inkSoft }}>© {new Date().getFullYear()} RecipeForge</p><PoweredByWeltBrave className="scale-90" /></div>
        </footer>
      </div>

      {/* WHATSAPP FLOTANTE (estilo referencia, color RecipeForge) */}
      <a href={WA_TRIAL} target="_blank" rel="noreferrer" aria-label={t.waTip} className="group fixed bottom-6 right-6 z-50 grid h-16 w-16 place-items-center rounded-full text-white shadow-[0_14px_40px_-8px_rgba(232,83,31,.7)] transition-all duration-300 hover:scale-110" style={{ background: `linear-gradient(180deg,${C.emberHi},${C.ember})`, animation: 'lp-wa 2.4s ease-out infinite' }}>
        <IcWhatsApp s={32} />
        <span className="pointer-events-none absolute right-20 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold text-white opacity-0 shadow-lg transition-opacity duration-300 group-hover:opacity-100" style={{ background: C.ink }}>{t.waTip}<span className="absolute right-[-5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45" style={{ background: C.ink }} /></span>
        <span className="pointer-events-none absolute inset-0 rounded-full border-2" style={{ borderColor: C.emberHi, opacity: .35 }} />
      </a>
    </div>
  )
}
