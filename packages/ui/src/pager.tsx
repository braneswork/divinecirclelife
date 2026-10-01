/* Paginador de una sola página: cada sección ocupa toda la pantalla y
   cambiar de sección desliza hacia un lado. Se puede deslizar con el dedo
   (salvo sobre campos de texto o zonas marcadas con data-noswipe). */

import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface PageDef { id: string; label: string; render: () => ReactNode }

export function Pager({ pages, index, onIndex }: { pages: PageDef[]; index: number; onIndex: (i: number) => void }) {
  const [drag, setDrag] = useState(0);
  const start = useRef<{ x: number; y: number; t: number; locked?: 'x' | 'y' } | null>(null);
  const view = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [role=dialog]')) return;
      if (e.key === 'ArrowRight' && index < pages.length - 1) onIndex(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [index, pages.length, onIndex]);

  function down(e: React.PointerEvent) {
    if (e.pointerType === 'mouse') return;
    if ((e.target as HTMLElement).closest('input, textarea, select, [data-noswipe]')) return;
    start.current = { x: e.clientX, y: e.clientY, t: performance.now() };
  }
  function move(e: React.PointerEvent) {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (!s.locked && Math.hypot(dx, dy) > 8) s.locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (s.locked !== 'x') return;
    // resistencia en los extremos
    const edge = (index === 0 && dx > 0) || (index === pages.length - 1 && dx < 0);
    setDrag(edge ? dx / 3 : dx);
  }
  function up() {
    const s = start.current;
    start.current = null;
    if (!s || s.locked !== 'x') return setDrag(0);
    const w = view.current?.clientWidth || innerWidth;
    const fast = Math.abs(drag) / (performance.now() - s.t) > 0.5;
    if ((drag < -w * 0.18 || (fast && drag < -30)) && index < pages.length - 1) onIndex(index + 1);
    else if ((drag > w * 0.18 || (fast && drag > 30)) && index > 0) onIndex(index - 1);
    setDrag(0);
  }

  return (
    <div className="pager" ref={view} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <div className={'pager-track' + (drag ? ' dragging' : '')} style={{ transform: `translateX(calc(${-index * 100}% + ${drag}px))` }}>
        {pages.map((p, i) => (
          <section key={p.id} className="page" aria-label={p.label} aria-hidden={i !== index} inert={i !== index}>
            {p.render()}
          </section>
        ))}
      </div>
    </div>
  );
}

/** Cuentas para saltar entre páginas. */
export function PageDots({ pages, index, onIndex }: { pages: PageDef[]; index: number; onIndex: (i: number) => void }) {
  return (
    <nav className="dots" aria-label="Páginas" data-noswipe>
      {pages.map((p, i) => (
        <button key={p.id} className={i === index ? 'on' : ''} onClick={() => onIndex(i)} aria-label={p.label} aria-current={i === index ? 'page' : undefined}>
          <span>{p.label}</span>
        </button>
      ))}
    </nav>
  );
}
