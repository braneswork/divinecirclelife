/* Pedidos fijos (semanales): la semana de lunes a domingo, lo que hay que
   preparar cada día y cada fijo para editarlo, pausarlo o borrarlo. */

import { useIsAdmin } from '../role';
import { useMemo, useState, type CSSProperties } from 'react';
import {
  WEEKDAY_SHORT, WEEK_ORDER, colones, matchClient, perWeek, pillarOf, recurringLines, recurringValue, PAY,
  type Recurring,
} from '@dc/core';
import { PayMark, Photo, Sheet, Stepper, useToast } from '@dc/ui';
import { now, removeRecurring, saveRecurring, today, useStore } from '../store';

const emptyFijo = (): Recurring => ({
  id: crypto.randomUUID(), client: '', items: [], weekdays: [new Date().getDay()], every: 1, start: today(),
  pay: 'pending', active: true, skips: [], createdAt: now(),
});

export function Fijos() {
  const recurring = useStore(s => s.recurring);
  const offerings = useStore(s => s.offerings);
  const clients = useStore(s => s.clients);
  const [day, setDay] = useState<number | null>(null);
  const [edit, setEdit] = useState<Recurring | null>(null);

  const active = recurring.filter(r => r.active);
  const clientOf = (r: Recurring) => clients.find(c => c.id === r.clientId);
  const weekTotal = active.reduce((s, r) => s + recurringValue(r, offerings, clientOf(r)) * perWeek(r), 0);

  // producción por día de la semana
  const byDay = useMemo(() => {
    const m = new Map<number, Map<string, { code: string; qty: number }>>();
    for (const r of active) for (const d of r.weekdays) {
      const acc = m.get(d) ?? new Map();
      for (const it of recurringLines(r, offerings)) {
        const cur = acc.get(it.offeringId) ?? { code: it.code, qty: 0 };
        cur.qty += it.qty; acc.set(it.offeringId, cur);
      }
      m.set(d, acc);
    }
    return m;
  }, [active, offerings]);

  const shown = recurring
    .filter(r => day === null || r.weekdays.includes(day))
    .sort((a, b) => Number(b.active) - Number(a.active) || a.client.localeCompare(b.client));

  return (
    <div className="fijos">
      <p className="fijos-sum"><b>{active.length}</b> fijos activos · <b>{colones(weekTotal)}</b> por semana</p>

      <div className="week" role="tablist" aria-label="Días de la semana">
        {WEEK_ORDER.map(d => {
          const prod = [...(byDay.get(d)?.values() ?? [])];
          const units = prod.reduce((s, p) => s + p.qty, 0);
          return (
            <button key={d} role="tab" aria-selected={day === d} className={'week-day' + (day === d ? ' on' : '') + (units ? ' has' : '')} onClick={() => setDay(day === d ? null : d)}>
              <span>{WEEKDAY_SHORT[d]}</span>
              <b>{units || '·'}</b>
            </button>
          );
        })}
      </div>

      {day !== null && (byDay.get(day)?.size ?? 0) > 0 && (
        <div className="prep" aria-label="Para preparar ese día">
          <span className="eyebrow">cada {WEEKDAY_SHORT[day]}</span>
          {[...byDay.get(day)!.values()].map((p, i) => <span key={p.code} className={'prep-dot s' + (i % 6)}><b>{p.qty}</b>{p.code}</span>)}
        </div>
      )}

      <ul className="fijo-list">
        {shown.map(r => (
          <li key={r.id} className={r.active ? '' : 'paused'}>
            <button className="fijo-row" onClick={() => setEdit({ ...r, items: r.items.map(i => ({ ...i })) })}>
              <span className="fijo-days">{WEEK_ORDER.map(d => <i key={d} className={r.weekdays.includes(d) ? 'on' : ''}>{WEEKDAY_SHORT[d][0]}</i>)}</span>
              <span className="fijo-text">
                <strong>{r.client}</strong>
                <small>{recurringLines(r, offerings).map(i => `${i.qty} ${i.name}`).join(' · ')}{r.every === 2 ? ' · cada 2 semanas' : ''}{r.active ? '' : ' · en pausa'}</small>
              </span>
              <span className="fijo-amount">{colones(recurringValue(r, offerings, clientOf(r)))}<small>/vez</small></span>
            </button>
          </li>
        ))}
        {!shown.length && <li className="timeline-empty">{day === null ? 'Sin pedidos fijos todavía.' : `Nada fijo los ${WEEKDAY_SHORT[day]}.`}</li>}
      </ul>

      <button className="btn-inline" onClick={() => setEdit(emptyFijo())}>+ Nuevo fijo</button>

      {edit && <FijoSheet r={edit} isNew={!recurring.some(x => x.id === edit.id)} onClose={() => setEdit(null)} />}
    </div>
  );
}

