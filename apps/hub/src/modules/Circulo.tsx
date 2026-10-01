/* El círculo: Divine Circle al centro, aliados en el anillo cercano,
   vecinos en el exterior. */

import { useState } from 'react';
import type { Project, Ring } from '@dc/core';
import { Bubble, Focus, Stage, Track, around } from '../orbit/Orbit';
import { upsertProject, useStore } from '../store';
import { useToast } from '../toast';
import mark from '@dc/brand/assets/mark.png';

const RING_LABEL: Record<Ring, string> = { nucleo: 'núcleo', aliado: 'aliado', vecino: 'vecino' };
const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function Circulo() {
  const projects = useStore(s => s.projects);
  const toast = useToast();
  const [draft, setDraft] = useState<Project | null>(null);
  const [isNew, setIsNew] = useState(false);

  const allies = projects.filter(p => p.ring === 'aliado');
  const neighbors = projects.filter(p => p.ring === 'vecino');
  const core = projects.find(p => p.ring === 'nucleo');

  function open(p: Project | null) {
    setIsNew(!p);
    setDraft(p ? { ...p } : { id: '', slug: '', name: '', ring: 'vecino', branes: false, active: true });
  }

  function save() {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) return toast('Falta el nombre');
    if (isNew) {
      const slug = slugify(name);
      if (projects.some(p => p.slug === slug)) return toast('Ya existe un proyecto con ese nombre');
      upsertProject({ ...draft, id: slug, slug, name, tagline: draft.tagline?.trim() || undefined });
      toast(`${name} entra al círculo`);
    } else {
      upsertProject({ ...draft, name, tagline: draft.tagline?.trim() || undefined });
    }
    setDraft(null);
  }

  const node = (p: Project, at: { x: number; y: number }, d: number) => (
    <Bubble key={p.id} at={at} d={d} className={'project' + (p.branes ? ' branes' : '') + (p.active ? '' : ' off')} onClick={() => open(p)} label={p.name}>
      <strong>{p.name.split(' ').slice(0, 2).join(' ')}</strong>
    </Bubble>
  );

  return (
    <div className="module">
      <Stage>
        <Track r={27} />
        <Track r={43} dashed />
        <Bubble d={24} className="core mark" onClick={core ? () => open(core) : undefined} label="Divine Circle">
          <img src={mark} alt="" />
        </Bubble>
        {allies.map((p, i) => node(p, around(i, allies.length, 27, 60), 15))}
        {neighbors.map((p, i) => node(p, around(i, neighbors.length + 1, 43, 15), 12))}
        <Bubble at={around(neighbors.length, neighbors.length + 1, 43, 15)} d={12} className="add" onClick={() => open(null)} label="Sumar un proyecto"><span>+</span></Bubble>
      </Stage>
      <p className="portal-hint">
        Anillo cercano: aliados · anillo exterior: vecinos · <span className="legend gold" /> ecosistema Branes <span className="legend" /> independiente
      </p>

      {draft && (
        <Focus
          onClose={() => setDraft(null)}
          center={
            <form className="circle-form" onSubmit={e => { e.preventDefault(); save(); }}>
              <span className="eyebrow">{isNew ? 'Nuevo proyecto' : RING_LABEL[draft.ring]}</span>
              <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Nombre" aria-label="Nombre" autoFocus={isNew} />
              <input value={draft.tagline ?? ''} onChange={e => setDraft({ ...draft, tagline: e.target.value })} placeholder="Qué hace" aria-label="Qué hace" />
              <button hidden />
            </form>
          }
          actions={[
            { label: 'guardar', onClick: save, tone: 'on' },
            ...(draft.ring === 'nucleo' ? [] : [{ label: RING_LABEL[draft.ring], onClick: () => setDraft({ ...draft, ring: draft.ring === 'aliado' ? 'vecino' : 'aliado' }), title: 'Cambiar anillo' }]),
            { label: draft.branes ? 'Branes' : 'independiente', onClick: () => setDraft({ ...draft, branes: !draft.branes }), tone: draft.branes ? 'ok' : 'muted' },
            { label: draft.active ? 'activo' : 'inactivo', onClick: () => setDraft({ ...draft, active: !draft.active }), tone: draft.active ? 'ok' : 'muted' },
          ]}
        />
      )}
    </div>
  );
}
