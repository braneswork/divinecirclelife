import type { Order, PayState } from './types';

const fmt = new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 });

/** ₡4.000 */
export const colones = (n: number) => (n < 0 ? '−' : '') + '₡' + fmt.format(Math.abs(Math.round(n))).replace(/\s/g, '.');

export const lineTotal = (it: Order["items"][number]) => Math.round(it.qty * it.unitPrice * (1 - (it.discount ?? 0)));

export const itemsTotal = (o: Pick<Order, 'items'>) =>
  o.items.reduce((s, it) => s + lineTotal(it), 0);

export const orderTotal = (o: Pick<Order, 'items' | 'amountOverride'>) =>
  o.amountOverride ?? itemsTotal(o);

/** Totales por estado de pago (sin cancelados). */
export function payTotals(orders: Order[]) {
  const t = { total: 0, paid: 0, pending: 0, credit: 0 };
  for (const o of orders) {
    if (o.status === 'cancelado') continue;
    const v = orderTotal(o);
    t.total += v;
    t[o.pay] += v;
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
