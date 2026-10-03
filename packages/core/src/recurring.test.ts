import { describe, expect, it } from 'vitest';
import { materialize, occursOn, perWeek, recurringValue, removableFuture, duplicateRecurring, stableId } from './recurring';
import { parseQuick } from './quick';
import { SEED_CLIENTS, SEED_OFFERINGS } from './seed';
import type { Order, Recurring } from './types';

const TODAY = '2026-10-01'; // jueves
const manta = SEED_CLIENTS[0];
const base: Recurring = {
  id: 'r1', client: manta.name, clientId: manta.id, items: [{ offeringId: 'pan-bb', qty: 16 }],
  weekdays: [5], every: 1, start: TODAY, pay: 'pending', active: true, skips: [], createdAt: '',
};
let n = 0;
const gen = (r: Recurring[], orders: Order[] = [], to = '2026-10-14') =>
  materialize({ recurring: r, orders, offerings: SEED_OFFERINGS, clients: SEED_CLIENTS, from: TODAY, to, now: 'x', newId: () => 'o' + n++ });

describe('pedidos fijos', () => {
  it('genera los viernes de las próximas dos semanas con el descuento del cliente', () => {
    const out = gen([base]);
    expect(out.map(o => o.date)).toEqual(['2026-10-02', '2026-10-09']);
    expect(out[0]).toMatchObject({ client: 'Mantarraya Café', recurringId: 'r1', status: 'pendiente' });
    expect(out[0].items[0]).toMatchObject({ code: 'BB', qty: 16, discount: 0.32 });
    expect(recurringValue(base, SEED_OFFERINGS, manta)).toBe(7616);
  });

  it('no duplica, respeta días saltados, pausa y fin', () => {
    const first = gen([base]);
    expect(gen([base], first)).toEqual([]);
    expect(gen([{ ...base, skips: ['2026-10-02'] }]).map(o => o.date)).toEqual(['2026-10-09']);
    expect(gen([{ ...base, active: false }])).toEqual([]);
    expect(gen([{ ...base, until: '2026-10-05' }]).map(o => o.date)).toEqual(['2026-10-02']);
  });

  it('varios días y quincenal', () => {
    const lj = { ...base, weekdays: [1, 4] };
    expect(gen([lj]).map(o => o.date)).toEqual(['2026-10-01', '2026-10-05', '2026-10-08', '2026-10-12']);
    const q = { ...base, every: 2 as const };
    expect(gen([q], [], '2026-10-31').map(o => o.date)).toEqual(['2026-10-02', '2026-10-16', '2026-10-30']);
    expect(perWeek(lj)).toBe(2);
    expect(perWeek(q)).toBe(0.5);
    expect(occursOn(base, '2026-09-25')).toBe(false); // antes de empezar
  });

  it('solo se quitan las futuras que no se han tocado', () => {
    const [a, b] = gen([base]);
    const orders = [a, { ...b, pay: 'paid' as const }];
    expect(removableFuture(orders, 'r1', TODAY).map(o => o.date)).toEqual(['2026-10-02']);
  });

  it('"semanal" en la venta rápida', () => {
    const r = parseQuick('16BB Mantarraya @vie semanal', SEED_OFFERINGS, TODAY);
    expect(r).toMatchObject({ ok: true, weekly: true, date: '2026-10-02', client: 'Mantarraya' });
    expect(parseQuick('1C Ana', SEED_OFFERINGS, TODAY)).toMatchObject({ weekly: false });
  });
});

describe('ids estables y duplicados', () => {
  it('el mismo fijo y día da el mismo id en cualquier dispositivo', () => {
    expect(stableId('r1|2026-10-02')).toBe(stableId('r1|2026-10-02'));
    expect(stableId('r1|2026-10-02')).not.toBe(stableId('r1|2026-10-03'));
    expect(stableId('r1|2026-10-02')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  it('de dos ventas del mismo fijo y día se queda la que ya se cobró', () => {
    const base = { client: 'Manta', recurringId: 'r1', date: '2026-10-02', items: [], status: 'pendiente', pay: 'pending', source: 'hub', createdAt: 'a', updatedAt: 'a' } as const;
    const a = { ...base, id: 'a' }, b = { ...base, id: 'b', pay: 'paid' as const }, c = { ...base, id: 'c', date: '2026-10-03' };
    expect(duplicateRecurring([a, b, c]).map(o => o.id)).toEqual(['a']);
  });
});
