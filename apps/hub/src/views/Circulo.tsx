import { useState } from 'react';
import type { Project, Ring } from '@dc/core';
import { upsertProject, useStore } from '../store';
import { useToast } from '../toast';

const RINGS: { id: Ring; label: string; hint: string }[] = [
  { id: 'nucleo', label: 'Núcleo', hint: 'Lo que Divine Circle hace' },
  { id: 'aliado', label: 'Aliados', hint: 'Socios que operan dentro del círculo' },
  { id: 'vecino', label: 'Vecinos', hint: 'Emprendimientos aledaños que promovemos' },
];

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Tres anillos concéntricos con un punto por proyecto. */
function RingMap({ projects }: { projects: Project[] }) {
  const radius: Record<Ring, number> = { nucleo: 0, aliado: 58, vecino: 100 };
  return (
    <svg viewBox="-125 -125 250 250" className="ringmap" role="img" aria-label="Mapa del círculo">
      <circle r="100" className="ring" />
      <circle r="58" className="ring" />
      <circle r="22" className="core" />
      {RINGS.flatMap(({ id }) => {
        const list = projects.filter(p => p.ring === id && p.active);
        return list.map((p, i) => {
          const r = radius[id];
          const a = (i / Math.max(list.length, 1)) * Math.PI * 2 - Math.PI / 2 + (id === 'vecino' ? 0.4 : 0);
          const x = r * Math.cos(a), y = r * Math.sin(a);
          return (
            <g key={p.id} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
              {id !== 'nucleo' && <circle r="6" className={'dot' + (p.branes ? ' branes' : '')} />}
              <text y={id === 'nucleo' ? 4 : 17} textAnchor="middle">{p.name.split(' ').slice(0, 2).join(' ')}</text>
            </g>
          );
        });
      })}
    </svg>
  );
}

export function Circulo() {
  const projects = useStore(s => s.projects);
  const toast = useToast();
  const [draft, setDraft] = useState({ name: '', ring: 'vecino' as Ring, branes: false, tagline: '' });

  function add(e: React.FormEvent) {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name) return toast('Falta el nombre');
    const slug = slugify(name);
    if (projects.some(p => p.slug === slug)) return toast('Ya existe un proyecto con ese nombre');
    upsertProject({ id: slug, slug, name, ring: draft.ring, branes: draft.branes, tagline: draft.tagline.trim() || undefined, active: true });
    setDraft({ name: '', ring: 'vecino', branes: false, tagline: '' });
    toast(`${name} entra al círculo`);
  }

  return (
    <div className="stack">
      <section className="card center">
        <RingMap projects={projects} />
        <p className="hint"><span className="dot-legend branes" /> ecosistema Branes <span className="dot-legend" /> independiente</p>
      </section>

      {RINGS.map(r => (
        <section key={r.id} className="card">
          <div className="eyebrow">{r.label} · <span className="muted">{r.hint}</span></div>
          <ul className="plist">
            {projects.filter(p => p.ring === r.id).map(p => (
              <li key={p.id} className={p.active ? '' : 'off'}>
                <div>
                  <strong>{p.name}</strong>
                  {p.tagline && <div className="muted small">{p.tagline}</div>}
                </div>
                <div className="row">
                  <label className="check"><input type="checkbox" checked={p.branes} onChange={e => upsertProject({ ...p, branes: e.target.checked })} /> Branes</label>
                  <label className="check"><input type="checkbox" checked={p.active} onChange={e => upsertProject({ ...p, active: e.target.checked })} /> Activo</label>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <form className="card add-form" onSubmit={add}>
        <div className="eyebrow">Sumar un proyecto</div>
        <div className="grid-form">
          <input placeholder="Nombre" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
          <input placeholder="Qué hace (una línea)" value={draft.tagline} onChange={e => setDraft({ ...draft, tagline: e.target.value })} />
          <select value={draft.ring} onChange={e => setDraft({ ...draft, ring: e.target.value as Ring })}>
            {RINGS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <label className="check"><input type="checkbox" checked={draft.branes} onChange={e => setDraft({ ...draft, branes: e.target.checked })} /> Ecosistema Branes</label>
          <button className="btn primary">Sumar</button>
        </div>
      </form>
    </div>
  );
}
