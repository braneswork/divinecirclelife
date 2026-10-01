/* Cómo está el día, en Inicio, en una línea: la curvita de marea con el punto
   de ahora, la próxima alta o baja, swell, viento y clima. Tocarla abre Mar. */

import { useEffect } from 'react';
import { hourIndex, tideAt, tideRising, tideTurns, weatherIcon, weatherWord, windKind, type SeaHour } from '@dc/core';
import { Icon } from '@dc/ui';
import { currentSpot, loadSea, nowCR, useSea } from '../sea';

const minutes = (t: string) => Number(t.slice(11, 13)) * 60 + Number(t.slice(14, 16));

function TideMini({ hours, now }: { hours: SeaHour[]; now: string }) {
  const today = now.slice(0, 10);
  const pts = hours.filter(h => h.tide != null && h.time.startsWith(today));
  if (pts.length < 2) return null;
  const min = Math.min(...pts.map(h => h.tide!)), max = Math.max(...pts.map(h => h.tide!));
  const x = (t: string) => (minutes(t) / 1440) * 100;
  const y = (v: number) => 90 - ((v - min) / (max - min || 1)) * 75;
  const d = pts.map((h, i) => `${i ? 'L' : 'M'}${x(h.time).toFixed(2)},${y(h.tide!).toFixed(2)}`).join(' ');
  const level = tideAt(hours, now);
  return (
    <div className="sea-tide">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d={`${d} L${x(pts[pts.length - 1].time).toFixed(2)},100 L${x(pts[0].time).toFixed(2)},100 Z`} className="tide-fill" />
        <path d={d} className="tide-line" vectorEffect="non-scaling-stroke" />
        <line x1={x(now)} x2={x(now)} y1="0" y2="100" className="tide-now" vectorEffect="non-scaling-stroke" />
      </svg>
      {level != null && <span className="sea-now" style={{ left: x(now) + '%', top: y(level) + '%' }} />}
    </div>
  );
}

export function SeaStrip({ onOpen }: { onOpen: (el: Element) => void }) {
  const { report, error } = useSea();
  useEffect(() => { void loadSea(); }, []);
  const spot = currentSpot();

  if (!report || report.spot !== spot.id) {
    return (
      <button className="sea-card empty" onClick={e => onOpen(e.currentTarget)}>
        <Icon name="ola" size={20} /><span>{error ? `Mar: ${error}` : 'Buscando el parte de mar…'}</span>
      </button>
    );
  }

  const now = nowCR();
  const i = hourIndex(report.hours, now);
  const h = report.hours[i];
  const wk = windKind(h.windDir, spot.face);
  const rising = tideRising(report.hours, i);
  const next = tideTurns(report.hours).find(t => t.time > now);
  const day = report.days.find(d => d.date === now.slice(0, 10));
  const night = !!day?.sunrise && !!day.sunset && (now < day.sunrise || now > day.sunset);

  return (
    <button className="sea-card" onClick={e => onOpen(e.currentTarget)} aria-label={`Parte de mar de ${spot.name}: abrir`}>
      <TideMini hours={report.hours} now={now} />
      <span className="sea-item tide">{rising == null ? '' : rising ? '↑' : '↓'} {next ? <><b>{next.time.slice(11, 16)}</b><small>{next.kind}</small></> : null}</span>
      <span className="sea-item swell"><Icon name="ola" size={18} /><b>{h.swell?.toFixed(1) ?? '–'}m</b></span>
      <span className={'sea-item wind ' + (wk?.good ? 'good' : h.wind != null && h.wind <= 6 ? 'calm' : 'bad')} title={wk?.label}><Icon name="viento" size={18} /><b>{h.wind != null ? Math.round(h.wind) : '–'}kn</b></span>
      <span className="sea-item sky" title={weatherWord(h.code)}><Icon name={weatherIcon(h.code, night)} size={18} /><b>{h.temp != null ? Math.round(h.temp) + '°' : '–'}</b></span>
    </button>
  );
}
