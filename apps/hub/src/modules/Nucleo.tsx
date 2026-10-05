/* Productos y Experiencias: cada oferta con su foto en un panal, ordenadas
   por lo que generaron en el mes (las que más venden, más cerca del centro).
   Tocar una la expande: su ficha con lo que ha generado y su descripción. */

import { useIsAdmin } from '../role';
import { useRef, useState, type CSSProperties } from 'react';
import {
  ALL_PILLARS, CATEGORIES, colones, monthOf, monthRange, offeringStats, pillarOf,
  type Offering, type OfferingKind,
  MESES, priceOn,
} from '@dc/core';
import { Bubble, Icon, Photo, Sheet, Stage, Track, Zoom, around, hexCells, originOf, shrinkImage, useToast, type Origin } from '@dc/ui';
import { today, upsertOffering, useStore } from '../store';
import { monthName, shiftMonth } from './Clientes';

const shortDate = (iso: string) => `${Number(iso.slice(8, 10))} ${MESES[Number(iso.slice(5, 7)) - 1].slice(0, 3)}`;

const cleanCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9Ñ]/g, '');

export const Productos = () => <Nucleo kind="producto" title="Productos" />;
export const Experiencias = () => <Nucleo kind="experiencia" title="Experiencias" />;

function Nucleo({ kind, title }: { kind: OfferingKind; title: string }) {
  const offerings = useStore(s => s.offerings);
  const orders = useStore(s => s.orders);
  const wrap = useRef<HTMLDivElement>(null);
  const [inside, setInside] = useState<{ id: string; from?: Origin; closing?: boolean } | null>(null);
  const [creating, setCreating] = useState(false);
  const admin = useIsAdmin();
  const period = monthOf(today());
  const { from, to } = monthRange(period);
  const stats = offeringStats(orders, from, to);
  const box = () => wrap.current?.closest('.zoom') ?? null;

  const list = offerings
    .filter(o => o.kind === kind)
    .sort((a, b) => Number(b.active) - Number(a.active) || (stats.get(b.id)?.revenue ?? 0) - (stats.get(a.id)?.revenue ?? 0) || a.name.localeCompare(b.name));
  const total = list.reduce((s, o) => s + (stats.get(o.id)?.revenue ?? 0), 0);
  const units = list.reduce((s, o) => s + (stats.get(o.id)?.units ?? 0), 0);
  const cells = hexCells(list.length + 2);

  return (
    <div className="nest" ref={wrap}>
      <Stage>
        <Bubble d={cells[0].d} className="core">
          <span className="eyebrow">{monthName(period)}</span>
          <strong className="mid money">{colones(total)}</strong>
          <span className="small">{units} {kind === 'producto' ? 'unidades' : 'cupos'}</span>
        </Bubble>
        {list.map((o, i) => {
          const st = stats.get(o.id);
          const tone = pillarOf(o.pillar)?.color;
          return (
            <Bubble key={o.id} dataKey={'o-' + o.id} at={cells[i + 1].at} d={cells[i + 1].d}
              className={'photo-bubble offer' + (o.active ? '' : ' off') + (o.public ? ' public' : '')}
              style={{ '--pc': tone } as CSSProperties} onClick={el => setInside({ id: o.id, from: originOf(el, box()) })} label={o.name}>
              <Photo src={o.image} name={o.name} tone={tone} />
              <span className="label">
                <strong>{o.name}</strong>
                <span className="small">{st ? colones(st.revenue) : colones(priceOn(o, today()))}</span>
              </span>
            </Bubble>
          );
        })}
        {admin && <Bubble at={cells[list.length + 1].at} d={cells[list.length + 1].d} className="add" onClick={() => setCreating(true)} label={`Nuevo en ${title}`}><span>+</span></Bubble>}
      </Stage>

      {creating && <OfferingSheet kind={kind} onClose={() => setCreating(false)} />}

      {inside && (
        <Zoom key={inside.id} from={inside.from} closing={inside.closing} onClosed={() => setInside(null)} label={title} tone={pillarOf(offerings.find(o => o.id === inside.id)?.pillar)?.color}>
          <OfferingPage
            id={inside.id}
            onBack={() => setInside(x => x && { ...x, from: originOf(box()?.querySelector(`[data-key="o-${x.id}"]`), box()) ?? x.from, closing: true })}
          />
        </Zoom>
      )}
    </div>
  );
}

