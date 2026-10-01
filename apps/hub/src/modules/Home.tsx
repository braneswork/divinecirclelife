/* El centro: la flor del logo. Hoy en medio, seis módulos alrededor
   (cada uno con su ícono) y los proyectos del círculo en el anillo exterior.
   En las esquinas de abajo: − para anotar una salida, + para una entrada. */

import type { CSSProperties } from 'react';
import { bakeSummary, colones, dayLabel, monthOf, monthRange, offeringStats, summarize } from '@dc/core';
import { Bubble, Icon, Stage, Track, around } from '@dc/ui';
import { today, useStore } from '../store';
import { MODULES, type ModuleId } from './index';
import { SeaStrip } from './SeaStrip';

export function Home({ onEnter }: { onEnter: (id: ModuleId, el: Element) => void }) {
  const s = useStore(x => x);
  const now = today();
  const todays = s.orders.filter(o => o.date === now && o.status !== 'cancelado');
  const pending = todays.filter(o => o.status !== 'entregado').length;
  const items = bakeSummary(todays).reduce((n, b) => n + b.qty, 0);
  const ring = s.projects.filter(p => p.active && p.ring !== 'nucleo');
  const range = monthRange(monthOf(now));
  const month = summarize({ ...s, ...range });
  const stats = offeringStats(s.orders, range.from, range.to);
  const earned = (kind: string) => s.offerings.filter(o => o.kind === kind).reduce((n, o) => n + (stats.get(o.id)?.revenue ?? 0), 0);

  const metric: Record<string, string> = {
    ventas: todays.length ? `${pending} por entregar` : 'sin ventas hoy',
    experiencias: `${colones(earned('experiencia'))} este mes`,
    clientes: month.porCobrar ? `${colones(month.porCobrar)} por cobrar` : `${s.clients.filter(c => c.active).length} clientes`,
    caja: `balance ${colones(month.balance)}`,
    circulo: `${ring.length} proyectos`,
    productos: `${colones(earned('producto'))} este mes`,
  };

  return (
    <>
    <Stage className="home">
      <Track r={47} dashed />
      {ring.map((p, i) => (
        <Bubble key={p.id} at={around(i, ring.length, 47, 30)} d={4.4} className={'sat' + (p.branes ? ' gold' : '')} label={p.name} />
      ))}
      <Bubble d={30} className="core">
        <span className="eyebrow">{dayLabel(now, now)}</span>
        <strong className="big">{todays.length}</strong>
        <span className="small">{todays.length === 1 ? 'venta' : 'ventas'}</span>
        {items > 0 && <span className="small">{items} productos</span>}
      </Bubble>
      {MODULES.map((m, i) => (
        <Bubble key={m.id} dataKey={m.id} at={around(i, 6, 31)} d={30} className="petal" onClick={el => onEnter(m.id, el)} label={m.label} style={{ '--tone': m.tone } as CSSProperties}>
          <Icon name={m.icon} size={22} className="petal-icon" />
          <strong>{m.label}</strong>
          <span className="small">{metric[m.id]}</span>
        </Bubble>
      ))}
      <Bubble dataKey="salida" at={{ x: 9.5, y: 90.5 }} d={15} className="flow out" onClick={el => onEnter('salida', el)} label="Anotar una salida">
        <Icon name="menos" size={26} />
        <span className="small">salida</span>
      </Bubble>
      <Bubble dataKey="entrada" at={{ x: 90.5, y: 90.5 }} d={15} className="flow in" onClick={el => onEnter('entrada', el)} label="Anotar una entrada">
        <Icon name="mas" size={26} />
        <span className="small">entrada</span>
      </Bubble>
    </Stage>
    <SeaStrip onOpen={el => onEnter('mar', el)} />
    </>
  );
}
