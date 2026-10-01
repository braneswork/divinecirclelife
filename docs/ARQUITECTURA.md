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
símbolo de Divine Circle (un círculo que toca a seis). Inspiración visual: la espiral de Doyle
(anillos de luz con disco interior; cada círculo toca a seis).

- **Inicio (la flor):** hoy al centro, seis módulos alrededor, cada uno con su ícono y el color
  de un pilar: Ventas arriba (Imagination), Experiencias (Movement), Clientes (Family),
  Caja abajo (Essence), Círculo (Nature) y Productos (Food). En las esquinas: **− salida** y
  **+ entrada**. Arriba: **?** ayuda (abre docs/AYUDA.md en la sección actual) y ajustes.
- **+ entrada** abre la tienda (`Shop` del UI kit): venta rápida escrita o elegir del catálogo
  con fotos; el cierre pide cliente, día y pago. La web usará la misma tienda.
- **Productos y Experiencias:** panal de fotos ordenado por lo que generó cada oferta en el
  mes; al entrar en una se ve su ficha (lo que generó, unidades, quién más la pide) y se edita
  (foto, código, precio, presentación, familia, pilar, descripción).
- **Instrucciones:** no van en pantalla; viven en `docs/AYUDA.md` y se abren con **?**.
- **Entrar en un círculo:** tocarlo lo expande hasta llenar la pantalla; volver (logo, flecha,
  Escape o atrás del navegador) lo contrae a su lugar. Dentro de un módulo se puede volver a
  entrar en otro círculo (un cliente, por ejemplo).
- **Navegación de íconos** abajo: cada círculo dice a dónde lleva.
- **Dos acomodos:** panal uniforme (`hexCells`) para piezas iguales (clientes, productos,
  experiencias, caja, tipos de salida) y espiral de Doyle (`spiralCells`) para lo que tiene peso (los pedidos del
  día: el más grande va en el círculo más grande).
- **Foco:** tocar algo lo trae al centro con sus acciones alrededor.

El UI kit vive en `packages/ui` (`Stage`, `Bubble`, `hexCells`, `spiralCells`, `Zoom`,
`IconNav`, `Icon`, `Photo`, `Shop`, `Sheet`, `Markdown`, `Focus`, `Donut`, `PayMark`,
`PillarFlower`, toasts) y se ve en `apps/kit`.
Para un módulo nuevo del hub: crear `modules/X.tsx` y agregarlo a `modules/index.ts`.

## Plata: clientes, facturas y caja

Tomado de la hoja "Divine Circle 2026":
- **Clientes** (hoja Sources): forma de cobro `contado` o `mensual` y descuento negociado por
  producto (Mantarraya: Burger Bun 32 %, Campesino 30 %). Al escribir un pedido con su nombre o
  alias se enlaza y se aplica el descuento.
- **Facturas** (hojas Payments/Facturas): pedidos del mes agrupados por producto con subtotal,
  descuento y total; ajustes (préstamo, abono); recibo correlativo (sigue del 0005). Marcarla
  pagada deja sus pedidos en ✓. Se imprime o guarda como PDF.
- **Caja** (hojas Out/Totals): ventas de todo, cobrado ✓, no pagó ✕, crédito +, salidas por
  tipo (de "Fixed Cost") y balance del mes. Salida rápida: `25000 super // nota`.

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

## Puesta en marcha

Proyecto de Supabase: `vbeubyipzzpfbdjswavh` (URL y clave anon pública en
`packages/core/src/config.ts`; se pueden reemplazar con `VITE_SUPABASE_URL` y
`VITE_SUPABASE_ANON_KEY`). Nunca poner la service_role key en el repo.

1. Supabase → SQL Editor: pegar `supabase/setup.sql` completo y Run (versión limpia y repetible
   de `migrations/0001_circulo.sql`; se puede correr varias veces).
   Convive con las tablas del hub anterior (`divine_circle_data`, `divine_circle_backups`).
2. Authentication → Providers: Email activo.
3. Authentication → URL Configuration: Site URL = la dirección de Vercel del hub, y en
   Redirect URLs agregar esa dirección con `/**` y `https://*.vercel.app/**` (vistas previas).
4. Entrar al hub → Ajustes → Nube → correo → enlace. **La primera persona que entra queda
   como dueña** (`claim_ownership()`); las demás quedan sin acceso hasta que se agreguen a
   `members`.
5. La primera sincronización de cada dispositivo sube lo que ya tenía (fichas, fotos, ventas);
   después la nube manda.

## Seguridad

- **Puerta del hub** (`apps/hub/src/auth/Gate.tsx`): sin sesión no se muestra nada. Acceso por
  correo con código de 6 dígitos (OTP) o enlace (PKCE). Con sesión pero fuera de `members`:
  "Sin acceso". Sin señal, se permite seguir si el dispositivo ya tenía sesión y rol.
- **Salir** sincroniza y borra los datos locales y la sesión del dispositivo.
- **Base de datos**: RLS en todas las tablas; el público solo ve proyectos activos y ofertas
  publicadas y crea pedidos únicamente vía `place_web_order()`. El equipo se gestiona solo por
  funciones (`team`, `set_member`, `remove_member`) que exigen dueño o admin y dejan siempre un
  dueño; nadie puede insertarse en `members` directamente. `supabase/seguridad.sql` además
  bloquea las tablas del hub anterior para el público.
- **Cabeceras** (`vercel.json`): Content-Security-Policy estricta (scripts propios, conexión solo
  al proyecto de Supabase, sin iframes), HSTS, nosniff, X-Frame-Options DENY, Referrer-Policy,
  Permissions-Policy, COOP.

### Configuración en Supabase (una vez)
1. SQL Editor: `supabase/setup.sql` y luego `supabase/seguridad.sql`.
2. Authentication → Email Templates → **Magic Link**: incluir el código, por ejemplo
   `<h2>Tu código: {{ .Token }}</h2><p>o entra con <a href="{{ .ConfirmationURL }}">este enlace</a>.</p>`
3. Authentication → URL Configuration: Site URL = dirección de Vercel; Redirect URLs = esa
   dirección con `/**` y `https://*.vercel.app/**`.
4. Entrar al hub (quedas como dueño). Después, Authentication → Sign In / Providers → desactivar
   **Allow new users to sign up**: desde ahí solo entran personas invitadas (Users → Invite user)
   y agregadas en Ajustes → Equipo.

## Publicación (Vercel)

`vercel.json` construye con `npm run build:site` y publica `dist/`:
hub en `/`, web en `/web/`, UI kit en `/kit/`.
Cada rama genera una vista previa; `main` es producción.

## Próximos módulos

- Experiencias con cupos y horarios (clases de surf con Take Off, talleres, cursos).
- Fichas de vecinos en la web (la revista).
- Integración del sistema de wellness como app del ecosistema.
