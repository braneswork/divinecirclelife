import { describe, expect, it } from 'vitest';
import { buildInvoice, invoiceTotals, invoiceableOrders, matchClient, nextInvoiceNumber } from './billing';
import { summarize, monthRange } from './finance';
import { SEED_CLIENTS, SEED_OFFERINGS, INVOICE_SEQ_START } from './seed';
import type { Expense, Order } from './types';

const bb = SEED_OFFERINGS.find(o => o.code === 'BB')!;
const c = SEED_OFFERINGS.find(o => o.code === 'C')!;
const manta = SEED_CLIENTS[0];

const order = (date: string, lines: [typeof bb, number][], extra: Partial<Order> = {}): Order => ({
  id: Math.random().toString(36).slice(2), client: manta.name, clientId: manta.id, date, status: 'entregado', pay: 'pending',
  source: 'hub', createdAt: '', updatedAt: '',
  items: lines.map(([o, qty]) => ({ offeringId: o.id, code: o.code, name: o.name, qty, unitPrice: o.price, discount: manta.discounts[o.id] })),
  ...extra,
});

describe('clientes', () => {
  it('reconoce por nombre, alias o comienzo', () => {
    expect(matchClient('Mantarraya', SEED_CLIENTS)?.id).toBe('mantarraya');
    expect(matchClient('manta', SEED_CLIENTS)?.id).toBe('mantarraya');
    expect(matchClient('MANTARRAYA CAFE', SEED_CLIENTS)?.id).toBe('mantarraya');
    expect(matchClient('Soleida', SEED_CLIENTS)).toBeUndefined();
    expect(matchClient('ba', SEED_CLIENTS)).toBeUndefined();
  });
});

describe('factura mensual', () => {
  it('reproduce la factura de septiembre de Mantarraya (hoja Facturas - Sep)', () => {
    const orders = [order('2026-09-09', [[bb, 16]]), order('2026-09-19', [[bb, 14]]), order('2026-09-19', [[bb, 14]]), order('2026-10-02', [[bb, 10]])];
    const sept = invoiceableOrders(orders, manta.id, '2026-09');
    expect(sept).toHaveLength(3);
    const inv = buildInvoice({ id: 'x', client: manta, period: '2026-09', date: '2026-09-30', orders: sept, invoices: [], seqStart: INVOICE_SEQ_START, now: '' });
    expect(inv.number).toBe('0006');
    expect(inv.lines).toEqual([{ code: 'BB', name: 'Burger Bun', qty: 44, subtotal: 30800, discount: 0.32, total: 20944 }]);
    expect(invoiceTotals(inv).total).toBe(20944);
  });

  it('descuento distinto por producto y ajustes (préstamo)', () => {
    const inv = buildInvoice({
      id: 'y', client: manta, period: '2026-04', date: '2026-04-30', orders: [order('2026-04-03', [[bb, 10], [c, 5]])],
      invoices: [], adjustments: [{ label: 'Préstamo 2025', amount: -5000 }], now: '',
    });
    const t = invoiceTotals(inv);
    expect(t.subtotal).toBe(7000 + 20000);
    expect(t.afterDiscount).toBeCloseTo(4760 + 14000);
    expect(t.total).toBeCloseTo(4760 + 14000 - 5000);
  });

  it('número correlativo', () => {
    expect(nextInvoiceNumber([{ number: '0009' } as never], 5)).toBe('0010');
  });
});

describe('plata del mes', () => {
  it('ventas, cobrado, por cobrar, crédito, salidas y balance', () => {
    const { from, to } = monthRange('2026-09');
    expect(to).toBe('2026-09-30');
    const orders = [
      order('2026-09-02', [[c, 1]], { pay: 'paid', client: 'Ana', clientId: undefined, items: [{ offeringId: c.id, code: 'C', name: 'Campesino', qty: 1, unitPrice: 4000 }] }),
      order('2026-09-09', [[bb, 10]]),
      order('2026-09-10', [[c, 1]], { pay: 'credit', client: 'Lu', clientId: undefined, items: [{ offeringId: c.id, code: 'C', name: 'Campesino', qty: 1, unitPrice: 4000 }] }),
      order('2026-08-30', [[c, 9]], { pay: 'paid' }),
    ];
    const expenses: Expense[] = [{ id: 'e', date: '2026-09-05', type: 'super', amount: 1500, createdAt: '' }];
    const s = summarize({ orders, expenses, invoices: [], offerings: SEED_OFFERINGS, from, to });
    expect(s.ventas).toBeCloseTo(4000 + 4760 + 4000);
    expect(s.cobrado).toBe(4000);
    expect(s.porCobrar).toBeCloseTo(4760);
    expect(s.credito).toBe(4000);
    expect(s.salidas).toBe(1500);
    expect(s.balance).toBe(2500);
    expect(s.deudores).toEqual([{ client: 'Mantarraya Café', value: expect.closeTo(4760) }]);
    expect(s.porFamilia[0].key).toBe('pan');
  });
});

import { offeringStats } from './finance';
describe('lo que generó cada oferta', () => {
  it('unidades, ingresos con descuento y quién más lo pide', () => {
    const orders = [order('2026-09-09', [[bb, 16]]), order('2026-09-19', [[bb, 14]]), order('2026-09-20', [[c, 1]], { client: 'Ana', clientId: undefined, items: [{ offeringId: c.id, code: 'C', name: 'Campesino', qty: 1, unitPrice: 4000 }] }), order('2026-09-21', [[bb, 99]], { status: 'cancelado' })];
    const st = offeringStats(orders, '2026-09-01', '2026-09-30');
    expect(st.get(bb.id)).toMatchObject({ units: 30, orders: 2, topClients: [{ client: 'Mantarraya Café', units: 30 }] });
    expect(st.get(bb.id)!.revenue).toBe(7616 + 6664);
    expect(st.get(c.id)!.revenue).toBe(4000);
  });
});
