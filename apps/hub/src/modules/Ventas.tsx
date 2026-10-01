/* Ventas: el día al centro, un anillo con lo que hay que preparar
   (pan, jugos, café…) y los pedidos orbitando. Tocar un pedido lo trae al centro.
   El pan se hornea por tandas: los días de horno muestran todo lo que va. */

import { useMemo, useRef, useState } from 'react';
import {
  PAY, QUICK_ERRORS, matchClient, STATUS_FLOW, addDays, bakeSummary, colones, dayLabel, fromISODate, orderDue, orderTotal, parseQuick, payTotals, priceOn,
  type Order,
} from '@dc/core';
import { Bubble, Donut, Focus, PayMark, Stage, Timeline, ViewToggle, spiralCells, useToast, useViewMode } from '@dc/ui';
import { HelpDot } from '../HelpDot';
import { Fijos, FijoSheet } from './Fijos';
import { OrderSheet, draftFromLines, type OrderDraft } from './OrderSheet';
import { removeOrder, restoreOrder, today, updateOrder, useStore } from '../store';

/** Texto rápido de un pedido para editarlo escribiendo (la fecha se conserva sola). */
const orderDraft = (o: Order): OrderDraft => ({
  cart: Object.fromEntries(o.items.map(i => [i.offeringId, i.qty])), client: o.client, date: o.date,
  pay: o.pay, note: o.note, amountOverride: o.amountOverride, discount: o.discount ?? undefined, paidAmount: o.paidAmount ?? undefined,
});