function OfferingPage({ id, onBack }: { id: string; onBack: () => void }) {
  const o = useStore(s => s.offerings.find(x => x.id === id))!;
  const orders = useStore(s => s.orders);
  const projects = useStore(s => s.projects);
  const [period, setPeriod] = useState(monthOf(today()));
  const [editing, setEditing] = useState(false);
  const admin = useIsAdmin();
  const { from, to } = monthRange(period);
  const st = offeringStats(orders, from, to).get(id);
  const pillar = pillarOf(o.pillar);

  const facts: { label: string; value: string }[] = [
    priceOn(o, today()) !== o.price
      ? { label: `hasta ${shortDate(o.promoUntil!)}`, value: colones(priceOn(o, today())) }
      : { label: 'precio', value: colones(o.price) },
    { label: 'generó', value: colones(st?.revenue ?? 0) },
    { label: o.kind === 'producto' ? 'unidades' : 'cupos', value: String(st?.units ?? 0) },
    { label: 'pedidos', value: String(st?.orders ?? 0) },
    { label: 'más lo pide', value: st?.topClients[0]?.client.split(' ')[0] ?? '—' },
    { label: pillar ? pillar.sub : 'pilar', value: pillar?.name ?? 'sin pilar' },
  ];

  return (
    <>
      <div className="zoom-head">
        <button className="zoom-back" onClick={onBack} aria-label="Volver"><Icon name="volver" size={18} /></button>
        <div className="month-nav">
          <button onClick={() => setPeriod(shiftMonth(period, -1))} aria-label="Mes anterior">‹</button>
          <span>{monthName(period)}</span>
          <button onClick={() => setPeriod(shiftMonth(period, 1))} aria-label="Mes siguiente">›</button>
        </div>
      </div>

      <Stage>
        <Track r={39} dashed />
        <Bubble d={44} className="photo-bubble hero" style={{ '--tone': pillar?.color } as CSSProperties} onClick={admin ? () => setEditing(true) : undefined} label={admin ? 'Editar ficha' : o.name}>
          <Photo src={o.image} name={o.name} tone={pillar?.color} />
        </Bubble>
        {facts.map((f, i) => (
          <Bubble key={f.label} at={around(i, facts.length, 39, 30)} d={17} className="fact">
            <strong>{f.value}</strong>
            <span className="small">{f.label}</span>
          </Bubble>
        ))}
      </Stage>

      <div className="offering-text">
        <h2>{o.name} <small>{o.code}</small></h2>
        <p className="muted">{[o.unit, o.kind === 'producto' ? o.category : 'experiencia', projects.find(p => p.id === o.projectId)?.name].filter(Boolean).join(' · ')}{o.public ? ' · en la web' : ''}{o.active ? '' : ' · inactivo'}</p>
        <p>{o.description || <span className="muted">Sin descripción todavía.</span>}</p>
        {admin && <button className="btn-inline" onClick={() => setEditing(true)}>Editar ficha</button>}
      </div>

      {editing && <OfferingSheet kind={o.kind} offering={o} onClose={() => setEditing(false)} />}
    </>
  );
}

