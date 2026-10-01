/* Cómo está el día, en Inicio: mar, viento, marea, clima y sol en círculos. */

import { useEffect } from 'react';
import { compass, hourIndex, tideRising, tideTurns, weatherWord, windKind } from '@dc/core';
import { currentSpot, loadSea, nowCR, useSea } from '../sea';

export function SeaStrip({ onOpen }: { onOpen: (el: Element) => void }) {
  const { report, error } = useSea();
  useEffect(() => { void loadSea(); }, []);
  const spot = currentSpot();

  if (!report || report.spot !== spot.id) {
    return (
      <button className="sea-strip empty" onClick={e => onOpen(e.currentTarget)}>
        <span>{error ? `Mar: ${error}` : 'Buscando el parte de mar…'}</span>
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

  return (
    <button className="sea-strip" onClick={e => onOpen(e.currentTarget)} aria-label={`Parte de mar de ${spot.name}`}>
      <span className="sea-spot">{spot.name}</span>
      <span className="sea-dots">
        <span className="sea-dot swell"><b>{h.swell?.toFixed(1) ?? '–'}</b><small>m · {h.period ? Math.round(h.period) + 's' : ''}</small><em>swell {compass(h.swellDir)}</em></span>
        <span className={'sea-dot wind ' + (wk?.good ? 'good' : 'bad')}><b>{h.wind != null ? Math.round(h.wind) : '–'}</b><small>kn {compass(h.windDir)}</small><em>{wk?.label ?? 'viento'}</em></span>
        <span className="sea-dot tide"><b>{rising == null ? '–' : rising ? '↑' : '↓'}</b><small>{next ? `${next.kind} ${next.time.slice(11, 16)}` : ''}</small><em>marea</em></span>
        <span className="sea-dot sky"><b>{h.temp != null ? Math.round(h.temp) + '°' : '–'}</b><small>{h.rain != null ? `lluvia ${h.rain}%` : ''}</small><em>{weatherWord(h.code)}</em></span>
        <span className="sea-dot sun"><b>{day?.sunset?.slice(11, 16) ?? '–'}</b><small>{day?.sunrise ? `sale ${day.sunrise.slice(11, 16)}` : ''}</small><em>se pone</em></span>
      </span>
    </button>
  );
}