export function Ventas() {
  const orders = useStore(s => s.orders);
  const offerings = useStore(s => s.offerings);
  const clients = useStore(s => s.clients);
  const toast = useToast();
  const now = today();
  const [day, setDay] = useState(now);
  const [text, setText] = useState('');
  const [sheet, setSheet] = useState<{ draft: OrderDraft; editId?: string } | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useViewMode('ventas', ['programa', 'hoy', 'semanal', 'historial']);
  const recurring = useStore(s => s.recurring);
  const [fijo, setFijo] = useState<string | null>(null);

  const parsed = useMemo(() => parseQuick(text, offerings, now), [text, offerings, now]);

  const dayOrders = useMemo(
    () => orders.filter(o => o.date === day).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [orders, day],
  );
  const live = dayOrders.filter(o => o.status !== 'cancelado');
  const bake = bakeSummary(dayOrders);
  const t = payTotals(dayOrders);
  const week = Array.from({ length: 7 }, (_, i) => addDays(now, i));
  const countOn = (d: string) => orders.filter(o => o.date === d && o.status !== 'cancelado').length;
  // espiral de Doyle: del pedido más chico (adentro) al más grande (afuera)
  const bySize = [...dayOrders].sort((a, b) => orderTotal(a) - orderTotal(b));
  const cells = spiralCells(bySize.length, { hole: 16, rotate: -90 });
  const focused = orders.find(o => o.id === focus);

  // próximos: de hoy en adelante, lo que falta entregar · historial: los últimos 30 días
  const upcoming = orders.filter(o => o.date >= now && o.status !== 'entregado' && o.status !== 'cancelado').sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const past = orders.filter(o => o.date < now && o.date >= addDays(now, -30));
  const row = (o: Order, showStatus: boolean) => ({
    id: o.id, date: o.date, mark: o.pay, muted: o.status === 'cancelado',
    title: `${o.recurringId ? '↻ ' : ''}${o.client}`,
    detail: `${o.items.map(i => `${i.qty} ${i.name}`).join(' · ')}${showStatus || o.status === 'cancelado' ? ` · ${o.status === 'cancelado' ? 'cancelado' : STATUS_FLOW[o.status].label}` : ''}`,
    amount: orderTotal(o), onClick: () => setFocus(o.id),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed.ok) return toast(QUICK_ERRORS[parsed.error] + (parsed.detail ? `: ${parsed.detail}` : ''));
    // lo escrito abre la ficha de la venta: ahí se revisa, se marca semanal o el pago
    setSheet({ draft: draftFromLines(parsed.lines, { client: parsed.client, date: parsed.date, pay: parsed.pay, note: parsed.note, weekly: parsed.weekly, amountOverride: parsed.amountOverride }) });
  }

  function edit(o: Order) {
    setFocus(null); setSheet({ draft: orderDraft(o), editId: o.id });
  }

  function saved(client: string, date: string) {
    if (!sheet?.editId) setText('');
    toast(`${sheet?.editId ? 'Actualizado' : 'Anotado'}: ${client} · ${dayLabel(date, now)}`);
    setSheet(null); setDay(date);
  }

  function remove(o: Order) {
    setFocus(null);
    removeOrder(o.id);
    toast(`Borrado: ${o.client}`, { label: 'Deshacer', run: () => restoreOrder(o) });
  }

  return (
    <>
      {view === 'hoy' && <nav className="beads" aria-label="Días" data-noswipe>
        <button className="bead nav" onClick={() => setDay(addDays(day, -1))} aria-label="Día anterior">‹</button>
        {week.map(d => {
          const n = countOn(d);
          return (
            <button key={d} className={'bead' + (d === day ? ' on' : '') + (n ? ' has' : '')} onClick={() => setDay(d)} aria-pressed={d === day} title={dayLabel(d, now)}>
              <span>{d === now ? 'hoy' : 'dlmmjvs'[fromISODate(d).getDay()]}</span>
              <b>{fromISODate(d).getDate()}</b>
            </button>
          );
        })}
        <button className="bead nav" onClick={() => setDay(addDays(day, 1))} aria-label="Día siguiente">›</button>
      </nav>}

      <ViewToggle value={view} onChange={setView} options={['programa', 'hoy', 'semanal', 'historial']} />
      {view === 'semanal' ? <Fijos /> : view === 'programa' ? (
        <Programa orders={upcoming} now={now} onOpen={setFocus} onDay={d => { setDay(d); setView('hoy'); }} />
      ) : view === 'historial' ? (
        <Timeline today={now} empty="Sin ventas en los últimos 30 días." items={past.map(o => row(o, false))} />
      ) : (
      <Stage>
        <Donut r={14.6} width={2.2} labels={false} parts={bake.map(b => ({ key: b.code, value: b.qty, label: `${b.qty}${b.code}` }))} />
        <Bubble d={26} className="core">
          <span className="eyebrow">{dayLabel(day, now)}</span>
          <strong className="big">{live.length}</strong>
          <span className="small">{colones(t.total)}</span>
          {t.pending > 0 && <span className="small warn">✕ {colones(t.pending)}</span>}
          {t.credit > 0 && <span className="small credit">+ {colones(t.credit)}</span>}
        </Bubble>
        {bySize.map((o, i) => (
          <Bubble key={o.id} at={cells[i].at} d={cells[i].d} className={'order ' + o.status + (sheet?.editId === o.id ? ' editing' : '')} onClick={() => setFocus(o.id)} label={o.client}>
            <strong>{o.client.split(' ')[0]}</strong>
            {cells[i].d > 9 && <span className="small">{o.items.map(it => `${it.qty}${it.code}`).join(' ')}</span>}
            <PayMark state={o.pay} size={cells[i].d > 12 ? 20 : 14} />
            {clients.find(c => c.id === o.clientId)?.billing === 'mensual' && <i className="bill-tag" title={o.invoiceId ? 'facturado' : 'cobro mensual'}>{o.invoiceId ? 'F' : 'M'}</i>}
            {o.source === 'web' && <i className="web" aria-label="desde la web" />}
            {o.recurringId && <i className="rep-tag" title="pedido fijo">↻</i>}
          </Bubble>
        ))}
      </Stage>
      )}

      {bake.length > 0 && view === 'hoy' && (
        <div className="prep" aria-label="Para preparar">
          <span className="eyebrow">para preparar</span>
          {bake.map((b, i) => <span key={b.code} className={'prep-dot s' + (i % 6)}><b>{b.qty}</b>{b.code}</span>)}
        </div>
      )}

      <form className="portal" onSubmit={submit}>
        <input
          ref={inputRef}
          autoComplete="off" autoCapitalize="off" spellCheck={false}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') setText(''); }}
          placeholder="Rápido: 2C 1MS Soleida"
          aria-label="Venta rápida"
        />
        <HelpDot topic="ventas" label="Cómo escribir una venta rápida" />
        <button className="go" disabled={!parsed.ok} aria-label="Anotar">↵</button>
      </form>
      <p className={'hint' + (text.trim() && !parsed.ok ? ' bad' : '')} aria-live="polite">
        {parsed.ok
          ? <><b>{matchClient(parsed.client, clients)?.name ?? parsed.client}</b>{matchClient(parsed.client, clients)?.billing === 'mensual' ? ' (mensual)' : ''} · {parsed.lines.map(l => `${l.qty} ${l.offering.name}`).join(', ')} · {colones(parsed.amountOverride ?? parsed.lines.reduce((s, l) => s + Math.round(l.qty * priceOn(l.offering, parsed.date) * (1 - (matchClient(parsed.client, clients)?.discounts[l.offering.id] ?? 0))), 0))} · {dayLabel(parsed.date, now)} · {PAY[parsed.pay].mark} {PAY[parsed.pay].label}{parsed.weekly ? ' · ↻ semanal' : ''}</>
          : text.trim() ? QUICK_ERRORS[parsed.error] + (parsed.detail ? `: ${parsed.detail}` : '') : null}
      </p>

      {sheet && <OrderSheet initial={sheet.draft} editId={sheet.editId} onClose={() => setSheet(null)} onDone={saved} />}

      {fijo && recurring.some(r => r.id === fijo) && <FijoSheet r={recurring.find(r => r.id === fijo)!} isNew={false} onClose={() => setFijo(null)} />}

      {focused && (
        <Focus
          onClose={() => setFocus(null)}
          center={
            <>
              <span className="eyebrow">{dayLabel(focused.date, now)} · {focused.status === 'cancelado' ? 'cancelado' : STATUS_FLOW[focused.status].label}{focused.recurringId ? ' · ↻ fijo' : ''}</span>
              <strong className="mid">{focused.client}</strong>
              <span className="small">{focused.items.map(i => `${i.qty} ${i.name}`).join(' · ')}</span>
              {focused.note && <em className="small">{focused.note}</em>}
              <strong className="price">{colones(orderTotal(focused))}</strong>
              {!!focused.discount && <span className="small">descuento −{colones(focused.discount)}</span>}
              {focused.pay === 'pending' && !!focused.paidAmount && <span className="small warn">abonó {colones(focused.paidAmount)} · debe {colones(orderDue(focused))}</span>}
              <PayMark state={focused.pay} size={34} onChange={pay => updateOrder(focused.id, { pay })} />
              <span className="small">{PAY[focused.pay].label}</span>
            </>
          }
          actions={[
            focused.status === 'cancelado'
              ? { label: 'reactivar', onClick: () => updateOrder(focused.id, { status: 'pendiente' }), tone: 'on' }
              : { label: STATUS_FLOW[STATUS_FLOW[focused.status].next as keyof typeof STATUS_FLOW].label, onClick: () => updateOrder(focused.id, { status: STATUS_FLOW[focused.status as keyof typeof STATUS_FLOW].next }), tone: 'on', title: 'Siguiente estado' },
            { label: `${PAY[PAY[focused.pay].next].mark} ${PAY[PAY[focused.pay].next].label}`, onClick: () => updateOrder(focused.id, { pay: PAY[focused.pay].next }) },
            { label: 'editar', onClick: () => edit(focused) },
            ...(focused.status === 'cancelado' ? [] : [{ label: 'cancelar', onClick: () => updateOrder(focused.id, { status: 'cancelado' }), tone: 'bad' as const }]),
            ...(focused.recurringId && recurring.some(r => r.id === focused.recurringId) ? [{ label: '↻ fijo', onClick: () => { setFocus(null); setFijo(focused.recurringId!); } }] : []),
            { label: 'borrar', onClick: () => remove(focused), tone: 'bad' },
          ]}
        />
      )}
    </>
  );
}

