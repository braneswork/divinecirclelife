/* Mar: el parte del spot para programar clases. La curva de marea del día,
   las buenas horas (de día, viento offshore y swell entre 0.5 y 2 m) y cada
   hora con swell, viento, marea, lluvia y temperatura. */

import { useEffect, useState } from 'react';
import { SPOTS, compass, dayLabel, goodWindows, tideAt, tideRising, tideTurns, weatherIcon, weatherWord, windKind, type SeaHour } from '@dc/core';
import { Icon } from '@dc/ui';
import { HelpDot } from '../HelpDot';
import { currentSpot, loadSea, nowCR, setSpot, useSea } from '../sea';

function TideCurve({ hours, now, turns }: { hours: SeaHour[]; now: string; turns: { time: string; kind: string; level: number }[] }) {
  const pts = hours.filter(h => h.tide != null);
  if (pts.length < 2) return null;
  const min = Math.min(...pts.map(h => h.tide!)), max = Math.max(...pts.map(h => h.tide!));
  const x = (t: string) => ((Number(t.slice(11, 13)) + Number(t.slice(14, 16)) / 60) / 24) * 100;
  const y = (v: number) => 34 - ((v - min) / (max - min || 1)) * 26;
  const d = pts.map((h, i) => `${i ? 'L' : 'M'}${x(h.time).toFixed(2)},${y(h.tide!).toFixed(2)}`).join(' ');
  const today = hours[0]?.time.slice(0, 10);
  const showNow = now.slice(0, 10) === today;
  const level = tideAt(hours, now);
  return (
    <svg className="tide-curve" viewBox="0 0 100 44" role="img" aria-label="Curva de marea del día">
      <path d={`${d} L${x(pts[pts.length - 1].time).toFixed(2)},40 L${x(pts[0].time).toFixed(2)},40 Z`} className="tide-fill" />
      <path d={d} className="tide-line" vectorEffect="non-scaling-stroke" />
      {showNow && <line x1={x(now)} x2={x(now)} y1="2" y2="40" className="tide-now" vectorEffect="non-scaling-stroke" />}
      {showNow && level != null && <circle cx={x(now)} cy={y(level)} r="1.8" className="tide-here" />}
      {turns.filter(t => t.time.startsWith(today)).map(t => (
        <g key={t.time}>
          <circle cx={x(t.time)} cy={y(t.level)} r="1.1" className={'tide-dot ' + t.kind} />
          <text x={x(t.time)} y={t.kind === 'alta' ? y(t.level) - 2.2 : y(t.level) + 4.6} textAnchor="middle" className="tide-label">{t.time.slice(11, 16)}</text>
        </g>
      ))}
      {[6, 12, 18].map(hh => <text key={hh} x={(hh / 24) * 100} y="43.5" textAnchor="middle" className="tide-axis">{hh}h</text>)}
    </svg>
  );
}

