/* Historial: los movimientos en orden, agrupados por día, sobre una línea con
   un círculo por movimiento (la marca de pago o el color de su tipo). */

import { useEffect, useState, type ReactNode } from 'react';
import { colones, dayLabel, type PayState } from '@dc/core';
import { PayMark } from './pay';
import { Icon } from './icons';

export interface TimelineItem {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  title: ReactNode;
  detail?: ReactNode;
  /** positivo entra, negativo sale */
  amount?: number;
  mark?: PayState;
  /** color del círculo cuando no hay marca de pago */
  tone?: string;
  muted?: boolean;
  onClick?: () => void;
}

export function Timeline({ items, today, empty = 'Sin movimientos.' }: { items: TimelineItem[]; today: string; empty?: string }) {
  if (!items.length) return <p className="timeline-empty">{empty}</p>;
  const days = [...new Set(items.map(i => i.date))].sort().reverse();
  return (
    <div className="timeline">
      {days.map(d => {
        const rows = items.filter(i => i.date === d);
        const net = rows.reduce((s, r) => s + (r.muted ? 0 : r.amount ?? 0), 0);
        return (
          <section key={d} className="timeline-day">
            <header><span>{dayLabel(d, today)}</span><b className={net < 0 ? 'out' : ''}>{colones(net)}</b></header>
            <ul>
              {rows.map(r => {
                const Row = r.onClick ? 'button' : 'div';
                return (
                  <li key={r.id} className={r.muted ? 'muted' : ''}>
                    <Row className="timeline-row" onClick={r.onClick} type={r.onClick ? 'button' : undefined}>
                      <span className="timeline-node">
                        {r.mark ? <PayMark state={r.mark} size={22} /> : <i style={{ background: r.tone ?? 'var(--muted)' }} />}
                      </span>
                      <span className="timeline-text"><strong>{r.title}</strong>{r.detail && <small>{r.detail}</small>}</span>
                      {r.amount != null && <span className={'timeline-amount' + (r.amount < 0 ? ' out' : '')}>{r.amount < 0 ? '−' : ''}{colones(Math.abs(r.amount))}</span>}
                    </Row>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export type ViewMode = 'circulo' | 'historial' | 'semanal';

/** Interruptor Círculo / Historial, recordado por pantalla en este dispositivo. */
export function useViewMode(key: string): [ViewMode, (v: ViewMode) => void] {
  const k = 'dc-view-' + key;
  const [v, setV] = useState<ViewMode>(() => { try { return (localStorage.getItem(k) as ViewMode) || 'circulo'; } catch { return 'circulo'; } });
  useEffect(() => { try { localStorage.setItem(k, v); } catch { /* sin storage */ } }, [k, v]);
  return [v, setV];
}

const VIEW_LABEL: Record<ViewMode, { label: string; icon: string }> = {
  circulo: { label: 'Círculo', icon: 'circulo' },
  historial: { label: 'Historial', icon: 'lista' },
  semanal: { label: 'Semanal', icon: 'repetir' },
};

export function ViewToggle({ value, onChange, options = ['circulo', 'historial'] }: { value: ViewMode; onChange: (v: ViewMode) => void; options?: ViewMode[] }) {
  return (
    <div className="view-toggle" role="tablist" aria-label="Vista">
      {options.map(v => (
        <button key={v} role="tab" aria-selected={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
          <Icon name={VIEW_LABEL[v].icon} size={16} /> {VIEW_LABEL[v].label}
        </button>
      ))}
    </div>
  );
}
