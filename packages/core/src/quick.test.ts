import { describe, expect, it } from 'vitest';
import { parseQuick, resolveDay } from './quick';
import { SEED_OFFERINGS } from './seed';
import { bakeSummary } from './bake';
import { colones, orderTotal, payTotals } from './money';
import type { Offering, Order } from './types';

const TODAY = '2026-10-01'; // jueves
const cat: Offering[] = [
  ...SEED_OFFERINGS,
  { id: 's4p', projectId: 'x', kind: 'servicio', code: 'S4P', name: '4 Posts', price: 40000, active: true, public: false },
  { id: 'old', projectId: 'x', kind: 'producto', code: 'OLD', name: 'Viejo', price: 1, active: false, public: false },
];

const ok = (s: string) => {
  const r = parseQuick(s, cat, TODAY);
  if (!r.ok) throw new Error(`esperaba ok para "${s}", vino ${r.error}`);
  return r;
};

describe('parseQuick', () => {
  it('pedido simple', () => {
    const r = ok('1C Soleida');
    expect(r.client).toBe('Soleida');
    expect(r.date).toBe(TODAY);
    expect(r.lines.map(l => [l.offering.code, l.qty])).toEqual([['C', 1]]);
  });

  it('varios productos, minúsculas, con espacio y monto acordado', () => {
    const r = ok('2c 1 MS Soleida Rojas 9.000');
    expect(r.lines.map(l => [l.offering.code, l.qty])).toEqual([['C', 2], ['MS', 1]]);
    expect(r.client).toBe('Soleida Rojas');
    expect(r.amountOverride).toBe(9000);
  });

  it('el nombre puede ir antes', () => {
    expect(ok('Ana 3CR').client).toBe('Ana');
  });

  it('suma el mismo código repetido y acepta códigos con números', () => {
    const r = ok('1C 2C 1S4P Ana');
    expect(r.lines.map(l => [l.offering.code, l.qty])).toEqual([['C', 3], ['S4P', 1]]);
  });

  it('fecha, pagado y nota', () => {
    const r = ok('1C Juan @mañana pagado // sin semillas');
    expect(r.date).toBe('2026-10-02');
    expect(r.pay).toBe('paid');
    expect(r.note).toBe('sin semillas');
    expect(r.client).toBe('Juan');
  });

  it('crédito a favor y por defecto no pagó', () => {
    expect(ok('1C Ana credito').pay).toBe('credit');
    expect(ok('1C Ana crédito').pay).toBe('credit');
    expect(ok('1C Ana').pay).toBe('pending');
  });

  it('al editar conserva el día original si no se escribe @fecha', () => {
    const r = parseQuick('1C Ana', cat, TODAY, '2026-09-28');
    expect(r).toMatchObject({ ok: true, date: '2026-09-28' });
  });

  it('errores claros', () => {
    expect(parseQuick('', cat, TODAY)).toMatchObject({ ok: false, error: 'vacio' });
    expect(parseQuick('Soleida', cat, TODAY)).toMatchObject({ ok: false, error: 'sin_items' });
    expect(parseQuick('2C', cat, TODAY)).toMatchObject({ ok: false, error: 'sin_nombre' });
    expect(parseQuick('2XX Ana', cat, TODAY)).toMatchObject({ ok: false, error: 'codigo_desconocido', detail: 'XX' });
    expect(parseQuick('1OLD Ana', cat, TODAY)).toMatchObject({ ok: false, error: 'codigo_desconocido' });
    expect(parseQuick('1C Ana @nunca', cat, TODAY)).toMatchObject({ ok: false, error: 'fecha_invalida' });
  });
});

describe('resolveDay', () => {
  it('días de la semana hacia adelante', () => {
    expect(resolveDay('jue', TODAY)).toBe(TODAY);
    expect(resolveDay('vie', TODAY)).toBe('2026-10-02');
    expect(resolveDay('lunes', TODAY)).toBe('2026-10-05');
    expect(resolveDay('mie', TODAY)).toBe('2026-10-07');
  });
  it('día del mes y fecha completa', () => {
    expect(resolveDay('15', TODAY)).toBe('2026-10-15');
    expect(resolveDay('1', TODAY)).toBe(TODAY);
    expect(resolveDay('3/1', TODAY)).toBe('2027-01-03');
    expect(resolveDay('31/9', TODAY)).toBeNull();
  });
});

describe('totales', () => {
  const mk = (items: [string, number][], extra: Partial<Order> = {}): Order => ({
    id: Math.random().toString(), client: 'x', date: TODAY, status: 'pendiente', pay: 'pending', source: 'hub',
    createdAt: '', updatedAt: '',
    items: items.map(([code, qty]) => {
      const o = cat.find(c => c.code === code)!;
      return { offeringId: o.id, code, name: o.name, qty, unitPrice: o.price };
    }),
    ...extra,
  });

  it('total con y sin monto acordado', () => {
    expect(orderTotal(mk([['C', 2], ['MS', 1]]))).toBe(13000);
    expect(orderTotal(mk([['C', 2]], { amountOverride: 7000 }))).toBe(7000);
    expect(colones(13000)).toBe('₡13.000');
  });

  it('totales por marca de pago', () => {
    const t = payTotals([mk([['C', 1]], { pay: 'paid' }), mk([['C', 2]]), mk([['MS', 1]], { pay: 'credit' }), mk([['C', 9]], { status: 'cancelado' })]);
    expect(t).toEqual({ total: 17000, paid: 4000, pending: 8000, credit: 5000 });
  });

  it('resumen de horno ignora cancelados', () => {
    const s = bakeSummary([mk([['C', 2]]), mk([['C', 1], ['MS', 1]]), mk([['MS', 5]], { status: 'cancelado' })]);
    expect(s).toEqual([{ code: 'C', name: 'Campesino', qty: 3 }, { code: 'MS', name: 'Multiseeds', qty: 1 }]);
  });
});
