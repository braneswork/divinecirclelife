/* Clientes y facturación mensual (como las hojas "Payments" y "Facturas"):
   cada cliente tiene un descuento negociado por producto, sus pedidos del mes
   se agrupan por producto y se emite un recibo correlativo. */

import type { Client, Invoice, InvoiceAdjustment, InvoiceLine, Order } from './types';
import { lineTotal } from './money';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/** Encuentra el cliente por nombre, alias o el comienzo del nombre ("manta" → Mantarraya Café). */
export function matchClient(name: string, clients: Client[]): Client | undefined {
  const n = norm(name);
  if (!n) return undefined;
  const active = clients.filter(c => c.active);
  return (
    active.find(c => norm(c.name) === n || c.aliases?.some(a => norm(a) === n)) ??
    (n.length >= 3 ? active.find(c => norm(c.name).startsWith(n) || norm(c.name).split(' ').some(w => w.startsWith(n) && n.length >= 4)) : undefined)
  );
}

export const monthOf = (iso: string) => iso.slice(0, 7);

/** Pedidos del cliente en el mes que aún no están en una factura. */
export function invoiceableOrders(orders: Order[], clientId: string, period: string) {
  return orders.filter(o => o.clientId === clientId && monthOf(o.date) === period && o.status !== 'cancelado' && !o.invoiceId);
}

/** Agrupa por producto y descuento: BURGER BUNS · 44 · ₡30.800 · 32 % · ₡20.944 */
export function invoiceLines(orders: Order[]): InvoiceLine[] {
  const acc = new Map<string, InvoiceLine>();
  for (const o of orders) {
    for (const it of o.items) {
      const d = it.discount ?? 0;
      const key = `${it.code}|${d}`;
      const cur = acc.get(key) ?? { code: it.code, name: it.name, qty: 0, subtotal: 0, discount: d, total: 0 };
      cur.qty += it.qty;
      cur.subtotal += it.qty * it.unitPrice;
      cur.total += lineTotal(it);
      acc.set(key, cur);
    }
  }
  return [...acc.values()].sort((a, b) => b.total - a.total);
}

export function invoiceTotals(inv: Pick<Invoice, 'lines' | 'adjustments'>) {
  const subtotal = inv.lines.reduce((s, l) => s + l.subtotal, 0);
  const afterDiscount = inv.lines.reduce((s, l) => s + l.total, 0);
  const adjustments = inv.adjustments.reduce((s, a) => s + a.amount, 0);
  return { subtotal, discount: subtotal - afterDiscount, afterDiscount, adjustments, total: afterDiscount + adjustments };
}

export function nextInvoiceNumber(invoices: Invoice[], start = 0): string {
  const max = invoices.reduce((m, i) => Math.max(m, Number(i.number) || 0), start);
  return String(max + 1).padStart(4, '0');
}

export function buildInvoice(args: {
  id: string; client: Client; period: string; date: string; orders: Order[];
  invoices: Invoice[]; adjustments?: InvoiceAdjustment[]; seqStart?: number; now: string;
}): Invoice {
  return {
    id: args.id,
    number: nextInvoiceNumber(args.invoices, args.seqStart),
    clientId: args.client.id,
    client: args.client.name,
    period: args.period,
    date: args.date,
    lines: invoiceLines(args.orders),
    adjustments: args.adjustments ?? [],
    orderIds: args.orders.map(o => o.id),
    status: 'abierta',
    createdAt: args.now,
  };
}
