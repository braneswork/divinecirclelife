/* Ventas, en tres listas:
   · Ventas: lo que ya se vendió/entregó, día por día (hoy primero).
   · Pedidos: lo anotado antes que falta entregar, por día de entrega.
   · Fijos: los pedidos que se repiten cada semana.
   Cada fila se abre ahí mismo en su ficha editable. Lo que se anota cae en la
   lista de la pestaña donde se escribe (una fecha futura siempre es pedido). */

import { useIsAdmin } from '../role';
import { useMemo, useRef, useState } from 'react';
import {
  PAY, QUICK_ERRORS, addDays, bakeSummary, colones, dayLabel, fromISODate, matchClient, orderDue, orderTotal, parseQuick, payTotals, priceOn,
  type Order,
} from '@dc/core';
import { Icon, PayMark, ViewToggle, useToast, useViewMode } from '@dc/ui';
import { HelpDot } from '../HelpDot';
import { Fijos, FijoSheet } from './Fijos';
import { OrderForm, OrderSheet, draftFromLines, kindOf, orderDraft, type Kind, type OrderDraft } from './OrderSheet';
import { removeOrder, restoreOrder, today, updateOrder, useStore } from '../store';

const TABS = ['ventas', 'pedidos', 'fijos'] as const;

export function Ventas() {
  const orders = useStore(s => s.orders);
  const offerings = useStore(s => s.offerings);
  const clients = useStore(s => s.clients);
  const recurring = useStore(s => s.recurring);
  const toast = useToast();
  const now = today();
  const [tab, setTab] = useViewMode('ventas-listas', [...TABS]);
  const [day, setDay] = useState(now);
  const [text, setText] = useState('');
  const [sheet, setSheet] = useState<OrderDraft | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [fijo, setFijo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const parsed = useMemo(() => parseQuick(text, offerings, now, tab === 'ventas' ? day : now), [text, offerings, now, tab, day]);

  const live = orders.filter(o => o.status !== 'cancelado');
  const pedidos = live.filter(o => kindOf(o) === 'pedido');
  const sold = live.filter(o => kindOf(o) === 'venta' && o.date === day).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const waitingToday = pedidos.filter(o => o.date === day);
  const t = payTotals(sold);
  const toggle = (id: string) => setOpen(x => (x === id ? null : id));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed.ok) return toast(QUICK_ERRORS[parsed.error] + (parsed.detail ? `: ${parsed.detail}` : ''));
    // lo escrito abre la ficha ya llena: ahí se revisa pago, descuento o si se repite
    setSheet(draftFromLines(parsed.lines, {
      client: parsed.client, date: parsed.date, pay: parsed.pay, note: parsed.note, weekly: parsed.weekly,
      amountOverride: parsed.amountOverride, kind: tab === 'pedidos' || parsed.weekly ? 'pedido' : 'venta',
    }));
  }

  function saved(client: string, date: string, kind: Kind) {
    setText(''); setSheet(null);
    toast(`${kind === 'venta' ? 'Venta anotada' : 'Pedido anotado'}: ${client} · ${dayLabel(date, now)}`);
    // cae en su lista
    if (kind === 'venta') { setTab('ventas'); setDay(date); } else setTab('pedidos');
  }

  const deliver = (list: Order[]) => list.forEach(o => updateOrder(o.id, { status: 'entregado' }));
  const rows = (list: Order[], quick?: boolean) => (
    <ul className="prog-list">
      {list.map(o => (
        <OrderRow key={o.id} o={o} open={open === o.id} onToggle={() => toggle(o.id)} onClose={() => setOpen(null)} onFijo={setFijo}
          onDeliver={quick ? () => { updateOrder(o.id, { status: 'entregado' }); toast(`Entregado: ${o.client}`, { label: 'Deshacer', run: () => updateOrder(o.id, { status: o.status }) }); } : undefined}
          onRemove={() => {
            const gone = removeOrder(o.id);
            if (gone) toast(`${kindOf(o) === 'pedido' ? 'No se hizo' : 'Borrada'}: ${o.client}`, { label: 'Deshacer', run: () => restoreOrder(gone) });
          }} />
      ))}
    </ul>
  );

  return (
    <div className="ventas">
      <ViewToggle value={tab} onChange={v => { setTab(v); setOpen(null); }} options={[...TABS]} />

      {tab !== 'fijos' && (
        <>
          <form className="portal" onSubmit={submit}>
            <input
              ref={inputRef} autoComplete="off" autoCapitalize="off" spellCheck={false} value={text}
              onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setText(''); }}
              placeholder={tab === 'ventas' ? 'Vendí: 2C 1MS Soleida' : 'Pedido: 2C Soleida @vie'}
              aria-label={tab === 'ventas' ? 'Venta rápida' : 'Pedido rápido'}
            />
            <HelpDot topic="ventas" label="Cómo escribir rápido" />
            <button className="go" disabled={!parsed.ok} aria-label="Anotar">↵</button>
          </form>
          {text.trim() && (
            <p className={'hint' + (parsed.ok ? '' : ' bad')} aria-live="polite">
              {parsed.ok
                ? <><b>{matchClient(parsed.client, clients)?.name ?? parsed.client}</b> · {parsed.lines.map(l => `${l.qty} ${l.offering.name}`).join(', ')} · {colones(parsed.amountOverride ?? parsed.lines.reduce((s, l) => s + Math.round(l.qty * priceOn(l.offering, parsed.date) * (1 - (matchClient(parsed.client, clients)?.discounts[l.offering.id] ?? 0))), 0))} · {dayLabel(parsed.date, now)} · {PAY[parsed.pay].mark}{parsed.weekly ? ' · ↻ cada semana' : ''}</>
                : QUICK_ERRORS[parsed.error] + (parsed.detail ? `: ${parsed.detail}` : '')}
            </p>
          )}
        </>
      )}

      {tab === 'ventas' && (
        <div className="programa">
          <nav className="beads" aria-label="Día">
            <button className="bead nav" onClick={() => setDay(addDays(day, -1))} aria-label="Día anterior">‹</button>
            {Array.from({ length: 7 }, (_, i) => addDays(day > now ? day : now, i - 6)).map(d => {
              const n = live.filter(o => o.date === d && kindOf(o) === 'venta').length;
              return (
                <button key={d} className={'bead' + (d === day ? ' on' : '') + (n ? ' has' : '')} onClick={() => setDay(d)} aria-pressed={d === day} title={dayLabel(d, now)}>
                  <span>{d === now ? 'hoy' : 'dlmmjvs'[fromISODate(d).getDay()]}</span><b>{fromISODate(d).getDate()}</b>
                </button>
              );
            })}
            <button className="bead nav" onClick={() => setDay(addDays(day, 1))} aria-label="Día siguiente">›</button>
          </nav>
          <section className={'prog-day' + (day === now ? ' today' : '')}>
            <div className="prog-head static">
              <strong>{dayLabel(day, now)}</strong>
              <span>{sold.length} {sold.length === 1 ? 'venta' : 'ventas'} · <b>{colones(t.total)}</b></span>
            </div>
            {sold.length > 0 && (
              <p className="pay-sum">
                <span className="paid">✓ {colones(t.paid)}</span>
                {t.pending > 0 && <span className="pending">✕ {colones(t.pending)}</span>}
                {t.credit > 0 && <span className="credit">+ {colones(t.credit)}</span>}
              </p>
            )}
            {sold.length ? rows(sold) : <p className="timeline-empty">Sin ventas este día. Anótalas arriba.</p>}
          </section>
          {waitingToday.length > 0 && (
            <section className="prog-day waiting">
              <div className="prog-head static">
                <strong>Pedidos de este día</strong>
                {waitingToday.length > 1 && <button className="chip" onClick={() => deliver(waitingToday)}>✓ entregar todos</button>}
              </div>
              {rows(waitingToday, true)}
            </section>
          )}
        </div>
      )}

      {tab === 'pedidos' && <Pedidos pedidos={pedidos} now={now} deliver={deliver} rows={rows} />}

      {tab === 'fijos' && <Fijos />}

      {sheet && <OrderSheet initial={sheet} onClose={() => setSheet(null)} onDone={saved} />}
      {fijo && recurring.some(r => r.id === fijo) && <FijoSheet r={recurring.find(r => r.id === fijo)!} isNew={false} onClose={() => setFijo(null)} />}
    </div>
  );
}

