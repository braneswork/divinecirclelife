/* Pedidos fijos: generan las ventas de los próximos días, una por fecha.
   Nunca generan en el pasado ni duplican (por recurringId + fecha), y respetan
   los días saltados (cuando se borró esa venta). */

import type { Client, Offering, Order, Recurring } from './types';
import { addDays, fromISODate } from './dates';
import { lineTotal } from './money';

export const WEEKDAY_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
/** Orden de la semana para mostrar: lunes primero. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const weeksBetween = (a: string, b: string) => Math.floor((fromISODate(b).getTime() - fromISODate(a).getTime()) / (7 * 864e5));

/** ¿Este fijo cae en esta fecha? */
export function occursOn(r: Recurring, date: string): boolean {
  if (!r.active || date < r.start || (r.until && date > r.until) || r.skips.includes(date)) return false;
  if (!r.weekdays.includes(fromISODate(date).getDay())) return false;
  if (r.every === 2) {
    // la quincena se ancla en el lunes de la semana de inicio
    const startMonday = addDays(r.start, -((fromISODate(r.start).getDay() + 6) % 7));
    return weeksBetween(startMonday, date) % 2 === 0;
  }
  return true;
}

export function recurringLines(r: Recurring, offerings: Offering[], client?: Client) {
  return r.items.flatMap(it => {
    const o = offerings.find(x => x.id === it.offeringId);
    if (!o || it.qty <= 0) return [];
    const discount = client?.discounts[o.id];
    return [{ offeringId: o.id, code: o.code, name: o.name, qty: it.qty, unitPrice: o.price, ...(discount ? { discount } : {}) }];
  });
}

/** Valor de una ocurrencia (con el precio y descuento de hoy). */
export const recurringValue = (r: Recurring, offerings: Offering[], client?: Client) =>
  recurringLines(r, offerings, client).reduce((s, it) => s + lineTotal(it), 0);

/** Ocurrencias por semana (0.5 si es quincenal). */
export const perWeek = (r: Recurring) => r.weekdays.length / r.every;

/** Ventas que faltan crear entre `from` y `to` (incluidos). */
export function materialize(args: {
  recurring: Recurring[]; orders: Order[]; offerings: Offering[]; clients: Client[];
  from: string; to: string; now: string; newId: () => string;
}): Order[] {
  const have = new Set(args.orders.filter(o => o.recurringId).map(o => `${o.recurringId}|${o.date}`));
  const out: Order[] = [];
  for (let d = args.from; d <= args.to; d = addDays(d, 1)) {
    for (const r of args.recurring) {
      if (!occursOn(r, d) || have.has(`${r.id}|${d}`)) continue;
      const client = args.clients.find(c => c.id === r.clientId);
      const items = recurringLines(r, args.offerings, client);
      if (!items.length) continue;
      out.push({
        id: args.newId(), client: r.client, clientId: r.clientId, recurringId: r.id, date: d, items,
        status: 'pendiente', pay: r.pay, note: r.note, source: 'hub', createdAt: args.now, updatedAt: args.now,
      });
    }
  }
  return out;
}

/** Ventas futuras de un fijo que todavía se pueden quitar (sin preparar, sin cobrar, sin factura). */
export const removableFuture = (orders: Order[], recurringId: string, from: string) =>
  orders.filter(o => o.recurringId === recurringId && o.date >= from && o.status === 'pendiente' && o.pay !== 'paid' && !o.invoiceId);
