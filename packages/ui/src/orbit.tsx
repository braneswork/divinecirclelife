/* Primitivas de composición circular.
   Todo vive dentro de un Stage cuadrado; las posiciones y tamaños son
   porcentajes del Stage, y el texto escala con él (unidades cqw). */

import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface Point { x: number; y: number }

/** Punto i de n repartidos en un círculo de radio r (% del stage). 0° = arriba. */
export function around(i: number, n: number, r: number, start = 0): Point {
  const a = ((start + (360 / Math.max(n, 1)) * i - 90) * Math.PI) / 180;
  return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) };
}

/** Escenario cuadrado. Con fit (por defecto) ocupa el mayor cuadrado que cabe en el espacio libre de la página. */
export function Stage({ children, className = '', fit = true }: { children: ReactNode; className?: string; fit?: boolean }) {
  const stage = <div className={'stage ' + className}>{children}</div>;
  return fit ? <div className="stage-box">{stage}</div> : stage;
}

/** Anillo decorativo (pista de una órbita). */
export function Track({ r, dashed }: { r: number; dashed?: boolean }) {
  return <div className={'track' + (dashed ? ' dashed' : '')} style={{ '--r': r } as CSSProperties} />;
}

interface BubbleProps {
  /** identificador para encontrar la burbuja en el DOM (data-key), p. ej. para volver a ella */
  dataKey?: string;
  at?: Point;
  /** diámetro en % del stage */
  d: number;
  className?: string;
  /** recibe la burbuja tocada, para poder entrar en ella con Zoom */
  onClick?: (el: HTMLElement) => void;
  label?: string;
  children?: ReactNode;
  style?: CSSProperties;
}

export function Bubble({ dataKey, at = { x: 50, y: 50 }, d, className = '', onClick, label, children, style }: BubbleProps) {
  const s = { '--x': at.x, '--y': at.y, '--d': d, ...style } as CSSProperties;
  return onClick ? (
    <button type="button" className={'bubble ' + className} style={s} onClick={e => onClick(e.currentTarget)} aria-label={label} data-key={dataKey}>
      {children}
    </button>
  ) : (
    <div className={'bubble ' + className} style={s} aria-label={label} data-key={dataKey}>{children}</div>
  );
}

export interface FocusAction {
  label: ReactNode;
  onClick: () => void;
  tone?: 'on' | 'bad' | 'ok' | 'muted';
  title?: string;
}

/** Algo en el centro con sus acciones orbitando alrededor. */
export function Focus({ center, actions, onClose }: { center: ReactNode; actions: FocusAction[]; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);
  const all = [...actions, { label: '×', onClick: onClose, tone: 'muted' as const, title: 'Cerrar' }];
  // portal: el paginador usa transform, que rompería el position: fixed
  return createPortal(
    <div className="focus" role="dialog" aria-modal="true" onClick={e => e.target === e.currentTarget && onClose()}>
      <Stage className="focus-stage" fit={false}>
        <Track r={41} dashed />
        <div className="bubble focus-center" style={{ '--x': 50, '--y': 50, '--d': 62 } as CSSProperties}>{center}</div>
        {all.map((a, i) => (
          <Bubble key={i} at={around(i, all.length, 41, -360 / all.length / 2)} d={19} className={'action ' + (a.tone ?? '')} onClick={() => a.onClick()} label={a.title}>
            <span>{a.label}</span>
          </Bubble>
        ))}
      </Stage>
    </div>,
    document.body,
  );
}

/** Anillo partido en segmentos proporcionales (p. ej. qué hornear). */
export function Donut({ parts, r, width = 3.2, labels = true }: { parts: { key: string; value: number; label: string }[]; r: number; width?: number; labels?: boolean }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (!total) return null;
  const gap = parts.length > 1 ? 1.6 : 0; // grados entre segmentos
  let acc = 0;
  const arc = (from: number, to: number) => {
    const p = (deg: number) => {
      const a = ((deg - 90) * Math.PI) / 180;
      return `${50 + r * Math.cos(a)} ${50 + r * Math.sin(a)}`;
    };
    return `M ${p(from)} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${p(to)}`;
  };
  return (
    <svg className="donut" viewBox="0 0 100 100" aria-hidden="true">
      {parts.map((p, i) => {
        const from = (acc / total) * 360;
        acc += p.value;
        const to = (acc / total) * 360;
        const mid = ((from + to) / 2 - 90) * (Math.PI / 180);
        const full = parts.length === 1;
        return (
          <g key={p.key} className={'seg s' + (i % 6)}>
            {full ? <circle cx="50" cy="50" r={r} strokeWidth={width} /> : <path d={arc(from + gap / 2, to - gap / 2)} strokeWidth={width} />}
            {labels && <text x={50 + (r + 5.2) * Math.cos(mid)} y={50 + (r + 5.2) * Math.sin(mid)} textAnchor="middle" dominantBaseline="central">
              {p.label}
            </text>}
          </g>
        );
      })}
    </svg>
  );
}