/** Lo que falta entregar, por día: atrasados primero, luego hoy y los que vienen. */
function Pedidos({ pedidos, now, deliver, rows }: { pedidos: Order[]; now: string; deliver: (l: Order[]) => void; rows: (l: Order[], quick?: boolean) => React.ReactNode }) {
  const late = pedidos.filter(o => o.date < now);
  const days = [...new Set(pedidos.filter(o => o.date >= now).map(o => o.date))].sort();
  const total = pedidos.reduce((a, o) => a + orderTotal(o), 0);
  if (!pedidos.length) return <p className="timeline-empty">No hay pedidos por entregar. Anota uno arriba (con @vie, @mañana… para otro día).</p>;
  const group = (key: string, title: string, list: Order[], cls = '') => {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
    return (
      <section key={key} className={'prog-day ' + cls}>
        <div className="prog-head static">
          <strong>{title}</strong>
          <span className="prep mini">{bakeSummary(list).map((p, i) => <span key={p.code} className={'prep-dot s' + (i % 6)}><b>{p.qty}</b>{p.code}</span>)}</span>
          <span>{colones(list.reduce((a, o) => a + orderTotal(o), 0))}</span>
        </div>
        {rows(sorted, true)}
        {key <= now && list.length > 1 && <button className="chip deliver-all" onClick={() => deliver(list)}>✓ entregar todos</button>}
      </section>
    );
  };
  return (
    <div className="programa">
      <p className="fijos-sum"><b>{pedidos.length}</b> por entregar · <b>{colones(total)}</b></p>
      {late.length > 0 && group('0000', 'Atrasados', late, 'late')}
      {days.map(d => group(d, dayLabel(d, now), pedidos.filter(o => o.date === d), d === now ? 'today' : ''))}
    </div>
  );
}

