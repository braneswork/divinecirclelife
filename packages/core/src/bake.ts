import type { Order } from './types';

export interface BakeLine {
  code: string;
  name: string;
  qty: number;
}

/** Cuánto hay que hornear: suma por producto de los pedidos no cancelados. */
export function bakeSummary(orders: Order[]): BakeLine[] {
  const acc = new Map<string, BakeLine>();
  for (const o of orders) {
    if (o.status === 'cancelado') continue;
    for (const it of o.items) {
      const cur = acc.get(it.offeringId);
      if (cur) cur.qty += it.qty;
      else acc.set(it.offeringId, { code: it.code, name: it.name, qty: it.qty });
    }
  }
  return [...acc.values()].sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
}
