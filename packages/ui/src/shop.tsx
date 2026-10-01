/* La tienda: todo lo que Divine Circle ofrece, con foto, precio y cantidad.
   La misma pieza sirve para el + del hub (anotar una venta) y para la web.
   Quien la usa decide qué pasa al continuar (onCheckout). */

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { colones, pillarOf, type Offering } from '@dc/core';
import { Photo } from './photo';
import { Sheet } from './sheet';

export interface ShopFamily { id: string; label: string; match: (o: Offering) => boolean }

export const DEFAULT_FAMILIES: ShopFamily[] = [
  { id: 'todo', label: 'Todo', match: () => true },
  { id: 'pan', label: 'Pan', match: o => o.kind === 'producto' && o.category === 'pan' },
  { id: 'bebidas', label: 'Bebidas', match: o => o.kind === 'producto' && o.category === 'bebidas' },
  { id: 'café', label: 'Café', match: o => o.kind === 'producto' && o.category === 'café' },
  { id: 'cocina', label: 'Cocina', match: o => o.kind === 'producto' && (o.category === 'cocina' || o.category === 'otros' || !o.category) },
  { id: 'experiencias', label: 'Experiencias', match: o => o.kind === 'experiencia' },
  { id: 'servicios', label: 'Servicios', match: o => o.kind === 'servicio' },
];

export type Cart = Record<string, number>;

export function Stepper({ value, onChange, name }: { value: number; onChange: (n: number) => void; name: string }) {
  return (
    <span className="stepper">
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} disabled={!value} aria-label={`Quitar ${name}`}>−</button>
      <output aria-label={`Cantidad de ${name}`}>{value}</output>
      <button type="button" onClick={() => onChange(Math.min(999, value + 1))} aria-label={`Agregar ${name}`}>+</button>
    </span>
  );
}

export function cartLines(cart: Cart, offerings: Offering[]) {
  return offerings.filter(o => cart[o.id] > 0).map(o => ({ offering: o, qty: cart[o.id] }));
}

export function Shop({ offerings, cart, onCart, onCheckout, families = DEFAULT_FAMILIES, top, checkoutLabel = 'Continuar', filters = true }: {
  offerings: Offering[]; cart: Cart; onCart: (c: Cart) => void; onCheckout: () => void;
  families?: ShopFamily[]; top?: ReactNode; checkoutLabel?: string;
  /** familias y buscador (la web los usa; el + del hub no) */
  filters?: boolean;
}) {
  const [fam, setFam] = useState('todo');
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState<Offering | null>(null);
  const tabs = families.filter(f => f.id === 'todo' || offerings.some(f.match));
  const shown = useMemo(() => {
    const f = families.find(x => x.id === fam) ?? families[0];
    const n = q.trim().toLowerCase();
    return offerings.filter(f.match).filter(o => !n || o.name.toLowerCase().includes(n) || o.code.toLowerCase() === n || o.description?.toLowerCase().includes(n));
  }, [offerings, fam, q, families]);
  const lines = cartLines(cart, offerings);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.qty * l.offering.price, 0);
  const set = (id: string, n: number) => onCart({ ...cart, [id]: n });

  return (
    <div className="shop">
      {top}
      {filters && <div className="shop-bar">
        <nav className="shop-tabs" aria-label="Familias" data-noswipe>
          {tabs.map(f => (
            <button key={f.id} className={f.id === fam ? 'on' : ''} onClick={() => setFam(f.id)} aria-pressed={f.id === fam}>{f.label}</button>
          ))}
        </nav>
        <input className="shop-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar" aria-label="Buscar en la tienda" />
      </div>}

      <ul className="shop-grid">
        {shown.map(o => {
          const tone = pillarOf(o.pillar)?.color;
          return (
            <li key={o.id} className={'shop-item' + (cart[o.id] ? ' in' : '')} style={{ '--pt': tone } as CSSProperties}>
              <button className="shop-photo" onClick={() => setDetail(o)} aria-label={`Ver ${o.name}`}>
                <Photo src={o.image} name={o.name} tone={tone} />
                {cart[o.id] > 0 && <span className="shop-badge">{cart[o.id]}</span>}
              </button>
              <strong>{o.name}</strong>
              <span className="shop-price">{colones(o.price)}{o.unit ? <small> · {o.unit}</small> : null}</span>
              <Stepper value={cart[o.id] ?? 0} onChange={n => set(o.id, n)} name={o.name} />
            </li>
          );
        })}
        {shown.length === 0 && <li className="shop-empty">Nada por aquí todavía.</li>}
      </ul>

      {count > 0 && (
        <div className="shop-cart">
          <span className="shop-cart-dot">{count}</span>
          <span className="shop-cart-text">{lines.map(l => `${l.qty} ${l.offering.name}`).join(' · ')}</span>
          <b>{colones(total)}</b>
          <button className="shop-go" onClick={onCheckout}>{checkoutLabel}</button>
        </div>
      )}

      {detail && (
        <Sheet onClose={() => setDetail(null)} className="product-sheet" label={detail.name}>
          <div className="product-hero" style={{ '--pt': pillarOf(detail.pillar)?.color } as CSSProperties}>
            <Photo src={detail.image} name={detail.name} tone={pillarOf(detail.pillar)?.color} />
          </div>
          {pillarOf(detail.pillar) && <span className="eyebrow" style={{ color: pillarOf(detail.pillar)!.color }}>{pillarOf(detail.pillar)!.name} · {pillarOf(detail.pillar)!.sub}</span>}
          <h2>{detail.name}</h2>
          <p className="product-price">{colones(detail.price)}{detail.unit ? <small> · {detail.unit}</small> : null}</p>
          <p className="product-desc">{detail.description || 'Pronto agregamos la descripción.'}</p>
          <div className="product-actions">
            <Stepper value={cart[detail.id] ?? 0} onChange={n => set(detail.id, n)} name={detail.name} />
            <button className="shop-go" onClick={() => { if (!cart[detail.id]) set(detail.id, 1); setDetail(null); }}>{cart[detail.id] ? 'Listo' : 'Agregar'}</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
