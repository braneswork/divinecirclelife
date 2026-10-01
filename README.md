# Divine Circle

Sistema de Divine Circle: pan de masa madre, experiencias humanas y los proyectos que nos rodean.

```
apps/hub        Hub interno en composición circular: ventas, experiencias, clientes, caja,
                círculo y productos, con + entrada (tienda) y − salida. Funciona sin señal.
apps/web        Web pública tipo revista; los pedidos caen directo al hub.
apps/kit        Vitrina del UI kit: pilares, color, tipografía y componentes.
packages/core   Modelo del círculo, pilares, entrada rápida de pedidos, totales (con pruebas).
packages/ui     UI kit circular: Stage, Bubble, panal, espiral de Doyle, Zoom, Photo, Shop…
packages/brand  Paleta, fuentes, logos e imágenes de los pilares.
supabase/       Esquema de la base de datos (proyecto nuevo de Supabase).
```

## Uso

```bash
npm install
npm run dev:hub      # hub en http://localhost:5173
npm run dev:web      # web
npm run dev:kit      # UI kit
npm test             # pruebas del core
npm run typecheck
npm run build        # genera apps/*/dist
```

Sin variables de entorno, el hub guarda en el dispositivo y la web muestra el catálogo semilla.
Para conectar Supabase copia `apps/hub/.env.example` a `apps/hub/.env.local` (y lo mismo en `apps/web`).

## Ayuda

Cómo se usa el hub: [docs/AYUDA.md](docs/AYUDA.md) (también dentro del hub con **?**).

Más detalle en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).
