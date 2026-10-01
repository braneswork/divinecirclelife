/* La flor de los pilares: Esencia al centro y seis pilares alrededor. */

import type { CSSProperties } from 'react';
import { ESSENCE, PILLARS, type Pillar, type PillarId } from '@dc/core';
import { Bubble, Stage, around } from './orbit';

function Petal({ p, at, d, on, onPick }: { p: Pillar; at?: { x: number; y: number }; d: number; on?: boolean; onPick?: (id: PillarId) => void }) {
  return (
    <Bubble at={at} d={d} className={'pillar' + (on ? ' on' : '')} style={{ '--pc': p.color } as CSSProperties} onClick={onPick && (() => onPick(p.id))} label={p.name}>
      <strong>{p.name}</strong>
      <em>{p.sub}</em>
    </Bubble>
  );
}

export function PillarFlower({ active, onPick, fit }: { active?: PillarId; onPick?: (id: PillarId) => void; fit?: boolean }) {
  return (
    <Stage className="flower" fit={fit}>
      <div className="flower-glow" />
      <Petal p={ESSENCE} d={31} on={active === 'essence'} onPick={onPick} />
      {PILLARS.map((p, i) => <Petal key={p.id} p={p} at={around(i, 6, 32)} d={31} on={active === p.id} onPick={onPick} />)}
    </Stage>
  );
}

/** Puntito con el color del pilar. */
export function PillarDot({ id }: { id?: PillarId }) {
  const p = [ESSENCE, ...PILLARS].find(x => x.id === id);
  return p ? <i className="pillar-dot" style={{ background: p.color }} title={p.name} /> : null;
}
