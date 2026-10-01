import { useCallback, useEffect, useState } from 'react';
import { PageDots, Pager, type PageDef } from '@dc/ui';
import logo from '@dc/brand/assets/logo-light.png';
import { sb } from './supabase';
import { syncNow } from './cloud';
import { MODULES } from './modules';
import { Home } from './modules/Home';

/* Una sola página: inicio + seis módulos, uno al lado del otro. */
const PAGES: PageDef[] = [
  { id: '', label: 'Inicio', render: () => <Home /> },
  ...MODULES.map(m => ({ id: m.id, label: m.label, render: () => <m.view /> })),
];

const indexFromHash = () => Math.max(0, PAGES.findIndex(p => p.id === location.hash.slice(1)));

export function App() {
  const [index, setIndex] = useState(indexFromHash);

  useEffect(() => {
    const onHash = () => setIndex(indexFromHash());
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    void syncNow();
    if (!sb) return;
    const { data } = sb.auth.onAuthStateChange(e => { if (e === 'SIGNED_IN') void syncNow(); });
    return () => data.subscription.unsubscribe();
  }, []);

  const go = useCallback((i: number) => {
    const id = PAGES[i].id;
    if (id) location.hash = id;
    else history.pushState(null, '', location.pathname + location.search);
    setIndex(i);
  }, []);

  return (
    <div className="shell">
      <header className="head">
        <a href="#" className="home-logo" onClick={e => { e.preventDefault(); go(0); }} aria-label="Divine Circle · inicio">
          <img src={logo} alt="Divine Circle" />
        </a>
        <h1 className="page-title">{index === 0 ? 'Hub' : PAGES[index].label}</h1>
      </header>
      <Pager pages={PAGES} index={index} onIndex={go} />
      <PageDots pages={PAGES} index={index} onIndex={go} />
    </div>
  );
}
