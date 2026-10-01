/* Parte de mar del spot elegido: se descarga de Open-Meteo y se guarda en el
   dispositivo; se refresca si tiene más de una hora (y hay señal). */

import { useSyncExternalStore } from 'react';
import { SPOTS, parseSea, seaURLs, type SeaReport, type Spot } from '@dc/core';

const KEY = 'dc-sea';
const SPOT_KEY = 'dc-spot';
const listeners = new Set<() => void>();
let busy = false;

interface Cache { report: SeaReport | null; error: string | null }
let cache: Cache = (() => {
  try { return { report: JSON.parse(localStorage.getItem(KEY) ?? 'null'), error: null }; } catch { return { report: null, error: null }; }
})();

const emit = () => listeners.forEach(l => l());
const set = (c: Cache) => {
  cache = c;
  try { if (c.report) localStorage.setItem(KEY, JSON.stringify(c.report)); } catch { /* sin espacio */ }
  emit();
};

export function currentSpot(): Spot {
  let id = SPOTS[0].id;
  try { id = localStorage.getItem(SPOT_KEY) ?? id; } catch { /* nada */ }
  return SPOTS.find(s => s.id === id) ?? SPOTS[0];
}

export function setSpot(id: string) {
  try { localStorage.setItem(SPOT_KEY, id); } catch { /* nada */ }
  void loadSea(true);
}

/** Hora local de Costa Rica como YYYY-MM-DDTHH:MM. */
export const nowCR = () => new Date().toLocaleString('sv-SE', { timeZone: 'America/Costa_Rica' }).replace(' ', 'T').slice(0, 16);

export async function loadSea(force = false): Promise<void> {
  const spot = currentSpot();
  const r = cache.report;
  const age = r ? (Date.now() - new Date(r.at).getTime()) / 60000 : Infinity;
  if (!force && r && r.spot === spot.id && age < 60) return;
  if (busy || (typeof navigator !== 'undefined' && !navigator.onLine && !force)) return;
  busy = true;
  try {
    const urls = seaURLs(spot);
    const [m, w] = await Promise.allSettled([fetch(urls.marine), fetch(urls.weather)]);
    if (m.status !== 'fulfilled' || !m.value.ok) throw new Error('sin datos del mar');
    const marine = await m.value.json();
    const weather = w.status === 'fulfilled' && w.value.ok ? await w.value.json() : null;
    set({ report: parseSea(spot, marine, weather, new Date().toISOString()), error: null });
  } catch (e) {
    set({ ...cache, error: (e as Error).message || 'sin conexión' });
  } finally {
    busy = false;
  }
}

export function useSea(): Cache {
  return useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => cache);
}
