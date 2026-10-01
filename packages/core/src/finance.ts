/* La plata en general: ventas de todo (productos, experiencias, servicios),
   cobrado, por cobrar, crédito, salidas y balance de un periodo. */

import type { Expense, Invoice, Offering, Order } from './types';
import { lineTotal, orderTotal } from './money';
import { invoiceTotals } from './billing';

export interface MoneySummary {
  ventas: number;
  cobrado: number;
  porCobrar: number;
  credito: number;
  salidas: number;
  balance: number;
  pedidos: number;
  /** ventas por familia: pan, bebidas, experiencias, servicios… */
  porFamilia: { key: string; value: number }[];
  /** lo que falta cobrar por cliente */
  deudores: { client: string; value: number }[];
  /** salidas por tipo */
  porTipo: { key: string; value: number }[];
  facturasAbiertas: number;
}

export const inPeriod = (iso: string, from: string, to: string) => iso >= from && iso <= to;

export function summarize(args: {
  orders: Order[]; expenses: Expense[]; invoices: Invoice[]; offerings: Offering[]; from: string; to: string;
}): MoneySummary {
  const { from, to } = args;
  const orders = args.orders.filter(o => o.status !== 'cancelado' && inPeriod(o.date, from, to));
  const expenses = args.expenses.filter(e => inPeriod(e.date, from, to));
  const byId = new Map(args.offerings.map(o => [o.id, o]));

  let ventas = 0, cobrado = 0, porCobrar = 0, credito = 0;
  const fam = new Map<string, number>();
  const debt = new Map<string, number>();
  for (const o of orders) {
    const v = orderTotal(o);
    ventas += v;
    if (o.pay === 'paid') cobrado += v;
    else if (o.pay === 'credit') credito += v;
    else { porCobrar += v; debt.set(o.client, (debt.get(o.client) ?? 0) + v); }
    // reparte el total del pedido entre familias en proporción a sus líneas
    const lines = o.items.map(it => ({ it, v: lineTotal(it) }));
    const sum = lines.reduce((s, l) => s + l.v, 0) || 1;
    for (const { it, v: lv } of lines) {
      const off = byId.get(it.offeringId);
      const key = off ? (off.kind === 'producto' ? off.category ?? 'productos' : off.kind === 'experiencia' ? 'experiencias' : 'servicios') : 'otros';
      fam.set(key, (fam.get(key) ?? 0) + (v * lv) / sum);
    }
  }
  const tipo = new Map<string, number>();
  let salidas = 0;
  for (const e of expenses) { salidas += e.amount; tipo.set(e.type, (tipo.get(e.type) ?? 0) + e.amount); }

  const sorted = (m: Map<string, number>) => [...m].map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value);
  return {
    ventas, cobrado, porCobrar, credito, salidas,
    balance: cobrado - salidas,
    pedidos: orders.length,
    porFamilia: sorted(fam),
    deudores: [...debt].map(([client, value]) => ({ client, value })).sort((a, b) => b.value - a.value),
    porTipo: sorted(tipo),
    facturasAbiertas: args.invoices.filter(i => i.status === 'abierta' && inPeriod(i.date, from, to)).reduce((s, i) => s + invoiceTotals(i).total, 0),
  };
}

export function monthRange(period: string) {
  const [y, m] = period.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${period}-01`, to: `${period}-${String(last).padStart(2, '0')}` };
}
