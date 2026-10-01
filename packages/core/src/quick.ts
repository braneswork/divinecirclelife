/* Entrada rápida de pedidos, como en las notas:
     "1C Soleida"            → 1 Campesino para Soleida, hoy
     "2C 1MS Soleida 9000"   → monto acordado ₡9.000
     "3CR Ana @vie"          → para el próximo viernes
     "1C Juan @mañana // sin semillas pagado"
   Reglas:
   - <cantidad><CÓDIGO> (con o sin espacio) agrega una línea; el código debe existir.
   - @hoy, @mañana, @pasado, @lun…@dom, @15 o @15/10 fija el día.
   - "pagado" marca el pedido como pagado.
   - lo que viene después de "//" es una nota.
   - un número suelto al final del nombre es el monto acordado.
   - todo lo demás es el nombre del cliente. */

import type { Offering } from './types';
import { addDays, fromISODate, toISODate } from './dates';

export interface QuickLine {
  offering: Offering;
  qty: number;
}

export type QuickResult =
  | {
      ok: true;
      lines: QuickLine[];
      client: string;
      date: string;
      amountOverride?: number;
      paid: boolean;
      note?: string;
    }
  | { ok: false; error: 'vacio' | 'sin_items' | 'sin_nombre' | 'codigo_desconocido' | 'fecha_invalida'; detail?: string };

const WEEKDAYS: Record<string, number> = {
  dom: 0, domingo: 0,
  lun: 1, lunes: 1,
  mar: 2, martes: 2,
  mie: 3, mié: 3, miercoles: 3, miércoles: 3,
  jue: 4, jueves: 4,
  vie: 5, viernes: 5,
  sab: 6, sáb: 6, sabado: 6, sábado: 6,
};

/** Resuelve el texto de una @fecha a YYYY-MM-DD, siempre hacia adelante. */
export function resolveDay(token: string, today: string): string | null {
  const t = token.toLowerCase();
  if (t === 'hoy') return today;
  if (t === 'mañana' || t === 'manana') return addDays(today, 1);
  if (t === 'pasado') return addDays(today, 2);
  if (t in WEEKDAYS) {
    const diff = (WEEKDAYS[t] - fromISODate(today).getDay() + 7) % 7;
    return addDays(today, diff);
  }
  const m = t.match(/^(\d{1,2})(?:\/(\d{1,2}))?$/);
  if (m) {
    const base = fromISODate(today);
    const day = Number(m[1]);
    const month = m[2] ? Number(m[2]) - 1 : base.getMonth();
    let d = new Date(base.getFullYear(), month, day);
    if (d.getMonth() !== month || d.getDate() !== day) return null;
    if (toISODate(d) < today) {
      d = m[2] ? new Date(base.getFullYear() + 1, month, day) : new Date(base.getFullYear(), month + 1, day);
      if (d.getDate() !== day) return null;
    }
    return toISODate(d);
  }
  return null;
}

/** defaultDate: día si no se escribe @fecha (al editar, el día original del pedido). */
export function parseQuick(input: string, catalog: Offering[], today: string, defaultDate = today): QuickResult {
  let text = (input ?? '').trim();
  if (!text) return { ok: false, error: 'vacio' };

  let note: string | undefined;
  const slash = text.indexOf('//');
  if (slash >= 0) {
    note = text.slice(slash + 2).trim() || undefined;
    text = text.slice(0, slash);
  }

  let date = defaultDate;
  let paid = false;
  const rest: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (word.startsWith('@')) {
      const d = resolveDay(word.slice(1), today);
      if (!d) return { ok: false, error: 'fecha_invalida', detail: word };
      date = d;
    } else if (/^pagado$/i.test(word)) {
      paid = true;
    } else {
      rest.push(word);
    }
  }
  text = rest.join(' ');

  const byCode = new Map(catalog.filter(o => o.active).map(o => [o.code.toUpperCase(), o]));
  const lines: QuickLine[] = [];
  const unknown: string[] = [];
  // cantidad + código pegados o separados por espacio: "2C", "2 C", "1MS", "1S4P"
  const name = text
    .replace(/(?:^|\s)(\d+)\s*([A-Za-zÑñ][A-Za-z0-9Ññ]*)(?=\s|$)/g, (whole, qty: string, code: string) => {
      const o = byCode.get(code.toUpperCase());
      if (!o) {
        // "Ana 2" o "9000" no son ítems; solo cuenta como desconocido si parece código
        if (/^[A-ZÑ0-9]+$/.test(code)) unknown.push(code);
        else return whole;
        return ' ';
      }
      const existing = lines.find(l => l.offering.id === o.id);
      if (existing) existing.qty += Number(qty);
      else lines.push({ offering: o, qty: Number(qty) });
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();

  if (unknown.length) return { ok: false, error: 'codigo_desconocido', detail: unknown.join(', ') };
  if (!lines.length) return { ok: false, error: 'sin_items' };

  const parts = name ? name.split(' ') : [];
  let amountOverride: number | undefined;
  const last = parts[parts.length - 1];
  if (last && /^₡?\d[\d.,]*$/.test(last)) {
    amountOverride = Number(last.replace(/[₡.,]/g, ''));
    parts.pop();
  }
  const client = parts.join(' ').trim();
  if (!client) return { ok: false, error: 'sin_nombre' };

  return { ok: true, lines, client, date, amountOverride, paid, note };
}

export const QUICK_ERRORS: Record<Exclude<QuickResult, { ok: true }>['error'], string> = {
  vacio: 'Escribe algo como "1C Soleida"',
  sin_items: 'Falta cantidad y código, ej. "2C"',
  sin_nombre: 'Falta el nombre de quien pide',
  codigo_desconocido: 'Código no reconocido',
  fecha_invalida: 'No entendí la fecha',
};
