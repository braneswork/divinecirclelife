/* Navegación de íconos: cada círculo dice a dónde lleva. */

import { Icon } from './icons';

export interface NavItem { id: string; label: string; icon: string }

export function IconNav({ items, active, onPick }: { items: NavItem[]; active: string; onPick: (id: string, el: HTMLElement) => void }) {
  return (
    <nav className="iconnav" aria-label="Secciones">
      {items.map(it => (
        <button
          key={it.id} className={it.id === active ? 'on' : ''} aria-current={it.id === active ? 'page' : undefined}
          onClick={e => onPick(it.id, e.currentTarget.querySelector('.iconnav-dot') as HTMLElement)}
        >
          <span className="iconnav-dot"><Icon name={it.icon} size={19} /></span>
          <span className="iconnav-label">{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
