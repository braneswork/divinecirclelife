import { useState } from 'react';
import { addDays, colones, dayLabel, priceOn, toISODate, type Offering } from '@dc/core';
import { placeOrder } from './data';
import { sb } from './supabase';

export function OrderBread({ offerings }: { offerings: Offering[] }) {
  const today = toISODate(new Date());
  const [qty, setQty] = useState<Record<string, number>>({});
  const [client, setClient] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState(addDays(today, 1));
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | string>('idle');

  const breads = offerings.filter(o => o.kind === 'producto');
  const lines = breads.filter(o => qty[o.code] > 0).map(o => ({ code: o.code, qty: qty[o.code] }));
  const total = breads.reduce((s, o) => s + (qty[o.code] || 0) * priceOn(o, date), 0);
  const bump = (code: string, d: number) => setQty(q => ({ ...q, [code]: Math.max(0, Math.min(20, (q[code] || 0) + d)) }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    const r = await placeOrder({ client: client.trim(), phone: phone.trim(), date, lines, note: note.trim() || undefined });
    if (r.ok) { setState('done'); setQty({}); } else setState(r.message);
  }

  if (state === 'done') {
    return (
      <div className="order-done">
        <p className="kicker">Recibido</p>
        <p>Gracias, {client.split(' ')[0]}. Tu pan queda anotado para el {dayLabel(date, today).toLowerCase()}.</p>
        <button className="link" onClick={() => setState('idle')}>Hacer otro pedido</button>
      </div>
    );
  }

  return (
    <form className="order" onSubmit={submit}>
      <ul className="menu">
        {breads.map(o => (
          <li key={o.id}>
            <span className="menu-name">{o.name}</span>
            <span className="menu-dots" aria-hidden="true" />
            <span className="menu-price">{colones(priceOn(o, date))}</span>
            <span className="stepper">
              <button type="button" onClick={() => bump(o.code, -1)} aria-label={`Quitar ${o.name}`} disabled={!qty[o.code]}>−</button>
              <output aria-label={`Cantidad de ${o.name}`}>{qty[o.code] || 0}</output>
              <button type="button" onClick={() => bump(o.code, 1)} aria-label={`Agregar ${o.name}`}>+</button>
            </span>
          </li>
        ))}
      </ul>

      {lines.length > 0 && (
        <div className="order-form">
          <label>Nombre<input required value={client} onChange={e => setClient(e.target.value)} autoComplete="name" /></label>
          <label>WhatsApp<input required value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" /></label>
          <label>Para el día<input type="date" required min={addDays(today, 1)} value={date} onChange={e => setDate(e.target.value)} /></label>
          <label className="wide">Nota<input value={note} onChange={e => setNote(e.target.value)} placeholder="Opcional" /></label>
          <div className="order-foot wide">
            <span>Total <b>{colones(total)}</b> · se paga al recoger</span>
            <button className="cta" disabled={state === 'sending'}>{state === 'sending' ? 'Enviando…' : 'Pedir'}</button>
          </div>
          {!['idle', 'sending'].includes(state) && <p className="wide error" role="alert">{state}</p>}
          {!sb && <p className="wide fine">Vista previa: los pedidos en línea se activan al conectar el sistema.</p>}
        </div>
      )}
    </form>
  );
}