/** Una fila: marca de pago (se toca para cambiarla), quién, qué, cuánto. Al tocarla se abre su ficha. */
function OrderRow({ o, open, onToggle, onClose, onDeliver, onRemove, onFijo }: {
  o: Order; open: boolean; onToggle: () => void; onClose: () => void; onDeliver?: () => void; onRemove: () => void; onFijo: (id: string) => void;
}) {
  const pedido = kindOf(o) === 'pedido';
  // el equipo no borra lo cobrado ni lo facturado (lo hace dueño o admin)
  const canRemove = useIsAdmin() || (o.pay !== 'paid' && !o.invoiceId);
  const toast = useToast();
  const due = orderDue(o);
  return (
    <li className={'order-row' + (open ? ' open' : '')}>
      <div className="prog-row">
        <PayMark state={o.pay} size={24} onChange={pay => updateOrder(o.id, { pay })} />
        <button className="prog-main" onClick={onToggle} aria-expanded={open}>
          <span className="prog-text">
            <strong>{o.recurringId ? '↻ ' : ''}{o.client}</strong>
            <small>{o.items.map(i => `${i.qty} ${i.name}`).join(' · ')}{o.note ? ` · ${o.note}` : ''}</small>
          </span>
          <span className="prog-side">
            <b>{colones(orderTotal(o))}</b>
            {o.pay === 'pending' && o.paidAmount ? <small className="warn">debe {colones(due)}</small> : o.discount ? <small>−{colones(o.discount)}</small> : null}
          </span>
        </button>
        {onDeliver && <button className="row-act deliver" onClick={onDeliver} title="Entregado" aria-label={`Entregado: ${o.client}`}><Icon name="check" size={18} /></button>}
        {canRemove && <button className="row-act remove" onClick={onRemove} title={pedido ? 'No se hizo (se quita)' : 'Borrar'} aria-label={`${pedido ? 'No se hizo' : 'Borrar'}: ${o.client}`}>
          <Icon name={pedido ? 'saltar' : 'basura'} size={17} />
        </button>}
      </div>
      {open && (
        <OrderForm
          key={o.updatedAt} inline initial={orderDraft(o)} editId={o.id} onClose={onClose} onFijo={onFijo}
          onDone={(client, date, kind) => { onClose(); toast(`Guardado: ${client} · ${kind === 'venta' ? 'vendido' : 'pedido'} · ${dayLabel(date, today())}`); }}
        />
      )}
    </li>
  );
}
