/* Pan: el día al centro, un anillo con lo que hay que hornear,
   y los pedidos orbitando. Tocar un pedido lo trae al centro. */

import { useMemo, useRef, useState } from 'react';
import {
  QUICK_ERRORS, addDays, bakeSummary, colones, dayLabel, fromISODate, orderTotal, parseQuick,
  type Order, type OrderStatus,
} from '@dc/core';
import { Bubble, Donut, Focus, Stage, Track, around } from '../orbit/Orbit';
import { removeOrder, restoreOrder, saveOrder, today, updateOrder, useStore } from '../store';
import { useToast } from '../toast';

const NEXT: Record<OrderStatus, OrderStatus> = { pendiente: 'listo', listo: 'entregado', entregado: 'pendiente', cancelado: 'pendiente' };

/** Texto rápido de un pedido para editarlo escribiendo (la fecha se conserva sola). */
const toQuickText = (o: Order) =>
  [o.items.map(i => `${i.qty}${i.code}`).join(' '), o.client, o.amountOverride != null ? String(o.amountOverride) : '']
    .filter(Boolean).join(' ') + (o.note ? ` // ${o.note}` : '');

/** Reparte los pedidos en una o dos órbitas según cuántos haya. */
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
  const total = live.reduce((s, o) => s + orderTotal(o), 0);
  const porCobrar = live.filter(o => !o.paid).reduce((s, o) => s + orderTotal(o), 0);
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
    <div className="module">
      <nav className="beads" aria-label="Días">
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
          <span className="small">{live.length === 1 ? 'pedido' : 'pedidos'} · {colones(total)}</span>
          {porCobrar > 0 && <span className="small warn">{colones(porCobrar)} por cobrar</span>}
        </Bubble>
        {dayOrders.map((o, i) => (
          <Bubble key={o.id} at={spots[i].at} d={spots[i].d} className={'order ' + o.status + (editing === o.id ? ' editing' : '')} onClick={() => setFocus(o.id)} label={o.client}>
            <strong>{o.client.split(' ')[0]}</strong>
            <span className="small">{o.items.map(it => `${it.qty}${it.code}`).join(' ')}</span>
            {o.paid && <i className="moon" aria-label="pagado" />}
            {o.source === 'web' && <i className="moon web" aria-label="desde la web" />}
          </Bubble>
        ))}
        <Bubble at={spots[dayOrders.length].at} d={spots[dayOrders.length].d} className="add" onClick={() => inputRef.current?.focus()} label="Nuevo pedido">
          <span>+</span>
        </Bubble>
      </Stage>

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
      <p className={'portal-hint' + (text.trim() && !parsed.ok ? ' bad' : '')} aria-live="polite">
        {parsed.ok
          ? <><b>{parsed.client}</b> · {parsed.lines.map(l => `${l.qty} ${l.offering.name}`).join(', ')} · {colones(parsed.amountOverride ?? parsed.lines.reduce((s, l) => s + l.qty * l.offering.price, 0))} · {dayLabel(parsed.date, now)}{parsed.paid ? ' · pagado' : ''}</>
          : text.trim()
            ? QUICK_ERRORS[parsed.error] + (parsed.detail ? `: ${parsed.detail}` : '')
            : <>{offerings.filter(o => o.active && o.kind === 'producto').map(o => <span key={o.id}><b>{o.code}</b> {o.name} </span>)}· <b>@vie</b> fecha · <b>//</b> nota · <b>pagado</b></>}
      </p>

      {focused && (
        <Focus
          onClose={() => setFocus(null)}
          center={
            <>
              <span className="eyebrow">{dayLabel(focused.date, now)} · {focused.status}</span>
              <strong className="mid">{focused.client}</strong>
              <span className="small">{focused.items.map(i => `${i.qty} ${i.name}`).join(' · ')}</span>
              {focused.note && <em className="small">{focused.note}</em>}
              <strong className="price">{colones(orderTotal(focused))}</strong>
              <span className={'small ' + (focused.paid ? 'ok' : 'warn')}>{focused.paid ? 'pagado' : 'por cobrar'}</span>
            </>
          }
          actions={[
            { label: NEXT[focused.status] === 'pendiente' ? 'reabrir' : NEXT[focused.status], onClick: () => updateOrder(focused.id, { status: NEXT[focused.status] }), tone: 'on' },
            { label: focused.paid ? 'no pagado' : 'pagado', onClick: () => updateOrder(focused.id, { paid: !focused.paid }), tone: focused.paid ? undefined : 'ok' },
            { label: 'editar', onClick: () => edit(focused) },
            focused.status === 'cancelado'
              ? { label: 'reactivar', onClick: () => updateOrder(focused.id, { status: 'pendiente' }) }
              : { label: 'cancelar', onClick: () => updateOrder(focused.id, { status: 'cancelado' }), tone: 'bad' },
            { label: 'borrar', onClick: () => remove(focused), tone: 'bad' },
          ]}
        />
      )}
    </div>
  );
}
