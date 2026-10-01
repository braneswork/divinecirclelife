import type { Order } from './types';

const fmt = new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 });

/** ₡4.000 */
export const colones = (n: number) => '₡' + fmt.format(Math.round(n)).replace(/\s/g, '.');

export const itemsTotal = (o: Pick<Order, 'items'>) =>
  o.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);

export const orderTotal = (o: Pick<Order, 'items' | 'amountOverride'>) =>
  o.amountOverride ?? itemsTotal(o);
