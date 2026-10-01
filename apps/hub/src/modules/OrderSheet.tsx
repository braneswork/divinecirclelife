/* La ficha de una venta: la misma para la tienda (+ entrada), la venta rápida
   y "editar". Cantidades, agregar productos, cliente, día, si se repite cada
   semana, marca de pago y nota. */

import { useState } from 'react';
import { PAY, WEEKDAY_SHORT, WEEK_ORDER, addDays, colones, fromISODate, matchClient, type PayState, type Recurring } from '@dc/core';
import { PayMark, Sheet, Stepper, cartLines, useToast, type Cart } from '@dc/ui';
import { now as nowIso, saveOrder, saveRecurring, today, updateOrder, useStore } from '../store';
import { HelpDot } from '../HelpDot';

export interface OrderDraft {
  cart: Cart;
  client?: string;
  date?: string;
  pay?: PayState;
  note?: string;
  weekly?: boolean;
  amountOverride?: number;
}

export function OrderSheet({ initial, editId, onCart, onClose, onDone }: {
  initial: OrderDraft;
  /** venta que se está editando */
  editId?: string;
  /** para devolverle a la tienda los cambios de cantidades */
  onCart?: (c: Cart) => void;
  onClose: () => void;
  onDone: (client: string, date: string) => void;
}) {
  const offerings = useStore(s => s.offerings);
  const clients = useStore(s => s.clients);
  const editing = useStore(s => s.orders.find(o => o.id === editId));
  const toast = useToast();
  const now = today();
  const [cart, setCartState] = useState<Cart>(initial.cart);
  const [client, setClient] = useState(initial.client ?? '');
  const [date, setDate] = useState(initial.date ?? now);
  const [pay, setPay] = useState<PayState>(initial.pay ?? 'pending');
  const [note, setNote] = useState(initial.note ?? '');
  const [weekly, setWeekly] = useState(!!initial.weekly);
  const [days, setDays] = useState<number[]>(initial.weekly ? [fromISODate(initial.date ?? now).getDay()] : []);
  const [override, setOverride] = useState(initial.amountOverride);
  const [adding, setAdding] = useState(false);

  const setCart = (c: Cart) => { setCartState(c); setOverride(undefined); onCart?.(c); };
  const lines = cartLines(cart, offerings);
  const known = matchClient(client, clients);
  const lineTotal = (id: string, qty: number, price: number) => Math.round(qty * price * (1 - (known?.discounts[id] ?? 0)));
  const total = override ?? lines.reduce((s, l) => s + lineTotal(l.offering.id, l.qty, l.offering.price), 0);
  const others = offerings.filter(o => o.active && !(cart[o.id] > 0));
  const week = Array.from({ length: 7 }, (_, i) => addDays(now, i));
  const dates = week.includes(date) ? week : [date, ...week];
  const isFijo = !!editing?.recurringId;

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!lines.length) return toast('Agrega al menos un producto');
    if (!client.trim()) return toast('¿Para quién es?');
    const name = known?.name ?? client.trim();
    const weekdays = days.length ? days : [fromISODate(date).getDay()];
    const recurring = (): Recurring => ({
      id: crypto.randomUUID(), client: name, clientId: known?.id,
      items: lines.map(l => ({ offeringId: l.offering.id, qty: l.qty })), weekdays, every: 1, start: date,
      pay, note: note.trim() || undefined, active: true, skips: [], createdAt: nowIso(),
    });
    if (editing) {
      saveOrder({ lines, client: client.trim(), date, pay, note: note.trim() || undefined, amountOverride: override }, editing.id);
      const patch: Parameters<typeof updateOrder>[1] = { pay };
      if (weekly && !isFijo) {
        const r = recurring();
        patch.recurringId = r.id;
        updateOrder(editing.id, patch);
        saveRecurring(r);
        toast(`Fijo creado: cada ${weekdays.map(w => WEEKDAY_SHORT[w]).join(', ')}`);
      } else updateOrder(editing.id, patch);
      return onDone(name, date);
    }
    if (weekly) {
      saveRecurring(recurring());
      toast(`Fijo creado: cada ${weekdays.map(w => WEEKDAY_SHORT[w]).join(', ')}`);
      return onDone(name, date);
    }
    const o = saveOrder({ lines, client: client.trim(), date, pay, note: note.trim() || undefined, amountOverride: override });
    onDone(o.client, o.date);
  }

  return (
    <Sheet onClose={onClose} label={editing ? 'Editar la venta' : 'Cerrar la venta'} className="checkout">
      <form onSubmit={save}>
        <h2>{editing ? 'Editar venta' : 'Nueva venta'}</h2>
        <ul className="checkout-lines">
          {lines.map(l => (
            <li key={l.offering.id}>
              <span>{l.offering.name}{known?.discounts[l.offering.id] ? <em> −{Math.round(known.discounts[l.offering.id] * 100)}%</em> : null}</span>
              <Stepper value={l.qty} onChange={n => setCart({ ...cart, [l.offering.id]: n })} name={l.offering.name} />
              <b>{colones(lineTotal(l.offering.id, l.qty, l.offering.price))}</b>
            </li>
          ))}
        </ul>
        {others.length > 0 && (adding ? (
          <div className="row add-codes" aria-label="Agregar producto">
            {others.map(o => (
              <button type="button" key={o.id} className="chip" title={o.name} onClick={() => setCart({ ...cart, [o.id]: 1 })}>+ {o.code}</button>
            ))}
          </div>
        ) : (
          <button type="button" className="chip add-more" onClick={() => setAdding(true)}>+ agregar producto</button>
        ))}
        <label className="field wide">Cliente
          <input value={client} onChange={e => setClient(e.target.value)} list="dc-clients" placeholder="Nombre o cliente registrado" autoFocus={!client} />
          <datalist id="dc-clients">{clients.filter(c => c.active).map(c => <option key={c.id} value={c.name} />)}</datalist>
          {known && <small className="ok-text">{known.name} · {known.billing === 'mensual' ? 'va a su factura mensual' : 'contado'}</small>}
        </label>
        <div className="field wide">{weekly && !isFijo ? 'Empieza' : 'Día'}
          <div className="beads">
            {dates.map(d => (
              <button type="button" key={d} className={'bead' + (d === date ? ' on' : '')} onClick={() => setDate(d)} aria-pressed={d === date}>
                <span>{d === now ? 'hoy' : 'dlmmjvs'[fromISODate(d).getDay()]}</span><b>{fromISODate(d).getDate()}</b>
              </button>
            ))}
          </div>
        </div>
        <div className="field wide">Se repite
          {isFijo ? <span className="muted">↻ ya es parte de un pedido fijo (se cambia desde Ventas › Semanal)</span> : (
            <>
              <div className="row">
                <button type="button" className={'chip' + (!weekly ? ' on' : '')} onClick={() => setWeekly(false)}>solo esta vez</button>
                <button type="button" className={'chip' + (weekly ? ' on' : '')} onClick={() => { setWeekly(true); if (!days.length) setDays([fromISODate(date).getDay()]); }}>↻ semanal</button>
              </div>
              {weekly && (
                <div className="week small">
                  {WEEK_ORDER.map(w => (
                    <button type="button" key={w} className={'week-day' + (days.includes(w) ? ' on' : '')} aria-pressed={days.includes(w)}
                      onClick={() => setDays(days.includes(w) ? days.filter(x => x !== w) : [...days, w].sort())}><span>{WEEKDAY_SHORT[w]}</span></button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div className="field wide pay-row"><span>Pago <HelpDot topic="pago" label="Marca de pago" /></span>
          <span><PayMark state={pay} size={34} onChange={setPay} /> {PAY[pay].label}</span>
        </div>
        <label className="field wide">Nota<input value={note} onChange={e => setNote(e.target.value)} placeholder="Opcional" /></label>
        <div className="checkout-foot">
          <span>Total <b>{colones(total)}</b>{override != null && <small className="muted"> (precio escrito)</small>}</span>
          <button className="shop-go">{editing ? 'Guardar' : weekly ? 'Crear fijo' : 'Anotar venta'}</button>
        </div>
      </form>
    </Sheet>
  );
}

/** Lo escrito en la venta rápida (o una venta guardada) como borrador de ficha. */
export function draftFromLines(lines: { offering: { id: string }; qty: number }[], rest: Omit<OrderDraft, 'cart'>): OrderDraft {
  const cart: Cart = {};
  for (const l of lines) cart[l.offering.id] = (cart[l.offering.id] ?? 0) + l.qty;
  return { cart, ...rest };
}
