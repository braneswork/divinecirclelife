/* El centro: la flor del logo. Hoy en medio, seis módulos alrededor
   y, en el anillo exterior, los proyectos del círculo. */

import { bakeSummary, dayLabel } from '@dc/core';
import { Bubble, Stage, Track, around } from '../orbit/Orbit';
import { today, useStore } from '../store';
import { MODULES } from './index';

export function Home() {
  const orders = useStore(s => s.orders);
  const offerings = useStore(s => s.offerings);
  const projects = useStore(s => s.projects);
  const now = today();
  const todays = orders.filter(o => o.date === now && o.status !== 'cancelado');
  const pending = todays.filter(o => o.status !== 'entregado').length;
  const loaves = bakeSummary(todays).reduce((s, b) => s + b.qty, 0);
  const upcoming = orders.filter(o => o.date > now && o.status !== 'cancelado').length;
  const ring = projects.filter(p => p.active && p.ring !== 'nucleo');

  const metric: Record<string, string> = {
    pan: todays.length ? `${pending} por entregar` : upcoming ? `${upcoming} próximos` : 'sin pedidos',
    experiencias: 'pronto',
    cafe: 'pronto',
    circulo: `${ring.length} proyectos`,
    catalogo: `${offerings.filter(o => o.active).length} códigos`,
    ajustes: 'tema · nube',
  };

  return (
    <Stage className="home">
      <Track r={47} dashed />
      {ring.map((p, i) => (
        <Bubble key={p.id} at={around(i, ring.length, 47, 30)} d={4.4} className={'sat' + (p.branes ? ' gold' : '')} label={p.name} />
      ))}
      <Bubble d={30} className="core">
        <span className="eyebrow">{dayLabel(now, now)}</span>
        <strong className="big">{todays.length}</strong>
        <span className="small">{todays.length === 1 ? 'pedido' : 'pedidos'}</span>
        {loaves > 0 && <span className="small">{loaves} panes</span>}
      </Bubble>
      {MODULES.map((m, i) => (
        <Bubble key={m.id} at={around(i, 6, 31)} d={30} className={'petal' + (m.soon ? ' soon' : '')} onClick={() => (location.hash = m.id)}>
          <strong>{m.label}</strong>
          <span className="small">{metric[m.id]}</span>
        </Bubble>
      ))}
    </Stage>
  );
}
