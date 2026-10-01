/* Primitivas de composición circular.
   Todo vive dentro de un Stage cuadrado; las posiciones y tamaños son
   porcentajes del Stage, y el texto escala con él (unidades cqw). */

import { useEffect, type CSSProperties, type ReactNode } from 'react';

export interface Point { x: number; y: number }

/** Punto i de n repartidos en un círculo de radio r (% del stage). 0° = arriba. */
export function around(i: number, n: number, r: number, start = 0): Point {
  const a = ((start + (360 / Math.max(n, 1)) * i - 90) * Math.PI) / 180;
  return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) };
}

export function Stage({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={'stage ' + className}>{children}</div>;
}

/** Anillo decorativo (pista de una órbita). */
export function Track({ r, dashed }: { r: number; dashed?: boolean }) {
  return <div className={'track' + (dashed ? ' dashed' : '')} style={{ '--r': r } as CSSProperties} />;
}

interface BubbleProps {
  at?: Point;
  /** diámetro en % del stage */
  d: number;
  className?: string;
  onClick?: () => void;
  label?: string;
  children?: ReactNode;
  style?: CSSProperties;
}

export function Bubble({ at = { x: 50, y: 50 }, d, className = '', onClick, label, children, style }: BubbleProps) {
  const s = { '--x': at.x, '--y': at.y, '--d': d, ...style } as CSSProperties;
  return onClick ? (
    <button type="button" className={'bubble ' + className} style={s} onClick={onClick} aria-label={label}>
      {children}
    </button>
  ) : (
    <div className={'bubble ' + className} style={s} aria-label={label}>{children}</div>
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
  return (
    <div className="focus" role="dialog" aria-modal="true" onClick={e => e.target === e.currentTarget && onClose()}>
      <Stage className="focus-stage">
        <Track r={41} dashed />
        <div className="bubble focus-center" style={{ '--x': 50, '--y': 50, '--d': 62 } as CSSProperties}>{center}</div>
        {all.map((a, i) => (
          <Bubble key={i} at={around(i, all.length, 41, -360 / all.length / 2)} d={19} className={'action ' + (a.tone ?? '')} onClick={a.onClick} label={a.title}>
            <span>{a.label}</span>
          </Bubble>
        ))}
      </Stage>
    </div>
  );
}

/** Anillo partido en segmentos proporcionales (p. ej. qué hornear). */
export function Donut({ parts, r, width = 3.2 }: { parts: { key: string; value: number; label: string }[]; r: number; width?: number }) {
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
            <text x={50 + (r + 5.2) * Math.cos(mid)} y={50 + (r + 5.2) * Math.sin(mid)} textAnchor="middle" dominantBaseline="central">
              {p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