export function FijoSheet({ r, isNew, onClose }: { r: Recurring; isNew: boolean; onClose: () => void }) {
  const admin = useIsAdmin();
  const offerings = useStore(s => s.offerings);
  const clients = useStore(s => s.clients);
  const toast = useToast();
  const [d, setD] = useState<Recurring>(r);
  const products = offerings.filter(o => o.active && o.kind === 'producto');
  const qty = (id: string) => d.items.find(i => i.offeringId === id)?.qty ?? 0;
  const setQty = (id: string, n: number) =>
    setD({ ...d, items: n ? (d.items.some(i => i.offeringId === id) ? d.items.map(i => (i.offeringId === id ? { ...i, qty: n } : i)) : [...d.items, { offeringId: id, qty: n }]) : d.items.filter(i => i.offeringId !== id) });
  const known = matchClient(d.client, clients);

  function save() {
    if (!d.client.trim()) return toast('¿Para quién es?');
    if (!d.items.some(i => i.qty > 0)) return toast('Agrega al menos un producto');
    if (!d.weekdays.length) return toast('Elige al menos un día');
    saveRecurring({ ...d, client: known?.name ?? d.client.trim(), clientId: known?.id });
    toast(isNew ? 'Fijo creado: sus ventas ya aparecen en los próximos días' : 'Fijo actualizado');
    onClose();
  }

  return (
    <Sheet onClose={onClose} label="Pedido fijo" className="checkout">
      <h2>{isNew ? 'Nuevo pedido fijo' : 'Pedido fijo'}</h2>
      <label className="field wide">Cliente
        <input value={d.client} onChange={e => setD({ ...d, client: e.target.value })} list="dc-clients-fijo" placeholder="Nombre o cliente registrado" autoFocus={isNew} />
        <datalist id="dc-clients-fijo">{clients.filter(c => c.active).map(c => <option key={c.id} value={c.name} />)}</datalist>
        {known && <small className="ok-text">{known.name} · se aplica su descuento</small>}
      </label>

      <div className="field wide">Días
        <div className="week small">
          {WEEK_ORDER.map(w => (
            <button type="button" key={w} className={'week-day' + (d.weekdays.includes(w) ? ' on' : '')} aria-pressed={d.weekdays.includes(w)}
              onClick={() => setD({ ...d, weekdays: d.weekdays.includes(w) ? d.weekdays.filter(x => x !== w) : [...d.weekdays, w].sort() })}>
              <span>{WEEKDAY_SHORT[w]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="field wide">Cada
        <div className="row">
          <button type="button" className={'chip' + (d.every === 1 ? ' on' : '')} onClick={() => setD({ ...d, every: 1 })}>semana</button>
          <button type="button" className={'chip' + (d.every === 2 ? ' on' : '')} onClick={() => setD({ ...d, every: 2 })}>2 semanas</button>
        </div>
      </div>

      <div className="field wide">Productos
        <ul className="fijo-products">
          {products.map(o => (
            <li key={o.id} className={qty(o.id) ? 'in' : ''} style={{ '--pt': pillarOf(o.pillar)?.color } as CSSProperties}>
              <span className="fp-photo"><Photo src={o.image} name={o.name} tone={pillarOf(o.pillar)?.color} /></span>
              <span className="fp-name">{o.name}</span>
              <Stepper value={qty(o.id)} onChange={n => setQty(o.id, n)} name={o.name} />
            </li>
          ))}
        </ul>
      </div>

      <div className="field wide pay-row"><span>Pago de cada venta <PayMark state={d.pay} size={30} onChange={pay => setD({ ...d, pay })} /> {PAY[d.pay].label}</span></div>
      <label className="field">Desde<input type="date" value={d.start} onChange={e => setD({ ...d, start: e.target.value })} /></label>
      <label className="field">Hasta (opcional)<input type="date" value={d.until ?? ''} onChange={e => setD({ ...d, until: e.target.value || undefined })} /></label>
      <label className="field wide">Nota<input value={d.note ?? ''} onChange={e => setD({ ...d, note: e.target.value || undefined })} placeholder="Opcional" /></label>

      <div className="checkout-foot">
        <span>Cada vez <b>{colones(recurringValue(d, offerings, known))}</b></span>
        <button className="shop-go" onClick={save}>{isNew ? 'Crear fijo' : 'Guardar'}</button>
      </div>
      {!isNew && (
        <div className="row end" style={{ marginTop: 10 }}>
          <button className="btn-inline ghost" onClick={() => { saveRecurring({ ...d, active: !d.active }); toast(d.active ? 'Fijo en pausa: se quitaron sus ventas futuras sin tocar' : 'Fijo reactivado'); onClose(); }}>
            {d.active ? 'Pausar' : 'Reactivar'}
          </button>
          {admin && <button className="btn-inline ghost bad" onClick={() => { if (confirm(`¿Borrar el fijo de ${d.client}? Sus ventas pasadas se quedan.`)) { removeRecurring(r); toast('Fijo borrado'); onClose(); } }}>Borrar fijo</button>}
        </div>
      )}
    </Sheet>
  );
}
