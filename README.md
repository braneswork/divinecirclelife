# Divine Circle

Sistema de Divine Circle: pan de masa madre, experiencias humanas y los proyectos que nos rodean.

```
apps/hub        Hub interno en composición circular: pedidos, clientes, caja, experiencias,
                círculo y catálogo. Funciona sin señal.
apps/web        Web pública tipo revista; los pedidos caen directo al hub.
apps/kit        Vitrina del UI kit: pilares, color, tipografía y componentes.
packages/core   Modelo del círculo, pilares, entrada rápida de pedidos, totales (con pruebas).
packages/ui     UI kit circular: Stage, Bubble, panal, espiral de Doyle, Zoom, IconNav, Focus, PayMark…
packages/brand  Paleta, fuentes, logos e imágenes de los pilares.
supabase/       Esquema de la base de datos (proyecto nuevo de Supabase).
legacy/hub-v1   Hub anterior (derivado de Take Off), solo como referencia.
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

## Pedidos rápidos (hub)

| Escribes | Significa |
|---|---|
| `1C Soleida` | 1 Campesino para Soleida, hoy |
| `2C 1MS Ana 9000` | 2 Campesino + 1 Multiseeds, monto acordado ₡9.000 |
| `3CR Juan @vie` | para el próximo viernes (`@hoy`, `@mañana`, `@lun`…`@dom`, `@15`, `@15/10`) |
| `1C Lu pagado // sin semillas` | marca ✓ pagado, con nota |
| `1C Lu credito` | marca + crédito a favor (por defecto: ✕ no pagó) |
| `16BB Mantarraya` | cliente registrado: aplica su descuento (32 %) y va a su factura mensual |

Salidas en Caja: `25000 super`, `12000 gas @ayer // tanque`.

Los códigos se editan en **Catálogo**. Para editar un pedido: «editar» lo devuelve al campo de texto.

Más detalle en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).
