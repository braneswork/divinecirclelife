import { useEffect, useState } from 'react';
import { sb } from './supabase';
import { syncNow } from './cloud';
import { Pedidos } from './views/Pedidos';
import { Catalogo } from './views/Catalogo';
import { Circulo } from './views/Circulo';
import { Ajustes } from './views/Ajustes';
import logoLight from '@dc/brand/assets/logo-light.png';

const TABS = [
  { id: 'pedidos', label: 'Pedidos', view: Pedidos },
  { id: 'catalogo', label: 'Catálogo', view: Catalogo },
  { id: 'circulo', label: 'Círculo', view: Circulo },
  { id: 'ajustes', label: 'Ajustes', view: Ajustes },
] as const;
type TabId = (typeof TABS)[number]['id'];

const fromHash = (): TabId => {
  const h = location.hash.slice(1);
  return (TABS.find(t => t.id === h)?.id ?? 'pedidos') as TabId;
};

export function App() {
  const [tab, setTab] = useState<TabId>(fromHash);

  useEffect(() => {
    const onHash = () => setTab(fromHash());
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    void syncNow();
    if (!sb) return;
    const { data } = sb.auth.onAuthStateChange(e => { if (e === 'SIGNED_IN') void syncNow(); });
    return () => data.subscription.unsubscribe();
  }, []);

  const View = TABS.find(t => t.id === tab)!.view;

  return (
    <div className="shell">
      <header className="topbar">
        <img src={logoLight} alt="Divine Circle" className="logo" />
        <span className="eyebrow">Hub</span>
      </header>
      <nav className="tabs" aria-label="Secciones">
        {TABS.map(t => (
          <a key={t.id} href={'#' + t.id} className={t.id === tab ? 'on' : ''} aria-current={t.id === tab ? 'page' : undefined}>
            {t.label}
          </a>
        ))}
      </nav>
      <main className="wrap">
        <View />
      </main>
    </div>
  );
}
