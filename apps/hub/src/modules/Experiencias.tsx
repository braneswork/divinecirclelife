/* Experiencias: las de la hoja (surf con Take Off, baking, arte, música…)
   orbitando, cada una con el color de su pilar. Las reservas vienen después. */

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { colones, pillarOf } from '@dc/core';
import { Bubble, Focus, Stage, hexCells } from '@dc/ui';
import { useStore } from '../store';

export function Experiencias() {
  const offerings = useStore(s => s.offerings);
  const projects = useStore(s => s.projects);
  const [focus, setFocus] = useState<string | null>(null);
  const list = offerings.filter(o => o.kind === 'experiencia' && o.active);
  const f = list.find(o => o.id === focus);
  const cells = hexCells(list.length + 1);

  return (
    <>
      <Stage>
        <Bubble d={cells[0].d} className="core">
          <span className="eyebrow">pronto</span>
          <strong className="big">{list.length}</strong>
          <span className="small">experiencias</span>
        </Bubble>
        {list.map((o, i) => (
          <Bubble key={o.id} at={cells[i + 1].at} d={cells[i + 1].d} className="exp" style={{ '--pc': pillarOf(o.pillar)?.color } as CSSProperties} onClick={() => setFocus(o.id)} label={o.name}>
            <strong>{o.name}</strong>
            <span className="small">{colones(o.price)}</span>
          </Bubble>
        ))}
      </Stage>
      <p className="hint">El color es su pilar. Se editan en Catálogo; las reservas desde la web llegan en la próxima etapa.</p>
      {f && (
        <Focus
          onClose={() => setFocus(null)}
          center={
            <>
              <span className="eyebrow" style={{ color: pillarOf(f.pillar)?.color }}>{pillarOf(f.pillar)?.name ?? 'sin pilar'} · {pillarOf(f.pillar)?.sub}</span>
              <strong className="mid">{f.name}</strong>
              <strong className="price">{colones(f.price)}</strong>
              <span className="small">{projects.find(p => p.id === f.projectId)?.name} · código {f.code}</span>
            </>
          }
          actions={[]}
        />
      )}
    </>
  );
}
