import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@dc/brand/tokens.css';
import '@dc/ui/ui.css';
import './kit.css';
import { ESSENCE, MOTTO, PHILOSOPHY, PILLARS, type PayState, type PillarId } from '@dc/core';
import { Bubble, Donut, Focus, PayMark, PillarFlower, Stage, Track, ToastProvider, around, hexCells, spiralCells, useToast } from '@dc/ui';
import logo from '@dc/brand/assets/logo-light.png';
import mark from '@dc/brand/assets/mark.png';

const COLORS = [
  ['plum-900', '#33082F'], ['plum-800', '#3D0C3A'], ['plum-700', '#45103F'], ['plum-600', '#5C1153'],
  ['gold', '#E3A83E'], ['gold-light', '#F4CE7C'], ['magenta', '#B0187E'], ['bone', '#FBF5EA'], ['sand', '#F0E4CF'], ['ink', '#241128'],
];

function Section({ id, title, children, note }: { id: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="kit-section">
      <h2 className="page-title">{title}</h2>
      {note && <p className="hint">{note}</p>}
      {children}
    </section>
  );
}

function Kit() {
  const [pillar, setPillar] = useState<PillarId>('essence');
  const [pay, setPay] = useState<PayState>('pending');
  const [focus, setFocus] = useState(false);
  const toast = useToast();
  const p = [ESSENCE, ...PILLARS].find(x => x.id === pillar)!;

  return (
    <main className="kit">
      <header className="kit-head">
        <img src={logo} alt="Divine Circle" className="kit-logo" />
        <p className="page-title">UI kit</p>
        <nav className="kit-nav">
          {['pilares', 'color', 'tipo', 'orbita', 'panal', 'pago', 'estados', 'foco'].map(s => <a key={s} href={'#' + s}>{s}</a>)}
        </nav>
      </header>

      <Section id="pilares" title="Pilares" note="El círculo de inspiración. Toca un pilar.">
        <div className="kit-stage"><PillarFlower active={pillar} onPick={setPillar} fit={false} /></div>
        <div className="pillar-card" style={{ borderColor: p.color }}>
          <strong style={{ color: p.color }}>{p.name}</strong> <em>{p.sub}</em> · {p.es}
          <p>{p.description}</p>
          <span className="hint">Primera versión: {p.v1.name} · {p.v1.sub}</span>
        </div>
        <p className="philosophy">{PHILOSOPHY}</p>
        <p className="motto">{MOTTO.join(' · ')}</p>
      </Section>

      <Section id="color" title="Color">
        <div className="swatches">
          {COLORS.map(([n, c]) => <div key={n} className="swatch"><i style={{ background: c }} /><b>{n}</b><span>{c}</span></div>)}
          {[ESSENCE, ...PILLARS].map(x => <div key={x.id} className="swatch"><i style={{ background: x.color }} /><b>{x.name}</b><span>{x.color}</span></div>)}
        </div>
      </Section>

      <Section id="tipo" title="Tipografía">
        <div className="type">
          <img src={mark} alt="" width={64} />
          <p className="t-display">Cinzel · solo para la marca</p>
          <p className="t-title">MONTSERRAT · TÍTULOS DE PÁGINA</p>
          <p className="t-body">Montserrat para todo el texto: limpia, legible, cercana.</p>
          <p className="eyebrow">Eyebrow · etiquetas</p>
        </div>
      </Section>

      <Section id="orbita" title="Órbita" note="Stage, Track, Bubble, around() y Donut: algo al centro, cosas alrededor.">
        <div className="kit-stage">
          <Stage fit={false}>
            <Track r={40} dashed />
            <Donut r={21} parts={[{ key: 'a', value: 3, label: '3C' }, { key: 'b', value: 2, label: '2MS' }, { key: 'c', value: 1, label: '1CR' }]} />
            <Bubble d={33} className="core"><span className="eyebrow">centro</span><strong className="big">6</strong><span className="small">Bubble.core</span></Bubble>
            {['uno', 'dos', 'tres', 'cuatro', 'cinco'].map((s, i) => (
              <Bubble key={s} at={around(i, 6, 40)} d={16} onClick={() => toast(`Bubble ${s}`)}><strong>{s}</strong><span className="small">órbita</span></Bubble>
            ))}
            <Bubble at={around(5, 6, 40)} d={16} className="add" onClick={() => toast('Bubble.add')}><span>+</span></Bubble>
          </Stage>
        </div>
      </Section>

      <Section id="panal" title="Panal y espiral" note="Uniforme (hexCells): piezas iguales, cada una toca a seis. Espiral de Doyle (spiralCells): crecen hacia afuera, para lo que tiene peso.">
        <div className="kit-pair">
          <div className="kit-stage small">
            <Stage fit={false}>
              {hexCells(19).map((c, i) => <Bubble key={i} at={c.at} d={c.d} className={i ? '' : 'core'} style={{ '--tone': [ESSENCE, ...PILLARS][i % 7].color } as React.CSSProperties} />)}
            </Stage>
          </div>
          <div className="kit-stage small">
            <Stage fit={false}>
              <Bubble d={26} className="core"><span className="small">centro</span></Bubble>
              {spiralCells(24, { hole: 14 }).map((c, i) => <Bubble key={i} at={c.at} d={c.d} style={{ '--tone': PILLARS[i % 6].color } as React.CSSProperties} />)}
            </Stage>
          </div>
        </div>
      </Section>

      <Section id="pago" title="Marca de pago" note="Del sistema original de Divine. Tocar avanza: ✓ pagado → ✕ no pagó → + crédito a favor.">
        <div className="row">
          <PayMark state="paid" size={40} /><PayMark state="pending" size={40} /><PayMark state="credit" size={40} />
          <span className="sep" />
          <PayMark state={pay} size={56} onChange={setPay} /> <span className="hint">← tócala</span>
        </div>
      </Section>

      <Section id="estados" title="Estados del horno">
        <div className="kit-stage small">
          <Stage fit={false}>
            {(['pendiente', 'horneando', 'listo', 'entregado', 'cancelado'] as const).map((s, i) => (
              <Bubble key={s} at={around(i, 5, 32)} d={24} className={'order ' + s}><span className="small">{s === 'pendiente' ? 'por hornear' : s}</span></Bubble>
            ))}
          </Stage>
        </div>
      </Section>

      <Section id="foco" title="Foco" note="Tocar algo lo trae al centro; sus acciones orbitan alrededor.">
        <button className="btn-inline" onClick={() => setFocus(true)}>Abrir foco</button>
        {focus && (
          <Focus
            onClose={() => setFocus(false)}
            center={<><span className="eyebrow">ejemplo</span><strong className="mid">Soleida</strong><span className="small">2 Campesino · 1 Multiseeds</span><PayMark state={pay} size={34} onChange={setPay} /></>}
            actions={[{ label: 'listo', onClick: () => toast('listo'), tone: 'on' }, { label: 'editar', onClick: () => toast('editar') }, { label: 'borrar', onClick: () => toast('borrar'), tone: 'bad' }]}
          />
        )}
      </Section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><ToastProvider><Kit /></ToastProvider></StrictMode>,
);
