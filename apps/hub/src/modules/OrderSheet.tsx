/* La ficha de una venta o pedido. Es la misma en todos lados: al anotar algo
   nuevo (venta rápida o tienda) sale en una hoja; al tocar una fila de la
   lista se abre ahí mismo, ya editable. Arriba: si es pedido (por entregar) o
   ya vendido, y el total, que se puede escribir directo. */

import { useState } from 'react';
import { PAY, WEEKDAY_SHORT, WEEK_ORDER, addDays, colones, dayLabel, fromISODate, matchClient, priceOn, type Order, type PayState, type Recurring } from '@dc/core';
import { PayMark, Sheet, Stepper, cartLines, useToast, type Cart } from '@dc/ui';
import { now as nowIso, removeOrder, restoreOrder, saveOrder, saveRecurring, today, updateOrder, useStore } from '../store';
import { HelpDot } from '../HelpDot';

/** pedido: se anota antes y falta entregarlo · venta: ya se entregó/vendió */
export type Kind = 'pedido' | 'venta';
export const kindOf = (o: Pick<Order, 'status'>): Kind => (o.status === 'entregado' ? 'venta' : 'pedido');

export interface OrderDraft {
  cart: Cart;
  client?: string;
  date?: string;
  pay?: PayState;
  note?: string;
  weekly?: boolean;
  amountOverride?: number;
  discount?: number;
  paidAmount?: number;
  /** lo que se espera según desde dónde se anota (Ventas → venta, Pedidos → pedido) */
  kind?: Kind;
}

/** "1000" → ₡1.000 · "10%" → el 10 % del subtotal */
export function readDiscount(text: string, subtotal: number) {
  const t = text.replace(/\s/g, '');
  if (!t) return 0;
  if (t.endsWith('%')) return Math.round(subtotal * Math.min(100, Number(t.slice(0, -1).replace(',', '.')) || 0) / 100);
  return Math.min(subtotal, Number(t.replace(/\D/g, '')) || 0);
}

const digits = (t: string) => Number(t.replace(/\D/g, '')) || 0;

/** La ficha en una hoja, para lo nuevo. */
export function OrderSheet(props: { initial: OrderDraft; onCart?: (c: Cart) => void; onClose: () => void; onDone: (client: string, date: string, kind: Kind) => void }) {
  return (
    <Sheet onClose={props.onClose} label="Anotar" className="checkout">
      <OrderForm {...props} />
    </Sheet>
  );
}

