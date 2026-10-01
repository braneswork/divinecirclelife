# Arquitectura · el círculo

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
