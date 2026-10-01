/* El centro: la flor del logo. Hoy en medio, seis módulos alrededor
   (cada uno con su ícono) y los proyectos del círculo en el anillo exterior. */

import type { CSSProperties } from 'react';
import { bakeSummary, dayLabel, monthOf, monthRange, summarize, colones } from '@dc/core';
import { Bubble, Icon, Stage, Track, around } from '@dc/ui';
import { today, useStore } from '../store';
import { MODULES, type ModuleId } from './index';

export function Home({ onEnter }: { onEnter: (id: ModuleId, el: Element) => void }) {
  const s = useStore(x => x);
  const now = today();
  const todays = s.orders.filter(o => o.date === now && o.status !== 'cancelado');
  const pending = todays.filter(o => o.status !== 'entregado').length;
  const items = bakeSummary(todays).reduce((n, b) => n + b.qty, 0);
  const upcoming = s.orders.filter(o => o.date > now && o.status !== 'cancelado').length;
  const ring = s.projects.filter(p => p.active && p.ring !== 'nucleo');
  const month = summarize({ ...s, ...monthRange(monthOf(now)) });

  const metric: Record<string, string> = {
    pedidos: todays.length ? `${pending} por entregar` : upcoming ? `${upcoming} próximos` : 'sin pedidos hoy',
    clientes: month.porCobrar ? `${colones(month.porCobrar)} por cobrar` : `${s.clients.filter(c => c.active).length} clientes`,
    caja: `balance ${colones(month.balance)}`,
    experiencias: `${s.offerings.filter(o => o.kind === 'experiencia' && o.active).length} · reservas pronto`,
    circulo: `${ring.length} proyectos`,
    catalogo: `${s.offerings.filter(o => o.active).length} códigos`,
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
        {items > 0 && <span className="small">{items} productos</span>}
      </Bubble>
      {MODULES.map((m, i) => (
        <Bubble key={m.id} dataKey={m.id} at={around(i, 6, 31)} d={30} className="petal" onClick={el => onEnter(m.id, el)} label={m.label} style={{ '--tone': m.tone } as CSSProperties}>
          <Icon name={m.icon} size={22} className="petal-icon" />
          <strong>{m.label}</strong>
          <span className="small">{metric[m.id]}</span>
        </Bubble>
      ))}
    </Stage>
  );
}