/** Ficha editable: foto, nombre, código, precio, presentación, familia, pilar, descripción. */
export function OfferingSheet({ kind, offering, onClose }: { kind: OfferingKind; offering?: Offering; onClose: () => void }) {
  const offerings = useStore(s => s.offerings);
  const projects = useStore(s => s.projects);
  const toast = useToast();
  const [d, setD] = useState<Offering>(offering ?? {
    id: crypto.randomUUID(), projectId: projects[0]?.id ?? 'divine-circle', kind, code: '', name: '', price: 0,
    active: true, public: false, pillar: kind === 'producto' ? 'food' : undefined, category: kind === 'producto' ? 'bebidas' : undefined,
    unit: kind === 'producto' ? 'unidad' : 'por persona',
  });
  const file = useRef<HTMLInputElement>(null);

  async function pick(f?: File) {
    if (!f) return;
    try { setD({ ...d, image: await shrinkImage(f) }); } catch { toast('No se pudo leer esa imagen'); }
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const code = cleanCode(d.code);
    if (!d.name.trim()) return toast('Falta el nombre');
    if (!code || /^\d/.test(code)) return toast('El código empieza con letra (es lo que se escribe en ventas rápidas)');
    if (offerings.some(o => o.code === code && o.id !== d.id)) return toast(`El código ${code} ya existe`);
    const promo = d.promoPrice != null && d.promoPrice !== d.price;
    if (promo && !d.promoUntil) return toast('¿Hasta qué día va el precio especial?');
    // sin precio especial: si antes tenía, se guarda null para borrarlo también en la nube
    const gone = (had?: unknown) => (had != null ? (null as never) : undefined);
    upsertOffering({
      ...d, code, name: d.name.trim(), description: d.description?.trim() || undefined,
      promoPrice: promo ? d.promoPrice : gone(offering?.promoPrice), promoUntil: promo ? d.promoUntil : gone(offering?.promoUntil),
    });
    toast(offering ? 'Ficha guardada' : `${d.name.trim()} agregado`);
    onClose();
  }

  const tone = pillarOf(d.pillar)?.color;
  return (
    <Sheet onClose={onClose} label="Ficha" className="offering-sheet">
      <form onSubmit={save} className="ficha">
        <div className="ficha-photo" style={{ '--pt': tone } as CSSProperties}>
          <button type="button" onClick={() => file.current?.click()} aria-label="Elegir foto"><Photo src={d.image} name={d.name || 'Nuevo'} tone={tone} /></button>
          <div className="row">
            <button type="button" className="btn-inline ghost" onClick={() => file.current?.click()}>{d.image ? 'Cambiar foto' : 'Agregar foto'}</button>
            {d.image && <button type="button" className="btn-inline ghost" onClick={() => setD({ ...d, image: undefined })}>Quitar</button>}
          </div>
          <input ref={file} type="file" accept="image/*" hidden onChange={e => pick(e.target.files?.[0])} />
        </div>

        <label className="field wide">Nombre<input value={d.name} onChange={e => setD({ ...d, name: e.target.value })} autoFocus={!offering} /></label>
        <label className="field">Código<input className="code" value={d.code} onChange={e => setD({ ...d, code: cleanCode(e.target.value) })} placeholder="C" /></label>
        <label className="field">Precio ₡<input inputMode="numeric" value={d.price || ''} onChange={e => setD({ ...d, price: Number(e.target.value.replace(/\D/g, '')) || 0 })} /></label>
        <label className="field">Precio especial ₡<input inputMode="numeric" value={d.promoPrice ?? ''} onChange={e => setD({ ...d, promoPrice: e.target.value.replace(/\D/g, '') ? Number(e.target.value.replace(/\D/g, '')) : undefined })} placeholder="opcional" /></label>
        <label className="field">Hasta el<input type="date" value={d.promoUntil ?? ''} onChange={e => setD({ ...d, promoUntil: e.target.value || undefined })} /></label>
        <label className="field">Presentación<input value={d.unit ?? ''} onChange={e => setD({ ...d, unit: e.target.value })} placeholder="unidad, 800 g, 2 horas" /></label>
        {kind === 'producto' && (
          <label className="field">Familia
            <select value={d.category ?? ''} onChange={e => setD({ ...d, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
        )}
        <label className="field">Proyecto
          <select value={d.projectId} onChange={e => setD({ ...d, projectId: e.target.value })}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <div className="field wide">Pilar
          <div className="pillar-pick">
            {ALL_PILLARS.map(p => (
              <button type="button" key={p.id} className={d.pillar === p.id ? 'on' : ''} style={{ '--pc': p.color } as CSSProperties} onClick={() => setD({ ...d, pillar: d.pillar === p.id ? undefined : p.id })}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
        <label className="field wide">Descripción<textarea rows={3} value={d.description ?? ''} onChange={e => setD({ ...d, description: e.target.value })} placeholder="Qué es, ingredientes, qué incluye, duración…" /></label>
        <div className="field wide toggles">
          <label className="check"><input type="checkbox" checked={d.active} onChange={e => setD({ ...d, active: e.target.checked })} /> Activo</label>
          <label className="check"><input type="checkbox" checked={d.public} onChange={e => setD({ ...d, public: e.target.checked })} /> Visible en la web</label>
        </div>
        <div className="field wide row end">
          <button type="button" className="btn-inline ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-inline">Guardar</button>
        </div>
      </form>
    </Sheet>
  );
}