export function Mar() {
  const { report, error } = useSea();
  const spot = currentSpot();
  const now = nowCR();
  const [day, setDay] = useState(now.slice(0, 10));
  useEffect(() => { void loadSea(); }, []);

  const spotPicker = (
    <div className="row" style={{ justifyContent: 'center' }}>
      {SPOTS.map(s => <button key={s.id} className={'chip' + (s.id === spot.id ? ' on' : '')} onClick={() => setSpot(s.id)}>{s.name}</button>)}
    </div>
  );

  if (!report || report.spot !== spot.id) {
    return <>{spotPicker}<p className="timeline-empty">{error ? `No se pudo traer el parte: ${error}.` : 'Buscando el parte de mar…'}</p><button className="btn-inline" onClick={() => loadSea(true)}>Reintentar</button></>;
  }

  const days = [...new Set(report.hours.map(h => h.time.slice(0, 10)))].filter(d => d >= now.slice(0, 10));
  const hours = report.hours.filter(h => h.time.startsWith(day));
  const turns = tideTurns(report.hours);
  const info = report.days.find(d => d.date === day);
  const windows = goodWindows(report, spot.face).filter(w => w.date >= now.slice(0, 10));
  const rise = info?.sunrise ? Number(info.sunrise.slice(11, 13)) : 5;
  const set = info?.sunset ? Number(info.sunset.slice(11, 13)) : 18;
  const hh = (h: SeaHour) => Number(h.time.slice(11, 13));
  const shown = hours.filter(h => hh(h) >= rise && hh(h) <= set);
  const updated = Math.round((Date.now() - new Date(report.at).getTime()) / 60000);

  return (
    <div className="mar">
      {spotPicker}
      <div className="beads" aria-label="Días">
        {days.map(d => (
          <button key={d} className={'bead wide' + (d === day ? ' on' : '')} onClick={() => setDay(d)} aria-pressed={d === day}>
            <b>{dayLabel(d, now.slice(0, 10)).split(' ')[0]}</b>
            <span>{d.slice(8)}</span>
          </button>
        ))}
      </div>

      <section className="mar-card">
        <header>
          <strong><Icon name="marea" size={18} /> Marea</strong>
          <span>{turns.filter(t => t.time.startsWith(day)).map(t => `${t.kind} ${t.time.slice(11, 16)}`).join(' · ')}</span>
        </header>
        <TideCurve hours={hours} now={now} turns={turns} />
        <p className="mar-meta">
          {info?.sunrise && <>sale el sol {info.sunrise.slice(11, 16)} · se pone {info.sunset?.slice(11, 16)}</>}
          {info?.tmax != null && <> · {Math.round(info.tmin ?? 0)}–{Math.round(info.tmax)}°</>}
          {info?.rain != null && <> · lluvia {info.rain}%</>}
          {info?.uv != null && <> · UV {Math.round(info.uv)}</>}
        </p>
      </section>

      <section className="mar-card">
        <header><strong><Icon name="ola" size={18} /> Buenas horas para clases <HelpDot topic="mar" label="Cómo se eligen las buenas horas" /></strong></header>
        {windows.length ? (
          <ul className="mar-windows">
            {windows.map(w => (
              <li key={w.date + w.from} className={w.date === day ? 'on' : ''}>
                <b>{dayLabel(w.date, now.slice(0, 10))}</b><span>{w.from}–{w.to}</span><small>swell hasta {w.swell.toFixed(1)} m · {w.wind}</small>
              </li>
            ))}
          </ul>
        ) : <p className="muted">Sin ventanas buenas en los próximos días (viento en contra o swell fuera de rango).</p>}
      </section>

      <section className="mar-card">
        <header><strong>Hora por hora</strong><span>{weatherWord(info ? hours[12]?.code ?? null : null)}</span></header>
        <ul className="mar-hours">
          {shown.map(h => {
            const wk = windKind(h.windDir, spot.face);
            const idx = report.hours.indexOf(h);
            const rising = tideRising(report.hours, idx);
            const isNow = h.time.slice(0, 13) === now.slice(0, 13);
            return (
              <li key={h.time} className={isNow ? 'now' : ''}>
                <span className="mh-time">{h.time.slice(11, 16)}</span>
                <span className="mh-swell"><b>{h.swell?.toFixed(1) ?? '–'} m</b><small>{h.period ? Math.round(h.period) + 's' : ''} {compass(h.swellDir)}</small></span>
                <span className={'mh-wind ' + (wk?.good ? 'good' : h.wind != null && h.wind <= 6 ? 'calm' : 'bad')}><b>{h.wind != null ? Math.round(h.wind) : '–'} kn</b><small>{wk?.label ?? ''}</small></span>
                <span className="mh-tide">{rising == null ? '' : rising ? '↑' : '↓'}</span>
                <span className="mh-sky"><Icon name={weatherIcon(h.code, hh(h) < rise || hh(h) > set)} size={18} /><b>{h.temp != null ? Math.round(h.temp) + '°' : ''}</b><small>{h.rain != null ? h.rain + '%' : ''}</small></span>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="mar-meta">
        {spot.name} · Open-Meteo · actualizado hace {updated} min {error ? `· ${error}` : ''}
        {' '}<button className="link" onClick={() => loadSea(true)}>actualizar</button>
      </p>
    </div>
  );
}
