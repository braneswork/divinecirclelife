# Divine Circle

Sistema de Divine Circle: pan de masa madre, experiencias humanas y los proyectos que nos rodean.

```
apps/hub        Hub interno en composición circular (pan, catálogo, círculo). Funciona sin señal.
apps/web        Web pública tipo revista; los pedidos caen directo al hub.
packages/core   Modelo del círculo, entrada rápida de pedidos, totales (con pruebas).
packages/brand  Paleta, fuentes y logos compartidos.
supabase/       Esquema de la base de datos (proyecto nuevo de Supabase).
legacy/hub-v1   Hub anterior (derivado de Take Off), solo como referencia.
```

## Uso

```bash
npm install
npm run dev:hub      # hub en http://localhost:5173
npm run dev:web      # web
npm test             # pruebas del core
npm run typecheck
npm run build        # genera apps/*/dist
```

Sin variables de entorno, el hub guarda en el dispositivo y la web muestra el catálogo semilla.
Para conectar Supabase copia `apps/hub/.env.example` a `apps/hub/.env.local` (y lo mismo en `apps/web`).

## Pedidos rápidos (hub)

| Escribes | Significa |
|---|---|
| `1C Soleida` | 1 Campesino para Soleida, hoy |
| `2C 1MS Ana 9000` | 2 Campesino + 1 Multiseeds, monto acordado ₡9.000 |
| `3CR Juan @vie` | para el próximo viernes (`@hoy`, `@mañana`, `@lun`…`@dom`, `@15`, `@15/10`) |
| `1C Lu pagado // sin semillas` | marcado como pagado, con nota |

Los códigos se editan en **Catálogo**. Para editar un pedido: «editar» lo devuelve al campo de texto.

Más detalle en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).
