/* Catálogo: cada proyecto al centro con sus ofertas orbitando. */

import { useState } from 'react';
import { ALL_PILLARS, CATEGORIES, colones, pillarOf, type Offering, type OfferingKind, type PillarId } from '@dc/core';
import type { CSSProperties } from 'react';
import { Bubble, Focus, Stage, hexCells } from '@dc/ui';
import { upsertOffering, useStore } from '../store';
import { useToast } from '@dc/ui';

const KINDS: OfferingKind[] = ['producto', 'experiencia', 'servicio'];
/** sin pilar → esencia → sabiduría → … → alimento → sin pilar */
const nextPillar = (id?: PillarId): PillarId | undefined => {
  const i = ALL_PILLARS.findIndex(p => p.id === id);
  return i === ALL_PILLARS.length - 1 ? undefined : ALL_PILLARS[i + 1].id;
};
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
  // panal uniforme: el proyecto al centro, sus códigos alrededor y el "+" al final
  const cells = hexCells(list.length + 2);

  function open(o: Offering | null) {
    setIsNew(!o);
    setDraft(o ? { ...o } : { id: crypto.randomUUID(), projectId, kind: 'producto', code: '', name: '', price: 0, active: true, public: false, category: 'bebidas' });
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
    <>
      <nav className="beads" aria-label="Proyectos">
        {projects.map(p => (
          <button key={p.id} className={'bead wide' + (p.id === projectId ? ' on' : '')} onClick={() => setProjectId(p.id)} aria-pressed={p.id === projectId}>
            <b>{p.name.split(' ')[0]}</b>
            <span>{offerings.filter(o => o.projectId === p.id).length}</span>
          </button>
        ))}
      </nav>

      <Stage>
        <Bubble d={cells[0].d} className="core">
          <span className="eyebrow">{project?.ring}</span>
          <strong className="mid">{project?.name}</strong>
        </Bubble>
        {list.map((o, i) => (
          <Bubble key={o.id} at={cells[i + 1].at} d={cells[i + 1].d} className={'offer' + (o.active ? '' : ' off') + (o.public ? ' public' : '')} onClick={() => open(o)} label={o.name} style={{ '--pc': pillarOf(o.pillar)?.color } as CSSProperties}>
            <strong className="code">{o.code}</strong>
            <span className="small">{colones(o.price)}</span>
          </Bubble>
        ))}
        <Bubble at={cells[list.length + 1].at} d={cells[list.length + 1].d} className="add" onClick={() => open(null)} label="Agregar al catálogo"><span>+</span></Bubble>
      </Stage>
      <p className="hint">{list.filter(o => o.active).length} activos · {list.filter(o => o.public).length} en la web. El código es lo que escribes en Pedidos: <b>2C</b> = 2 Campesino. El color del borde es su pilar; el halo dorado, que sale en la web.</p>

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
            { label: pillarOf(draft.pillar)?.name ?? 'sin pilar', onClick: () => setDraft({ ...draft, pillar: nextPillar(draft.pillar) }), title: 'Cambiar pilar' },
            ...(draft.kind === 'producto' ? [{ label: draft.category ?? 'sin familia', onClick: () => setDraft({ ...draft, category: CATEGORIES[(CATEGORIES.indexOf(draft.category ?? '') + 1) % CATEGORIES.length] }), title: 'Cambiar familia' }] : []),
            { label: draft.kind, onClick: () => setDraft({ ...draft, kind: KINDS[(KINDS.indexOf(draft.kind) + 1) % KINDS.length] }), title: 'Cambiar tipo' },
            { label: draft.active ? 'activo' : 'inactivo', onClick: () => setDraft({ ...draft, active: !draft.active }), tone: draft.active ? 'ok' : 'muted' },
            { label: draft.public ? 'en la web' : 'oculto', onClick: () => setDraft({ ...draft, public: !draft.public }), tone: draft.public ? 'ok' : 'muted' },
          ]}
        />
      )}
    </>
  );
}
