# Arquitectura · el círculo

## Pilares

El círculo de inspiración de Divine Circle (imágenes en `packages/brand/pilares/`, datos en
`packages/core/src/pillars.ts`): **Essence · Spirituality** al centro y alrededor, desde arriba en
sentido horario, **Wisdom · Expansion**, **Imagination · Manifestation**, **Movement · Adventure**,
**Nature · Preservation**, **Family · Traditions** y **Food · Nutrition**. Cada pilar tiene su color,
y cada oferta del catálogo puede pertenecer a un pilar (el pan es Food).

## Marca de pago y horno (del sistema original de Divine)

- Pago: **✓ pagado** (verde) · **✕ no pagó** (rojo) · **+ crédito a favor** (magenta, dorado en oscuro).
  Tocar la marca avanza en ese orden.
- Horno: por hornear → horneando → listo → entregado (o cancelado).

## Composición

El hub no usa pestañas ni listas: todo es **algo al centro con cosas alrededor**, como el
símbolo de Divine Circle (un círculo rodeado de seis).

- **Inicio (la flor):** hoy al centro, seis módulos alrededor (Pan, Experiencias, Café,
  Círculo, Catálogo, Ajustes) y los proyectos como satélites en el anillo exterior.
- **Cada módulo:** su tema al centro y sus elementos en órbita. En Pan, el día al centro,
  un anillo con lo que hay que hornear y los pedidos orbitando.
- **Foco:** tocar un elemento lo trae al centro con sus acciones alrededor.
- **Una sola página:** cada sección ocupa toda la pantalla y cambiar de sección desliza hacia
  un lado (también con el dedo o las flechas del teclado). El logo regresa al inicio; los puntitos
  de abajo saltan a cualquier sección.
- Títulos en Montserrat; Cinzel queda solo en la marca.

El UI kit vive en `packages/ui` (`Stage`, `Track`, `Bubble`, `around()`, `Donut`, `Focus`,
`PayMark`, `PillarFlower`, `Pager`, `PageDots`, toasts) y se ve en `apps/kit`.
Para un módulo nuevo del hub: crear `modules/X.tsx` con esas piezas y agregarlo a `modules/index.ts`.

## Modelo

- **Proyectos** en anillos: `nucleo` (Divine Circle), `aliado` (Take Off, Branes), `vecino`
  (emprendimientos aledaños). Cada uno marca si es parte del ecosistema Branes.
- **Ofertas** de cada proyecto: `producto` (pan), `experiencia` (clases, talleres), `servicio`.
  Cada oferta tiene un código corto único para la entrada rápida y un interruptor «web».
- **Pedidos**: cliente, día, líneas (foto de código/nombre/precio al momento de pedir),
  monto acordado opcional, estado (`pendiente → listo → entregado`, o `cancelado`), pagado, nota,
  origen (`hub` o `web`).

## Datos

- El hub guarda todo en el dispositivo (localStorage) y, si hay Supabase y sesión, sube cada
  cambio y al abrir trae lo último (gana la nube; lo que solo estaba en el dispositivo se sube).
- Supabase (`supabase/migrations/0001_circulo.sql`) usa tablas reales con RLS:
  - el equipo (`members`) lee y escribe todo; roles `owner`, `admin`, `staff`.
  - el público solo ve proyectos activos y ofertas publicadas.
  - la web crea pedidos solo vía `place_web_order()`, que valida códigos y calcula precios en el servidor.

## Puesta en marcha de Supabase

1. Crear el proyecto nuevo y correr `0001_circulo.sql` en el SQL editor.
2. Authentication → habilitar inicio por correo (magic link) y agregar la URL del hub como redirect.
3. Entrar una vez al hub con tu correo y luego registrarte como dueño:
   `insert into members (user_id, name, role) select id, 'Tu nombre', 'owner' from auth.users where email = 'tu@correo';`
4. Poner `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `apps/hub/.env.local` y `apps/web/.env.local`.

## Próximos módulos

- Experiencias con cupos y horarios (clases de surf con Take Off, talleres, cursos).
- Fichas de vecinos en la web (la revista).
- Integración del sistema de wellness como app del ecosistema.
