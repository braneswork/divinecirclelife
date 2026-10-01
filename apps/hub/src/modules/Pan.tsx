/* Pan: el día al centro, un anillo con lo que hay que hornear,
   y los pedidos orbitando. Tocar un pedido lo trae al centro. */

import { useMemo, useRef, useState } from 'react';
import {
  PAY, QUICK_ERRORS, STATUS_FLOW, addDays, bakeSummary, colones, dayLabel, fromISODate, orderTotal, parseQuick, payTotals,
  type Order,
} from '@dc/core';
import { Bubble, Donut, Focus, PayMark, Stage, Track, around, useToast } from '@dc/ui';
import { removeOrder, restoreOrder, saveOrder, today, updateOrder, useStore } from '../store';

/** Texto rápido de un pedido para editarlo escribiendo (la fecha se conserva sola). */
const toQuickText = (o: Order) =>
  [o.items.map(i => `${i.qty}${i.code}`).join(' '), o.client, o.amountOverride != null ? String(o.amountOverride) : '']
    .filter(Boolean).join(' ') + (o.note ? ` // ${o.note}` : '');

/** Reparte los pedidos (más el "+") en una o dos órbitas según cuántos haya. */
function layout(n: number) {
  if (n <= 11) return Array.from({ length: n + 1 }, (_, i) => ({ at: around(i, n + 1, 40), d: 16 }));
  const outer = Math.ceil((n + 1) / 2);
  return Array.from({ length: n + 1 }, (_, i) =>
    i < outer
      ? { at: around(i, outer, 43.5), d: 11.5 }
      : { at: around(i - outer, n + 1 - outer, 34.5, 180 / (n + 1 - outer)), d: 11.5 });
}

export function Pan() {
  const orders = useStore(s => s.orders);
  const offerings = useStore(s => s.offerings);
  const toast = useToast();
  const now = today();
  const [day, setDay] = useState(now);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const editingDate = editing ? orders.find(o => o.id === editing)?.date : undefined;
  const parsed = useMemo(() => parseQuick(text, offerings, now, editingDate ?? now), [text, offerings, now, editingDate]);

  const dayOrders = useMemo(
    () => orders.filter(o => o.date === day).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [orders, day],
  );
  const live = dayOrders.filter(o => o.status !== 'cancelado');
  const bake = bakeSummary(dayOrders);
  const t = payTotals(dayOrders);
  const week = Array.from({ length: 7 }, (_, i) => addDays(now, i));
  const countOn = (d: string) => orders.filter(o => o.date === d && o.status !== 'cancelado').length;
  const spots = layout(dayOrders.length);
  const focused = orders.find(o => o.id === focus);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed.ok) return toast(QUICK_ERRORS[parsed.error] + (parsed.detail ? `: ${parsed.detail}` : ''));
    const o = saveOrder(parsed, editing ?? undefined);
    setText(''); setEditing(null); setDay(o.date);
    toast(`${editing ? 'Actualizado' : 'Anotado'}: ${o.client} · ${dayLabel(o.date, now)}`);
    inputRef.current?.focus();
  }

  function edit(o: Order) {
    setFocus(null); setEditing(o.id); setText(toQuickText(o));
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function remove(o: Order) {
    setFocus(null);
    removeOrder(o.id);
    if (editing === o.id) { setEditing(null); setText(''); }
    toast(`Borrado: ${o.client}`, { label: 'Deshacer', run: () => restoreOrder(o) });
  }

  return (
    <>
      <nav className="beads" aria-label="Días" data-noswipe>
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
      </nav>

      <Stage>
        <Track r={dayOrders.length > 11 ? 43.5 : 40} dashed />
        <Donut r={21} parts={bake.map(b => ({ key: b.code, value: b.qty, label: `${b.qty}${b.code}` }))} />
        <Bubble d={33} className="core">
          <span className="eyebrow">{dayLabel(day, now)}</span>
          <strong className="big">{live.length}</strong>
          <span className="small">{live.length === 1 ? 'pedido' : 'pedidos'} · {colones(t.total)}</span>
          {t.pending > 0 && <span className="small warn">✕ {colones(t.pending)}</span>}
          {t.credit > 0 && <span className="small credit">+ {colones(t.credit)}</span>}
        </Bubble>
        {dayOrders.map((o, i) => (
          <Bubble key={o.id} at={spots[i].at} d={spots[i].d} className={'order ' + o.status + (editing === o.id ? ' editing' : '')} onClick={() => setFocus(o.id)} label={o.client}>
            <strong>{o.client.split(' ')[0]}</strong>
            <span className="small">{o.items.map(it => `${it.qty}${it.code}`).join(' ')}</span>
            <PayMark state={o.pay} size={spots[i].d > 12 ? 20 : 16} />
            {o.source === 'web' && <i className="web" aria-label="desde la web" />}
          </Bubble>
        ))}
        <Bubble at={spots[dayOrders.length].at} d={spots[dayOrders.length].d} className="add" onClick={() => inputRef.current?.focus()} label="Nuevo pedido">
          <span>+</span>
        </Bubble>
      </Stage>

      <div className="legend-row">
        <span><i className="ring-legend" />por hornear</span>
        <span><i className="ring-legend horneando" />horneando</span>
        <span><i className="ring-legend listo" />listo</span>
        <span><i className="ring-legend entregado" />entregado</span>
        <span><PayMark state="paid" size={14} /><PayMark state="pending" size={14} /><PayMark state="credit" size={14} /></span>
      </div>

      <form className="portal" onSubmit={submit}>
        <input
          ref={inputRef}
          autoComplete="off" autoCapitalize="off" spellCheck={false}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') { setText(''); setEditing(null); } }}
          placeholder={editing ? 'Editando pedido…' : '1C Soleida  ·  2C 1MS Ana @vie'}
          aria-label="Pedido rápido"
        />
        <button className="go" disabled={!parsed.ok} aria-label={editing ? 'Guardar' : 'Anotar'}>↵</button>
      </form>
      <p className={'hint' + (text.trim() && !parsed.ok ? ' bad' : '')} aria-live="polite">
        {parsed.ok
          ? <><b>{parsed.client}</b> · {parsed.lines.map(l => `${l.qty} ${l.offering.name}`).join(', ')} · {colones(parsed.amountOverride ?? parsed.lines.reduce((s, l) => s + l.qty * l.offering.price, 0))} · {dayLabel(parsed.date, now)} · {PAY[parsed.pay].mark} {PAY[parsed.pay].label}</>
          : text.trim()
            ? QUICK_ERRORS[parsed.error] + (parsed.detail ? `: ${parsed.detail}` : '')
            : <>{offerings.filter(o => o.active && o.kind === 'producto').map(o => <span key={o.id}><b>{o.code}</b> {o.name} </span>)}· <b>@vie</b> fecha · <b>//</b> nota · <b>pagado</b> · <b>credito</b></>}
      </p>

      {focused && (
        <Focus
          onClose={() => setFocus(null)}
          center={
            <>
              <span className="eyebrow">{dayLabel(focused.date, now)} · {focused.status === 'cancelado' ? 'cancelado' : STATUS_FLOW[focused.status].label}</span>
              <strong className="mid">{focused.client}</strong>
              <span className="small">{focused.items.map(i => `${i.qty} ${i.name}`).join(' · ')}</span>
              {focused.note && <em className="small">{focused.note}</em>}
              <strong className="price">{colones(orderTotal(focused))}</strong>
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
            { label: 'borrar', onClick: () => remove(focused), tone: 'bad' },
          ]}
        />
      )}
    </>
  );
}
