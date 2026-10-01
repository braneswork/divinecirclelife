import { useState } from 'react';
import { colones, type Offering, type OfferingKind } from '@dc/core';
import { upsertOffering, useStore } from '../store';
import { useToast } from '../toast';

const KINDS: OfferingKind[] = ['producto', 'experiencia', 'servicio'];

export function Catalogo() {
  const offerings = useStore(s => s.offerings);
  const projects = useStore(s => s.projects);
  const toast = useToast();
  const [draft, setDraft] = useState({ code: '', name: '', price: '', kind: 'producto' as OfferingKind, projectId: projects[0]?.id ?? '' });

  const codeTaken = (code: string, id?: string) => offerings.some(o => o.code === code && o.id !== id);

  function edit(o: Offering, patch: Partial<Offering>): boolean {
    if (patch.code !== undefined) {
      patch.code = patch.code.toUpperCase().replace(/[^A-Z0-9Ñ]/g, '');
      if (!patch.code || /^\d/.test(patch.code)) { toast('El código empieza con letra'); return false; }
      if (codeTaken(patch.code, o.id)) { toast(`El código ${patch.code} ya existe`); return false; }
    }
    upsertOffering({ ...o, ...patch });
    return true;
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const code = draft.code.toUpperCase().replace(/[^A-Z0-9Ñ]/g, '');
    if (!code || /^\d/.test(code)) return toast('El código empieza con letra');
    if (codeTaken(code)) return toast(`El código ${code} ya existe`);
    if (!draft.name.trim()) return toast('Falta el nombre');
    upsertOffering({
      id: crypto.randomUUID(), projectId: draft.projectId, kind: draft.kind, code,
      name: draft.name.trim(), price: Number(draft.price) || 0, active: true, public: false,
    });
    setDraft({ ...draft, code: '', name: '', price: '' });
    toast(`Agregado ${code}`);
  }

  return (
    <div className="stack">
      <p className="hint">Los códigos son lo que escribes en Pedidos: <b>2C</b> = 2 Campesino. «Web» decide si aparece en la web pública.</p>
      {projects.map(p => {
        const list = offerings.filter(o => o.projectId === p.id);
        if (!list.length) return null;
        return (
          <section key={p.id} className="card">
            <div className="eyebrow">{p.name}</div>
            <div className="table">
              <div className="trow thead"><span>Código</span><span>Nombre</span><span>Precio</span><span>Tipo</span><span>Activo</span><span>Web</span></div>
              {list.map(o => (
                // la key cambia con los valores para que los campos se reinicien al guardar
                <div key={`${o.id}:${o.code}:${o.name}:${o.price}`} className={'trow' + (o.active ? '' : ' off')}>
                  <input className="code" defaultValue={o.code} onBlur={e => { if (e.target.value.toUpperCase() !== o.code && !edit(o, { code: e.target.value })) e.target.value = o.code; }} aria-label="Código" />
                  <input defaultValue={o.name} onBlur={e => e.target.value.trim() && e.target.value !== o.name && edit(o, { name: e.target.value.trim() })} aria-label="Nombre" />
                  <input className="num" inputMode="numeric" defaultValue={o.price} onBlur={e => Number(e.target.value) !== o.price && edit(o, { price: Number(e.target.value) || 0 })} aria-label="Precio" title={colones(o.price)} />
                  <select value={o.kind} onChange={e => edit(o, { kind: e.target.value as OfferingKind })} aria-label="Tipo">
                    {KINDS.map(k => <option key={k}>{k}</option>)}
                  </select>
                  <input type="checkbox" checked={o.active} onChange={e => edit(o, { active: e.target.checked })} aria-label="Activo" />
                  <input type="checkbox" checked={o.public} onChange={e => edit(o, { public: e.target.checked })} aria-label="Visible en la web" />
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <form className="card add-form" onSubmit={add}>
        <div className="eyebrow">Agregar al catálogo</div>
        <div className="grid-form">
          <input placeholder="Código" className="code" value={draft.code} onChange={e => setDraft({ ...draft, code: e.target.value })} />
          <input placeholder="Nombre" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
          <input placeholder="Precio ₡" inputMode="numeric" value={draft.price} onChange={e => setDraft({ ...draft, price: e.target.value })} />
          <select value={draft.kind} onChange={e => setDraft({ ...draft, kind: e.target.value as OfferingKind })}>
            {KINDS.map(k => <option key={k}>{k}</option>)}
          </select>
          <select value={draft.projectId} onChange={e => setDraft({ ...draft, projectId: e.target.value })}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="btn primary">Agregar</button>
        </div>
      </form>
    </div>
  );
}
