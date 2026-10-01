/* Módulos que vienen: se muestran con lo que van a contener orbitando. */

import { Bubble, Stage, Track, around } from '@dc/ui';

function Soon({ title, line, seeds }: { title: string; line: string; seeds: string[] }) {
  return (
    <>
      <Stage>
        <Track r={39} dashed />
        <Bubble d={36} className="core">
          <span className="eyebrow">Próximamente</span>
          <strong className="mid">{title}</strong>
          <span className="small">{line}</span>
        </Bubble>
        {seeds.map((s, i) => (
          <Bubble key={s} at={around(i, seeds.length, 39, 20)} d={18} className="ghost"><span>{s}</span></Bubble>
        ))}
      </Stage>
    </>
  );
}

export const Experiencias = () => (
  <Soon title="Experiencias" line="reservas desde la web" seeds={['Surf · Take Off', 'Talleres', 'Cursos', 'Wellness', 'Encuentros']} />
);

export const Cafe = () => (
  <Soon title="Café" line="un lugar para quedarse" seeds={['Coworking · Branes', 'Barra', 'Eventos', 'Comunidad']} />
);