export function OrderForm({ initial, editId, inline, onCart, onClose, onDone, onFijo }: {
  initial: OrderDraft;
  /** venta o pedido guardado que se está viendo */
  editId?: string;
  /** abierta dentro de la lista (sin título) */
  inline?: boolean;
  /** para devolverle a la tienda los cambios de cantidades */
  onCart?: (c: Cart) => void;
  onClose: () => void;
  onDone: (client: string, date: string, kind: Kind) => void;
  /** abrir el fijo del que salió */
  onFijo?: (recurringId: string) => void;
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
  const [totalText, setTotalText] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [discText, setDiscText] = useState(initial.discount ? String(initial.discount) : '');
  const [paidText, setPaidText] = useState(initial.paidAmount ? String(initial.paidAmount) : '');
  const [more, setMore] = useState(false);
  const [replace, setReplace] = useState(true);
  const orders = useStore(s => s.orders);
  // pedido o venta: lo que diga la persona; si no, lo esperado, y una fecha futura siempre es pedido
  const [kindSet, setKindSet] = useState<Kind | null>(editing ? kindOf(editing) : initial.weekly ? 'pedido' : null);
  const kind: Kind = kindSet ?? (date > now ? 'pedido' : initial.kind ?? 'venta');

  const setCart = (c: Cart) => { setCartState(c); setOverride(undefined); setTotalText(null); onCart?.(c); };
  const lines = cartLines(cart, offerings);
  const known = matchClient(client, clients);
  const lineTotal = (id: string, qty: number, price: number) => Math.round(qty * price * (1 - (known?.discounts[id] ?? 0)));
  const price = (o: Parameters<typeof priceOn>[0]) => priceOn(o, date);
  const subtotal = override ?? lines.reduce((s, l) => s + lineTotal(l.offering.id, l.qty, price(l.offering)), 0);
  const discount = readDiscount(discText, subtotal);
  const total = Math.max(0, subtotal - discount);
  const paid = pay === 'pending' ? Math.min(total, digits(paidText)) : 0;
  // al editar, un valor que se quita se guarda como null para borrarlo también en la nube
  const clear = (had?: number) => (had ? null : undefined);
  const extras = { discount: discount || clear(editing?.discount), paidAmount: paid || clear(editing?.paidAmount) };
  const others = offerings.filter(o => o.active && !(cart[o.id] > 0));
  const span = kind === 'venta' ? Array.from({ length: 7 }, (_, i) => addDays(now, i - 6)) : Array.from({ length: 7 }, (_, i) => addDays(now, i));
  const dates = span.includes(date) ? span : [date, ...span].sort();
  const isFijo = !!editing?.recurringId;
  // una venta nueva para alguien que tenía un pedido sin entregar (de ese día o de
  // los 3 anteriores): lo más probable es que lo reemplace (se llevó otra cosa)
  const sameClient = (o: Order) => (known ? o.clientId === known.id : !!client.trim() && o.client.toLowerCase() === client.trim().toLowerCase());
  const replaces = !editing && kind === 'venta'
    ? orders.filter(o => kindOf(o) === 'pedido' && o.status !== 'cancelado' && sameClient(o) && o.date <= date && o.date >= addDays(date, -3))
    : [];
  const repeat = kind === 'pedido' && weekly && !isFijo;

  function typeTotal(t: string) {
    setTotalText(t);
    setDiscText('');
    setOverride(t.replace(/\D/g, '') ? digits(t) : undefined);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!lines.length) return toast('Agrega al menos un producto');
    if (!client.trim()) return toast('¿Para quién es?');
    const name = known?.name ?? client.trim();
    const weekdays = days.length ? days : [fromISODate(date).getDay()];
    const status: Order['status'] = kind === 'venta' ? 'entregado'
      : editing && editing.status !== 'entregado' ? editing.status : 'pendiente';
    const recurring = (): Recurring => ({
      id: crypto.randomUUID(), client: name, clientId: known?.id,
      items: lines.map(l => ({ offeringId: l.offering.id, qty: l.qty })), weekdays, every: 1, start: date,
      pay, note: note.trim() || undefined, active: true, skips: [], createdAt: nowIso(),
    });
    const input = { lines, client: client.trim(), date, pay, status, note: note.trim() || undefined, amountOverride: override, ...extras };
    if (editing) {
      saveOrder(input, editing.id);
      const patch: Partial<Order> = { pay };
      if (repeat) {
        const r = recurring();
        patch.recurringId = r.id;
        updateOrder(editing.id, patch);
        saveRecurring(r);
        toast(`Fijo creado: cada ${weekdays.map(w => WEEKDAY_SHORT[w]).join(', ')}`);
      } else updateOrder(editing.id, patch);
      return onDone(name, date, kind);
    }
    if (repeat) {
      saveRecurring(recurring());
      toast(`Fijo creado: cada ${weekdays.map(w => WEEKDAY_SHORT[w]).join(', ')}`);
      return onDone(name, date, kind);
    }
    const o = saveOrder(input);
    if (replace && replaces.length) {
      // el pedido reemplazado se quita (si era de un fijo, ese día queda saltado)
      const gone = replaces.map(r => removeOrder(r.id)).filter((x): x is Order => !!x);
      toast(`Reemplazó ${gone.length === 1 ? 'el pedido' : `${gone.length} pedidos`} de ${o.client}`, { label: 'Deshacer', run: () => gone.forEach(restoreOrder) });
    }
    onDone(o.client, o.date, kind);
  }

  const dayText = date === now ? 'hoy' : date === addDays(now, 1) ? 'mañana' : date === addDays(now, -1) ? 'ayer' : `${'dlmmjvs'[fromISODate(date).getDay()]} ${fromISODate(date).getDate()}`;
  const showClient = more || !client.trim();

  return (
    <form onSubmit={save} className={'order-form' + (inline ? ' inline' : '')}>
      {!inline && <h2>{kind === 'venta' ? 'Nueva venta' : 'Nuevo pedido'}</h2>}
      <div className="order-top">
        <div className="kind-pick" role="radiogroup" aria-label="Pedido o venta">
          <button type="button" role="radio" aria-checked={kind === 'pedido'} className={kind === 'pedido' ? 'on' : ''} onClick={() => setKindSet('pedido')}>Pedido</button>
          <button type="button" role="radio" aria-checked={kind === 'venta'} className={kind === 'venta' ? 'on' : ''} onClick={() => { setKindSet('venta'); setWeekly(false); }}>Vendido</button>
        </div>
        <label className="total-edit">
          <input inputMode="numeric" value={totalText ?? colones(total)} onChange={e => typeTotal(e.target.value)} onFocus={e => e.target.select()} onBlur={() => setTotalText(null)} aria-label="Total (se puede escribir)" />
          {override != null
            ? <button type="button" className="link" onClick={() => { setOverride(undefined); setTotalText(null); }}>calcular</button>
            : discount > 0 && <small>antes {colones(subtotal)}</small>}
        </label>
      </div>

      <ul className="checkout-lines">
        {lines.map(l => (
          <li key={l.offering.id}>
            <span>{l.offering.name}{known?.discounts[l.offering.id] ? <em> −{Math.round(known.discounts[l.offering.id] * 100)}%</em> : null}</span>
            <Stepper value={l.qty} onChange={n => setCart({ ...cart, [l.offering.id]: n })} name={l.offering.name} />
            <b>{colones(lineTotal(l.offering.id, l.qty, price(l.offering)))}{price(l.offering) !== l.offering.price && <small className="promo"> a {colones(price(l.offering))}</small>}</b>
          </li>
        ))}
      </ul>
      {others.length > 0 && (adding ? (
        <div className="row add-codes" aria-label="Agregar producto">
          {others.map(o => (
            <button type="button" key={o.id} className="chip" title={o.name} onClick={() => setCart({ ...cart, [o.id]: 1 })}>+ {o.code}</button>
          ))}
        </div>
      ) : null)}

      <span className="pay-pick" aria-label="Pago">
        {(['paid', 'pending', 'credit'] as const).map(p => (
          <button type="button" key={p} className={'chip pay-' + p + (pay === p ? ' on' : '')} aria-pressed={pay === p} onClick={() => setPay(p)}>
            <PayMark state={p} size={18} /> {PAY[p].label}
          </button>
        ))}
      </span>

      {replaces.length > 0 && (
        <button type="button" className={'replace' + (replace ? ' on' : '')} aria-pressed={replace} onClick={() => setReplace(!replace)}>
          <span className="box">{replace ? '✓' : ''}</span>
          <span>Reemplaza {replaces.length === 1 ? 'su pedido' : 'sus pedidos'} de {replaces.map(r => `${dayLabel(r.date, now).toLowerCase()} (${r.items.map(i => `${i.qty}${i.code}`).join(' ')})`).join(', ')}</span>
        </button>
      )}

      {showClient && (
        <label className="field wide">Cliente
          <input value={client} onChange={e => setClient(e.target.value)} list="dc-clients" placeholder="Nombre o cliente registrado" autoFocus={!client && !inline} />
          <datalist id="dc-clients">{clients.filter(c => c.active).map(c => <option key={c.id} value={c.name} />)}</datalist>
          {known && <small className="ok-text">{known.name} · {known.billing === 'mensual' ? 'va a su factura mensual' : 'contado'}</small>}
        </label>
      )}

      {more ? (
        <>
          <div className="field wide">{repeat ? 'Empieza' : kind === 'venta' ? 'Día de la venta' : 'Día de entrega'}
            <div className="beads">
              {dates.map(d => (
                <button type="button" key={d} className={'bead' + (d === date ? ' on' : '')} onClick={() => setDate(d)} aria-pressed={d === date}>
                  <span>{d === now ? 'hoy' : 'dlmmjvs'[fromISODate(d).getDay()]}</span><b>{fromISODate(d).getDate()}</b>
                </button>
              ))}
            </div>
          </div>
          {kind === 'pedido' && (
            <div className="field wide">Se repite
              {isFijo ? (
                <span className="muted">↻ sale de un pedido fijo{onFijo && <button type="button" className="link" onClick={() => onFijo(editing!.recurringId!)}>ver el fijo</button>}</span>
              ) : (
                <>
                  <div className="row">
                    <button type="button" className={'chip' + (!weekly ? ' on' : '')} onClick={() => setWeekly(false)}>solo esta vez</button>
                    <button type="button" className={'chip' + (weekly ? ' on' : '')} onClick={() => { setWeekly(true); if (!days.length) setDays([fromISODate(date).getDay()]); }}>↻ cada semana</button>
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
          )}
          {!(repeat && !editing) && (
            <div className="row two">
              <label className="field">Descuento
                <input inputMode="decimal" value={discText} onChange={e => setDiscText(e.target.value)} placeholder="₡ o %" />
              </label>
              {pay === 'pending' && (
                <label className="field">Abonó
                  <input inputMode="numeric" value={paidText} onChange={e => setPaidText(e.target.value)} placeholder="₡ pagó" />
                </label>
              )}
            </div>
          )}
          {paid > 0 && <small className="warn-text">debe {colones(total - paid)}</small>}
          <label className="field wide">Nota<input value={note} onChange={e => setNote(e.target.value)} placeholder="Opcional" /></label>
        </>
      ) : null}

      <div className="checkout-foot">
        <span className="row">
          {!adding && others.length > 0 && <button type="button" className="chip" onClick={() => setAdding(true)}>+ producto</button>}
          {!more && (
            <button type="button" className="chip more" onClick={() => setMore(true)}>
              {dayText}{weekly ? ' · ↻' : ''}{discount ? ` · −${colones(discount)}` : ''}{paid ? ` · abonó ${colones(paid)}` : ''}{note ? ' · nota' : ''} ▾
            </button>
          )}
        </span>
        <button className="shop-go">{editing ? 'Guardar' : repeat ? 'Crear fijo' : kind === 'venta' ? 'Anotar venta' : 'Anotar pedido'}</button>
      </div>
    </form>
  );
}

/** Lo escrito en la venta rápida (o una venta guardada) como borrador de ficha. */
export function draftFromLines(lines: { offering: { id: string }; qty: number }[], rest: Omit<OrderDraft, 'cart'>): OrderDraft {
  const cart: Cart = {};
  for (const l of lines) cart[l.offering.id] = (cart[l.offering.id] ?? 0) + l.qty;
  return { cart, ...rest };
}

/** Una venta guardada como borrador de ficha. */
export const orderDraft = (o: Order): OrderDraft => ({
  cart: Object.fromEntries(o.items.map(i => [i.offeringId, i.qty])), client: o.client, date: o.date,
  pay: o.pay, note: o.note, amountOverride: o.amountOverride, discount: o.discount ?? undefined, paidAmount: o.paidAmount ?? undefined,
});
