/* El hub: la flor de inicio siempre debajo; tocar un círculo lo expande
   hasta llenar la pantalla y uno entra en él. Volver lo contrae a su lugar. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon, IconNav, Zoom, originOf, type Origin } from '@dc/ui';
import logo from '@dc/brand/assets/logo-light.png';
import { syncNow } from './cloud';
import { ensureRecurring } from './store';
import { EXTRA, MODULES, type ModuleId } from './modules';
import { NavContext } from './nav';
import { Help } from './Help';
import { Home } from './modules/Home';

type Open = { id: ModuleId; from?: Origin; closing?: boolean } | null;
const ALL = [...MODULES, ...EXTRA];
const fromHash = () => ALL.find(m => m.id === location.hash.slice(1))?.id;

export function App() {
  const main = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<Open>(() => { const id = fromHash(); return id ? { id } : null; });
  const [help, setHelp] = useState<string | null>(null);

  const petal = (id: string) => main.current?.querySelector(`[data-key="${id}"]`) ?? null;

  const enter = useCallback((id: ModuleId, el?: Element | null) => {
    setOpen({ id, from: originOf(el ?? petal(id), main.current) });
    if (location.hash.slice(1) !== id) history.pushState(null, '', '#' + id);
  }, []);

  const leave = useCallback(() => {
    setOpen(o => (o && !o.closing ? { ...o, from: originOf(petal(o.id), main.current) ?? o.from, closing: true } : o));
    if (location.hash) history.pushState(null, '', location.pathname + location.search);
  }, []);

  // atrás / adelante del navegador
  useEffect(() => {
    const onPop = () => { const id = fromHash(); if (id) enter(id); else leave(); };
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, [enter, leave]);

  // Escape vuelve al centro (si no hay un foco abierto, que se cierra primero)
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.panel-overlay, .zoom .zoom, .sheet-overlay')) leave(); };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [leave]);

  useEffect(() => {
    // la puerta (auth/Gate) ya garantizó sesión y equipo: traer y subir lo último
    ensureRecurring();
    void syncNow();
  }, []);

  const current = open && !open.closing ? ALL.find(m => m.id === open.id) : undefined;
  const View = open ? ALL.find(m => m.id === open.id)!.view : null;

  const nav = { enter, leave, help: (topic?: string) => setHelp(topic ?? current?.id ?? 'inicio') };

  return (
    <NavContext.Provider value={nav}>
    <div className="shell">
      <header className="head">
        <button className="home-logo" onClick={leave} aria-label="Divine Circle · volver al centro">
          <img src={logo} alt="Divine Circle" />
        </button>
        <h1 className="page-title">{current ? current.label : 'Hub'}</h1>
        <button className="head-btn head-help" onClick={() => nav.help()} aria-label="Ayuda">
          <Icon name="ayuda" size={20} />
        </button>
        <button className={'head-btn head-gear' + (current?.id === 'ajustes' ? ' on' : '')} onClick={e => enter('ajustes', e.currentTarget)} aria-label="Ajustes">
          <Icon name="ajustes" size={20} />
        </button>
      </header>

      <main className="main" ref={main}>
        <div className={'home-layer' + (current ? ' behind' : '')} inert={!!current}>
          <Home onEnter={enter} />
        </div>
        {open && View && (
          <Zoom key={open.id} from={open.from} closing={open.closing} onClosed={() => setOpen(null)} label={ALL.find(m => m.id === open.id)!.label} tone={ALL.find(m => m.id === open.id)!.tone}>
            <View />
          </Zoom>
        )}
      </main>

      <IconNav
        items={[{ id: 'inicio', label: 'Inicio', icon: 'inicio' }, ...MODULES.map(m => ({ id: m.id, label: m.short ?? m.label, icon: m.icon }))]}
        active={current?.id ?? (open ? '' : 'inicio')}
        onPick={(id, el) => (id === 'inicio' ? leave() : enter(id as ModuleId, el))}
      />
      {help && <Help topic={help} onClose={() => setHelp(null)} />}
    </div>
    </NavContext.Provider>
  );
}
