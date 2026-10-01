/* Catálogo: cada proyecto al centro con sus ofertas orbitando. */

import { useState } from 'react';
import { colones, type Offering, type OfferingKind } from '@dc/core';
import { Bubble, Focus, Stage, Track, around } from '../orbit/Orbit';
import { upsertOffering, useStore } from '../store';
import { useToast } from '../toast';

const KINDS: OfferingKind[] = ['producto', 'experiencia', 'servicio'];
const cleanCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9Ñ]/g, '');

export function Catalogo() {
  const offerings = useStore(s => s.offerings);
  const projects = useStore(s => s.projects);
  const toast = useToast();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [draft, setDraft] = useState<Offering | null>(null);
  const [isNew, setIsNew] = useState(false);

  const project = projects.find(p => p.id === projectId);
  const list = offerings.filter(o => o.projectId === projectId);
  const n = list.length + 1;
  const d = n > 12 ? 12 : 15;

  function open(o: Offering | null) {
    setIsNew(!o);
    setDraft(o ? { ...o } : { id: crypto.randomUUID(), projectId, kind: 'producto', code: '', name: '', price: 0, active: true, public: false });
  }

  function save() {
    if (!draft) return;
    const code = cleanCode(draft.code);
    if (!code || /^\d/.test(code)) return toast('El código empieza con letra');
    if (offerings.some(o => o.code === code && o.id !== draft.id)) return toast(`El código ${code} ya existe`);
    if (!draft.name.trim()) return toast('Falta el nombre');
    upsertOffering({ ...draft, code, name: draft.name.trim() });
    toast(isNew ? `Agregado ${code}` : `Guardado ${code}`);
    setDraft(null);
  }

  return (
    <div className="module">
      <nav className="beads" aria-label="Proyectos">
        {projects.map(p => (
          <button key={p.id} className={'bead wide' + (p.id === projectId ? ' on' : '')} onClick={() => setProjectId(p.id)} aria-pressed={p.id === projectId}>
            <b>{p.name.split(' ')[0]}</b>
            <span>{offerings.filter(o => o.projectId === p.id).length}</span>
          </button>
        ))}
      </nav>

      <Stage>
        <Track r={40} dashed />
        <Bubble d={34} className="core">
          <span className="eyebrow">{project?.ring}</span>
          <strong className="mid">{project?.name}</strong>
          <span className="small">{list.filter(o => o.active).length} activos · {list.filter(o => o.public).length} en la web</span>
        </Bubble>
        {list.map((o, i) => (
          <Bubble key={o.id} at={around(i, n, 40)} d={d} className={'offer' + (o.active ? '' : ' off') + (o.public ? ' public' : '')} onClick={() => open(o)} label={o.name}>
            <strong className="code">{o.code}</strong>
            <span className="small">{colones(o.price)}</span>
          </Bubble>
        ))}
        <Bubble at={around(list.length, n, 40)} d={d} className="add" onClick={() => open(null)} label="Agregar al catálogo"><span>+</span></Bubble>
      </Stage>
      <p className="portal-hint">El código es lo que escribes en Pan: <b>2C</b> = 2 Campesino. Borde dorado = visible en la web.</p>

      {draft && (
        <Focus
          onClose={() => setDraft(null)}
          center={
            <form className="circle-form" onSubmit={e => { e.preventDefault(); save(); }}>
              <span className="eyebrow">{isNew ? 'Nuevo' : draft.kind}</span>
              <input className="code" value={draft.code} onChange={e => setDraft({ ...draft, code: cleanCode(e.target.value) })} placeholder="COD" aria-label="Código" autoFocus={isNew} />
              <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Nombre" aria-label="Nombre" />
              <input inputMode="numeric" value={draft.price || ''} onChange={e => setDraft({ ...draft, price: Number(e.target.value.replace(/\D/g, '')) || 0 })} placeholder="Precio ₡" aria-label="Precio" />
              <button hidden />
            </form>
          }
          actions={[
            { label: 'guardar', onClick: save, tone: 'on' },
            { label: draft.kind, onClick: () => setDraft({ ...draft, kind: KINDS[(KINDS.indexOf(draft.kind) + 1) % KINDS.length] }), title: 'Cambiar tipo' },
            { label: draft.active ? 'activo' : 'inactivo', onClick: () => setDraft({ ...draft, active: !draft.active }), tone: draft.active ? 'ok' : 'muted' },
            { label: draft.public ? 'en la web' : 'oculto', onClick: () => setDraft({ ...draft, public: !draft.public }), tone: draft.public ? 'ok' : 'muted' },
          ]}
        />
      )}
    </div>
  );
}
