import { useEffect, useState } from 'react';
import { sb } from './supabase';
import { syncNow } from './cloud';
import { MODULES, type ModuleId } from './modules';
import { Home } from './modules/Home';
import mark from '@dc/brand/assets/mark.png';

type Route = 'home' | ModuleId;

const fromHash = (): Route => {
  const h = location.hash.slice(1);
  return (MODULES.find(m => m.id === h)?.id ?? 'home') as Route;
};

export function App() {
  const [route, setRoute] = useState<Route>(fromHash);

  useEffect(() => {
    const onHash = () => { setRoute(fromHash()); scrollTo(0, 0); };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    void syncNow();
    if (!sb) return;
    const { data } = sb.auth.onAuthStateChange(e => { if (e === 'SIGNED_IN') void syncNow(); });
    return () => data.subscription.unsubscribe();
  }, []);

  const mod = MODULES.find(m => m.id === route);

  return (
    <div className="shell">
      <header className="head">
        <a href="#" className="home-mark" aria-label="Volver al centro">
          <img src={mark} alt="" />
        </a>
        <div className="head-title">
          <span className="eyebrow">Divine Circle</span>
          <h1 className="title">{mod ? mod.label : 'Hub'}</h1>
        </div>
      </header>
      <main className="wrap">{mod ? <mod.view /> : <Home />}</main>
    </div>
  );
}
