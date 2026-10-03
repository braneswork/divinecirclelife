/* Pedidos fijos: generan las ventas de los próximos días, una por fecha.
   Nunca generan en el pasado ni duplican (por recurringId + fecha), y respetan
   los días saltados (cuando se borró esa venta). */

import type { Client, Offering, Order, Recurring } from './types';
import { addDays, fromISODate } from './dates';
import { lineTotal, priceOn } from './money';

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

export function recurringLines(r: Recurring, offerings: Offering[], client?: Client, date = new Date().toISOString().slice(0, 10)) {
  return r.items.flatMap(it => {
    const o = offerings.find(x => x.id === it.offeringId);
    if (!o || it.qty <= 0) return [];
    const discount = client?.discounts[o.id];
    return [{ offeringId: o.id, code: o.code, name: o.name, qty: it.qty, unitPrice: priceOn(o, date), ...(discount ? { discount } : {}) }];
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
  from: string; to: string; now: string; newId?: (key: string) => string;
}): Order[] {
  const have = new Set(args.orders.filter(o => o.recurringId).map(o => `${o.recurringId}|${o.date}`));
  const out: Order[] = [];
  for (let d = args.from; d <= args.to; d = addDays(d, 1)) {
    for (const r of args.recurring) {
      if (!occursOn(r, d) || have.has(`${r.id}|${d}`)) continue;
      const client = args.clients.find(c => c.id === r.clientId);
      const items = recurringLines(r, args.offerings, client, d);
      if (!items.length) continue;
      out.push({
        id: (args.newId ?? stableId)(`${r.id}|${d}`), client: r.client, clientId: r.clientId, recurringId: r.id, date: d, items,
        status: 'pendiente', pay: r.pay, note: r.note, source: 'hub', createdAt: args.now, updatedAt: args.now,
      });
    }
  }
  return out;
}

/** Ventas futuras de un fijo que todavía se pueden quitar (sin preparar, sin cobrar, sin factura). */
export const removableFuture = (orders: Order[], recurringId: string, from: string) =>
  orders.filter(o => o.recurringId === recurringId && o.date >= from && o.status === 'pendiente' && o.pay !== 'paid' && !o.invoiceId);

/** Un uuid que siempre es el mismo para la misma clave: así el teléfono y la
   computadora crean la misma venta de un fijo y no se duplica al sincronizar. */
export function stableId(key: string): string {
  let h = '';
  for (let seed = 0; h.length < 32; seed++) {
    let a = 0x811c9dc5 ^ seed;
    for (let i = 0; i < key.length; i++) { a ^= key.charCodeAt(i); a = Math.imul(a, 0x01000193); }
    a ^= a >>> 13; a = Math.imul(a, 0x5bd1e995); a ^= a >>> 15;
    h += (a >>> 0).toString(16).padStart(8, '0');
  }
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Ventas repetidas de un mismo fijo en el mismo día (de antes de los ids
   estables): se queda la más trabajada y devuelve las que sobran. */
export function duplicateRecurring(orders: Order[]): Order[] {
  const groups = new Map<string, Order[]>();
  for (const o of orders) if (o.recurringId) {
    const k = `${o.recurringId}|${o.date}`;
    groups.set(k, [...(groups.get(k) ?? []), o]);
  }
  const score = (o: Order) => (o.invoiceId ? 8 : 0) + (o.pay !== 'pending' || o.paidAmount ? 4 : 0) + (o.status !== 'pendiente' ? 2 : 0) + (o.id === stableId(`${o.recurringId}|${o.date}`) ? 1 : 0);
  const drop: Order[] = [];
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const keep = [...g].sort((a, b) => score(b) - score(a) || a.createdAt.localeCompare(b.createdAt))[0];
    drop.push(...g.filter(o => o !== keep));
  }
  return drop;
}
