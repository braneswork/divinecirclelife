/* Entrar en un círculo: la capa nace del círculo tocado y se expande hasta
   llenar su contenedor; al cerrar se contrae de vuelta a ese círculo. */

import { useLayoutEffect, useRef, type ReactNode } from 'react';

export interface Origin { x: number; y: number; r: number }

/** Origen (relativo a `container`) a partir del elemento tocado. */
export function originOf(el: Element | null | undefined, container: Element | null | undefined): Origin | undefined {
  if (!el || !container) return undefined;
  const a = el.getBoundingClientRect(), c = container.getBoundingClientRect();
  return { x: a.left - c.left + a.width / 2, y: a.top - c.top + a.height / 2, r: Math.min(a.width, a.height) / 2 };
}

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Zoom({ from, closing, onClosed, children, className = '', label, tone }: {
  from?: Origin; closing?: boolean; onClosed?: () => void; children: ReactNode; className?: string; label?: string;
  /** color del círculo en el que se entra: tiñe los anillos de adentro */
  tone?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const shape = (o: Origin | undefined, open: boolean) => {
    const el = ref.current!;
    const w = el.clientWidth, h = el.clientHeight;
    const p = o ?? { x: w / 2, y: h / 2, r: 0 };
    const R = Math.hypot(Math.max(p.x, w - p.x), Math.max(p.y, h - p.y));
    return `circle(${open ? R : p.r}px at ${p.x}px ${p.y}px)`;
  };

  useLayoutEffect(() => {
    if (!from || reduced()) return;
    ref.current!.animate([{ clipPath: shape(from, false) }, { clipPath: shape(from, true) }], { duration: 560, easing: 'cubic-bezier(.65,0,.25,1)' });
    ref.current!.querySelector('.zoom-inner')?.animate(
      [{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }],
      { duration: 420, delay: 180, easing: 'ease-out', fill: 'backwards' },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (!closing) return;
    if (reduced()) { onClosed?.(); return; }
    const anim = ref.current!.animate([{ clipPath: shape(from, true) }, { clipPath: shape(from, false) }], { duration: 460, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards' });
    ref.current!.querySelector('.zoom-inner')?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
    anim.onfinish = () => onClosed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

  return (
    <div ref={ref} className={'zoom ' + className} role="region" aria-label={label} style={tone ? ({ '--tone': tone } as React.CSSProperties) : undefined}>
      <div className="zoom-inner">{children}</div>
    </div>
  );
}