/** La programación: día por día lo que viene, con qué preparar y cada pedido. */
function Programa({ orders, now, onOpen, onDay }: { orders: Order[]; now: string; onOpen: (id: string) => void; onDay: (d: string) => void }) {
  const days = [...new Set(orders.map(o => o.date))].sort();
  const total = orders.reduce((a, o) => a + orderTotal(o), 0);
  if (!days.length) return <p className="timeline-empty">No hay pedidos por entregar. Anota uno con el campo de abajo o con + en el inicio.</p>;
  return (
    <div className="programa">
      <p className="fijos-sum"><b>{orders.length}</b> pedidos por entregar · <b>{colones(total)}</b></p>
      {days.map(d => {
        const list = orders.filter(o => o.date === d);
        const prep = bakeSummary(list);
        return (
          <section key={d} className={'prog-day' + (d === now ? ' today' : '')}>
            <button className="prog-head" onClick={() => onDay(d)} title="Ver el día en círculo">
              <strong>{dayLabel(d, now)}</strong>
              <span>{list.length} {list.length === 1 ? 'pedido' : 'pedidos'} · {colones(list.reduce((a, o) => a + orderTotal(o), 0))}</span>
            </button>
            <div className="prep">
              {prep.map((p, i) => <span key={p.code} className={'prep-dot s' + (i % 6)}><b>{p.qty}</b>{p.code}</span>)}
            </div>
            <ul className="prog-list">
              {list.map(o => (
                <li key={o.id}>
                  <button className={'prog-row ' + o.status} onClick={() => onOpen(o.id)}>
                    <PayMark state={o.pay} size={22} />
                    <span className="prog-text">
                      <strong>{o.recurringId ? '↻ ' : ''}{o.client}</strong>
                      <small>{o.items.map(i => `${i.qty} ${i.name}`).join(' · ')}{o.note ? ` · ${o.note}` : ''}</small>
                    </span>
                    <span className="prog-side">
                      <b>{colones(orderTotal(o))}</b>
                      <small>{o.pay === 'pending' && o.paidAmount ? `debe ${colones(orderDue(o))}` : o.status === 'cancelado' ? 'cancelado' : STATUS_FLOW[o.status].label}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
