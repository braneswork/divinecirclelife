import type { Offering, Order, PayState } from './types';

const fmt = new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 });

/** ₡4.000 */
export const colones = (n: number) => (n < 0 ? '−' : '') + '₡' + fmt.format(Math.abs(Math.round(n))).replace(/\s/g, '.');

export const lineTotal = (it: Order["items"][number]) => Math.round(it.qty * it.unitPrice * (1 - (it.discount ?? 0)));

export const itemsTotal = (o: Pick<Order, 'items'>) =>
  o.items.reduce((s, it) => s + lineTotal(it), 0);

/** Total a cobrar: la suma de las líneas (o el monto acordado) menos el descuento de esta vez. */
export const orderTotal = (o: Pick<Order, 'items' | 'amountOverride' | 'discount'>) =>
  Math.max(0, (o.amountOverride ?? itemsTotal(o)) - (o.discount ?? 0));

/** Lo que ya entró de una venta: todo si está ✓, el abono si está ✕, nada si es crédito. */
export function orderPaid(o: Pick<Order, 'items' | 'amountOverride' | 'discount' | 'pay' | 'paidAmount'>) {
  const t = orderTotal(o);
  return o.pay === 'paid' ? t : o.pay === 'pending' ? Math.min(t, o.paidAmount ?? 0) : 0;
}

/** Lo que falta cobrar de una venta ✕ (el total menos su abono). */
export function orderDue(o: Pick<Order, 'items' | 'amountOverride' | 'discount' | 'pay' | 'paidAmount'>) {
  return o.pay === 'pending' ? orderTotal(o) - orderPaid(o) : 0;
}

/** El precio de una oferta para un día: el especial mientras dure, si no el normal. */
export function priceOn(o: Pick<Offering, 'price' | 'promoPrice' | 'promoUntil'>, date: string) {
  return o.promoPrice != null && o.promoUntil && date <= o.promoUntil ? o.promoPrice : o.price;
}

/** Totales por estado de pago (sin cancelados). */
export function payTotals(orders: Order[]) {
  const t = { total: 0, paid: 0, pending: 0, credit: 0 };
  for (const o of orders) {
    if (o.status === 'cancelado') continue;
    const v = orderTotal(o);
    t.total += v;
    if (o.pay === 'credit') t.credit += v;
    else { t.paid += orderPaid(o); t.pending += orderDue(o); }
  }
  return t;
}

export const PAY: Record<PayState, { mark: string; label: string; next: PayState }> = {
  paid: { mark: '✓', label: 'pagado', next: 'pending' },
  pending: { mark: '✕', label: 'no pagó', next: 'credit' },
  credit: { mark: '+', label: 'crédito', next: 'paid' },
};

export const STATUS_FLOW: Record<Exclude<Order['status'], 'cancelado'>, { label: string; next: Order['status'] }> = {
  pendiente: { label: 'por preparar', next: 'horneando' },
  horneando: { label: 'en proceso', next: 'listo' },
  listo: { label: 'listo', next: 'entregado' },
  entregado: { label: 'entregado', next: 'pendiente' },
};
