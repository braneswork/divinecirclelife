/* + Entrada: anotar una venta escribiéndola rápido ("2C 1MS Soleida") o
   eligiendo de la tienda (todo el catálogo con fotos). La tienda es la misma
   pieza que usará la web; aquí el cierre pide cliente, día y marca de pago. */

import { useMemo, useRef, useState } from 'react';
import {
  PAY, QUICK_ERRORS, addDays, colones, dayLabel, fromISODate, matchClient, parseQuick,
  type PayState,
} from '@dc/core';
import { PayMark, Sheet, Shop, Stepper, cartLines, useToast, type Cart } from '@dc/ui';
import { saveOrder, today, useStore } from '../store';
import { useNav } from '../nav';
import { HelpDot } from '../HelpDot';

export function Entrada() {
  const offerings = useStore(s => s.offerings);
  const clients = useStore(s => s.clients);
  const toast = useToast();
  const nav = useNav();
  const now = today();
  const [text, setText] = useState('');
  const [cart, setCart] = useState<Cart>({});
  const [checkout, setCheckout] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const parsed = useMemo(() => parseQuick(text, offerings, now), [text, offerings, now]);
  const active = offerings.filter(o => o.active);

  const done = (client: string, date: string) =>
    toast(`Anotado: ${client} · ${dayLabel(date, now)}`, { label: 'Ver ventas', run: () => nav.enter('ventas') });

  function quick(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed.ok) return toast(QUICK_ERRORS[parsed.error] + (parsed.detail ? `: ${parsed.detail}` : ''));
    const o = saveOrder(parsed);
    setText('');
    done(o.client, o.date);
  }

  return (
    <>
      <Shop
        offerings={active}
        cart={cart}
        onCart={setCart}
        onCheckout={() => setCheckout(true)}
        top={
          <div className="quick-top">
            <form className="portal" onSubmit={quick}>
              <input ref={inputRef} value={text} onChange={e => setText(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false}
                placeholder="Rápido: 2C 1MS Soleida" aria-label="Venta rápida" />
              <HelpDot topic="ventas" label="Cómo escribir una venta rápida" />
              <button className="go" disabled={!parsed.ok} aria-label="Anotar">↵</button>
            </form>
            {text.trim() && (
              <p className={'hint' + (parsed.ok ? '' : ' bad')} aria-live="polite">
                {parsed.ok
                  ? <><b>{matchClient(parsed.client, clients)?.name ?? parsed.client}</b> · {parsed.lines.map(l => `${l.qty} ${l.offering.name}`).join(', ')} · {dayLabel(parsed.date, now)} · {PAY[parsed.pay].mark}</>
                  : QUICK_ERRORS[parsed.error] + (parsed.detail ? `: ${parsed.detail}` : '')}
              </p>
            )}
          </div>
        }
      />
      {checkout && (
        <Checkout
          cart={cart}
          onCart={setCart}
          onClose={() => setCheckout(false)}
          onDone={(client, date) => { setCart({}); setCheckout(false); done(client, date); }}
        />
      )}
    </>
  );
}

function Checkout({ cart, onCart, onClose, onDone }: { cart: Cart; onCart: (c: Cart) => void; onClose: () => void; onDone: (client: string, date: string) => void }) {
  const offerings = useStore(s => s.offerings);
  const clients = useStore(s => s.clients);
  const toast = useToast();
  const now = today();
  const [client, setClient] = useState('');
  const [date, setDate] = useState(now);
  const [pay, setPay] = useState<PayState>('pending');
  const [note, setNote] = useState('');
  const lines = cartLines(cart, offerings);
  const known = matchClient(client, clients);
  const lineTotal = (id: string, qty: number, price: number) => Math.round(qty * price * (1 - (known?.discounts[id] ?? 0)));
  const total = lines.reduce((s, l) => s + lineTotal(l.offering.id, l.qty, l.offering.price), 0);

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!lines.length) return onClose();
    if (!client.trim()) return toast('¿Para quién es?');
    const o = saveOrder({ lines, client: client.trim(), date, pay, note: note.trim() || undefined });
    onDone(o.client, o.date);
  }

  return (
    <Sheet onClose={onClose} label="Cerrar la venta" className="checkout">
      <form onSubmit={save}>
        <h2>Nueva venta</h2>
        <ul className="checkout-lines">
          {lines.map(l => (
            <li key={l.offering.id}>
              <span>{l.offering.name}{known?.discounts[l.offering.id] ? <em> −{Math.round(known.discounts[l.offering.id] * 100)}%</em> : null}</span>
              <Stepper value={l.qty} onChange={n => onCart({ ...cart, [l.offering.id]: n })} name={l.offering.name} />
              <b>{colones(lineTotal(l.offering.id, l.qty, l.offering.price))}</b>
            </li>
          ))}
        </ul>
        <label className="field wide">Cliente
          <input value={client} onChange={e => setClient(e.target.value)} list="dc-clients" placeholder="Nombre o cliente registrado" autoFocus />
          <datalist id="dc-clients">{clients.filter(c => c.active).map(c => <option key={c.id} value={c.name} />)}</datalist>
          {known && <small className="ok-text">{known.name} · {known.billing === 'mensual' ? 'va a su factura mensual' : 'contado'}</small>}
        </label>
        <div className="field wide">Día
          <div className="beads">
            {Array.from({ length: 7 }, (_, i) => addDays(now, i)).map(d => (
              <button type="button" key={d} className={'bead' + (d === date ? ' on' : '')} onClick={() => setDate(d)} aria-pressed={d === date}>
                <span>{d === now ? 'hoy' : 'dlmmjvs'[fromISODate(d).getDay()]}</span><b>{fromISODate(d).getDate()}</b>
              </button>
            ))}
          </div>
        </div>
        <div className="field wide pay-row"><span>Pago <HelpDot topic="pago" label="Marca de pago" /></span>
          <span><PayMark state={pay} size={34} onChange={setPay} /> {PAY[pay].label}</span>
        </div>
        <label className="field wide">Nota<input value={note} onChange={e => setNote(e.target.value)} placeholder="Opcional" /></label>
        <div className="checkout-foot">
          <span>Total <b>{colones(total)}</b></span>
          <button className="shop-go">Anotar venta</button>
        </div>
      </form>
    </Sheet>
  );
}
