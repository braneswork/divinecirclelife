import { useMemo, useRef, useState } from 'react';
import {
  QUICK_ERRORS, addDays, bakeSummary, colones, dayLabel, orderTotal, parseQuick,
  type Order, type OrderStatus,
} from '@dc/core';
import { removeOrder, restoreOrder, saveOrder, today, updateOrder, useStore } from '../store';
import { useToast } from '../toast';

const NEXT: Record<OrderStatus, OrderStatus> = {
  pendiente: 'listo',
  listo: 'entregado',
  entregado: 'pendiente',
  cancelado: 'pendiente',
};

/** Reconstruye el texto rápido de un pedido para poder editarlo escribiendo.
    La fecha no va: al editar se conserva la del pedido salvo que se escriba otra @fecha. */
function toQuickText(o: Order): string {
  const parts = [
    o.items.map(i => `${i.qty}${i.code}`).join(' '),
    o.client,
    o.amountOverride != null ? String(o.amountOverride) : '',
  ];
  return parts.filter(Boolean).join(' ') + (o.note ? ` // ${o.note}` : '');
}

export function Pedidos() {
  const orders = useStore(s => s.orders);
  const offerings = useStore(s => s.offerings);
  const toast = useToast();
  const [day, setDay] = useState(today);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const now = today();

  const editingDate = editing ? orders.find(o => o.id === editing)?.date : undefined;
  const parsed = useMemo(
    () => parseQuick(text, offerings, now, editingDate ?? now),
    [text, offerings, now, editingDate],
  );
  const dayOrders = useMemo(
    () => orders.filter(o => o.date === day).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [orders, day],
  );
  const live = dayOrders.filter(o => o.status !== 'cancelado');
  const bake = bakeSummary(dayOrders);
  const total = live.reduce((s, o) => s + orderTotal(o), 0);
  const cobrado = live.filter(o => o.paid).reduce((s, o) => s + orderTotal(o), 0);

  const upcoming = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of orders) if (o.date >= now && o.status !== 'cancelado') counts.set(o.date, (counts.get(o.date) ?? 0) + 1);
    return Array.from({ length: 7 }, (_, i) => addDays(now, i)).map(d => ({ d, n: counts.get(d) ?? 0 }));
  }, [orders, now]);

  const activeCodes = offerings.filter(o => o.active && o.kind === 'producto');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed.ok) {
      toast(QUICK_ERRORS[parsed.error] + (parsed.detail ? `: ${parsed.detail}` : ''));
      return;
    }
    const o = saveOrder(parsed, editing ?? undefined);
    setText('');
    setEditing(null);
    setDay(o.date);
    toast(`${editing ? 'Actualizado' : 'Anotado'}: ${o.client} · ${dayLabel(o.date, now)}`);
    inputRef.current?.focus();
  }

  function startEdit(o: Order) {
    setEditing(o.id);
    setText(toQuickText(o));
    inputRef.current?.focus();
  }

  function remove(o: Order) {
    removeOrder(o.id);
    if (editing === o.id) { setEditing(null); setText(''); }
    toast(`Borrado: ${o.client}`, { label: 'Deshacer', run: () => restoreOrder(o) });
  }

  return (
    <div className="stack">
      <form className="quick card" onSubmit={submit}>
        <label className="eyebrow" htmlFor="quick">{editing ? 'Editando pedido' : 'Nuevo pedido'}</label>
        <div className="quick-row">
          <input
            id="quick"
            ref={inputRef}
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') { setText(''); setEditing(null); } }}
            placeholder="1C Soleida   ·   2C 1MS Ana @vie"
          />
          <button className="btn primary" type="submit" disabled={!parsed.ok}>{editing ? 'Guardar' : 'Anotar'}</button>
        </div>
        <div className={'quick-preview' + (text && !parsed.ok ? ' muted' : '')} aria-live="polite">
          {parsed.ok ? (
            <>
              <strong>{parsed.client}</strong>
              {' · '}{parsed.lines.map(l => `${l.qty} ${l.offering.name}`).join(', ')}
              {' · '}{colones(parsed.amountOverride ?? parsed.lines.reduce((s, l) => s + l.qty * l.offering.price, 0))}
              {' · '}{dayLabel(parsed.date, now)}
              {parsed.paid && ' · pagado'}
              {parsed.note && <em> · {parsed.note}</em>}
            </>
          ) : text.trim() ? (
            QUICK_ERRORS[parsed.error] + (parsed.detail ? `: ${parsed.detail}` : '')
          ) : (
            <span className="codes">
              {activeCodes.map(o => <span key={o.id}><b>{o.code}</b> {o.name}</span>)}
              <span><b>@vie</b> fecha</span><span><b>//</b> nota</span><span><b>pagado</b></span>
            </span>
          )}
        </div>
      </form>

      <div className="days" role="tablist" aria-label="Próximos días">
        {upcoming.map(({ d, n }) => (
          <button key={d} role="tab" aria-selected={d === day} className={'day' + (d === day ? ' on' : '')} onClick={() => setDay(d)}>
            <span>{dayLabel(d, now)}</span>
            <b>{n || '·'}</b>
          </button>
        ))}
      </div>

      <div className="between">
        <button className="btn ghost" onClick={() => setDay(addDays(day, -1))} aria-label="Día anterior">‹</button>
        <h2 className="title">{dayLabel(day, now)}</h2>
        <button className="btn ghost" onClick={() => setDay(addDays(day, 1))} aria-label="Día siguiente">›</button>
      </div>

      {bake.length > 0 && (
        <section className="card">
          <div className="eyebrow">Para hornear</div>
          <div className="bake">
            {bake.map(b => (
              <div key={b.code} className="bake-item">
                <span className="num">{b.qty}</span>
                <span>{b.name}</span>
              </div>
            ))}
          </div>
          <div className="totals">
            <span>{live.length} pedido{live.length === 1 ? '' : 's'}</span>
            <span>Total <b>{colones(total)}</b></span>
            <span>Por cobrar <b>{colones(total - cobrado)}</b></span>
          </div>
        </section>
      )}

      {dayOrders.length === 0 ? (
        <p className="empty">Sin pedidos para este día.</p>
      ) : (
        <ul className="orders">
          {dayOrders.map(o => (
            <li key={o.id} className={'order card' + (o.status === 'cancelado' ? ' cancelled' : '') + (editing === o.id ? ' editing' : '')}>
              <div className="order-main">
                <div className="order-head">
                  <strong>{o.client}</strong>
                  {o.source === 'web' && <span className="tag">web</span>}
                </div>
                <div className="order-items">{o.items.map(i => `${i.qty} ${i.name}`).join(' · ')}</div>
                {o.note && <div className="order-note">{o.note}</div>}
              </div>
              <div className="order-side">
                <span className="num">{colones(orderTotal(o))}</span>
                <div className="order-actions">
                  <button className={'pill ' + o.status} onClick={() => updateOrder(o.id, { status: NEXT[o.status] })} title="Cambiar estado">
                    {o.status}
                  </button>
                  <button className={'pill ' + (o.paid ? 'paid' : 'unpaid')} onClick={() => updateOrder(o.id, { paid: !o.paid })}>
                    {o.paid ? 'pagado' : 'por cobrar'}
                  </button>
                </div>
                <div className="order-actions subtle">
                  <button onClick={() => startEdit(o)}>editar</button>
                  {o.status !== 'cancelado' && <button onClick={() => updateOrder(o.id, { status: 'cancelado' })}>cancelar</button>}
                  <button onClick={() => remove(o)}>borrar</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
