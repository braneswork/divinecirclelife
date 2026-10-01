/* El mar y el día: oleaje, swell, viento, marea, clima y sol desde Open-Meteo
   (gratis, sin llave, se puede llamar desde el navegador). Mismos spots y
   lógica que usaba el hub anterior. */

export interface Spot { id: string; name: string; lat: number; lng: number; /** hacia dónde mira la playa (grados) */ face: number }

export const SPOTS: Spot[] = [
  { id: 'santa-teresa', name: 'Santa Teresa', lat: 9.644, lng: -85.167, face: 250 },
  { id: 'playa-hermosa', name: 'Playa Hermosa', lat: 9.670, lng: -85.175, face: 252 },
  { id: 'playa-carmen', name: 'Playa Carmen', lat: 9.618, lng: -85.156, face: 248 },
  { id: 'manzanillo', name: 'Manzanillo', lat: 9.750, lng: -85.200, face: 255 },
];

const MARINE = ['sea_level_height_msl', 'wave_height', 'wave_period', 'wave_direction', 'swell_wave_height', 'swell_wave_period', 'swell_wave_direction', 'sea_surface_temperature'];
const WEATHER = ['temperature_2m', 'precipitation_probability', 'weather_code', 'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m', 'uv_index', 'cloud_cover'];
const DAILY = ['sunrise', 'sunset', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_probability_max', 'uv_index_max'];

export function seaURLs(spot: Spot, days = 4) {
  const base = { latitude: String(spot.lat), longitude: String(spot.lng), timezone: 'America/Costa_Rica', forecast_days: String(days) };
  return {
    marine: 'https://marine-api.open-meteo.com/v1/marine?' + new URLSearchParams({ ...base, hourly: MARINE.join(',') }),
    weather: 'https://api.open-meteo.com/v1/forecast?' + new URLSearchParams({ ...base, hourly: WEATHER.join(','), daily: DAILY.join(','), wind_speed_unit: 'kn' }),
  };
}

export interface SeaHour {
  time: string; // YYYY-MM-DDTHH:00 (hora de Costa Rica)
  tide: number | null; wave: number | null; swell: number | null; period: number | null; swellDir: number | null;
  water: number | null; temp: number | null; rain: number | null; code: number | null;
  wind: number | null; windDir: number | null; gust: number | null; uv: number | null;
}
export interface SeaDay { date: string; sunrise: string | null; sunset: string | null; tmax: number | null; tmin: number | null; rain: number | null; uv: number | null }
export interface SeaReport { spot: string; at: string; hours: SeaHour[]; days: SeaDay[] }

type Json = { hourly?: Record<string, (number | string | null)[]>; daily?: Record<string, (number | string | null)[]> };
const num = (a: unknown[] | undefined, i: number) => { const v = a?.[i]; return typeof v === 'number' ? v : null; };

/** Junta la respuesta de mar y la de clima en un parte por hora y por día. */
export function parseSea(spot: Spot, marine: Json, weather: Json | null, at: string): SeaReport {
  const m = marine.hourly ?? {}, w = weather?.hourly ?? {}, d = weather?.daily ?? {};
  const times = (m.time ?? w.time ?? []) as string[];
  const wIndex = new Map(((w.time ?? []) as string[]).map((t, i) => [t, i]));
  const hours: SeaHour[] = times.map((time, i) => {
    const j = wIndex.get(time) ?? -1;
    return {
      time, tide: num(m.sea_level_height_msl, i), wave: num(m.wave_height, i), swell: num(m.swell_wave_height, i),
      period: num(m.swell_wave_period, i), swellDir: num(m.swell_wave_direction, i), water: num(m.sea_surface_temperature, i),
      temp: num(w.temperature_2m, j), rain: num(w.precipitation_probability, j), code: num(w.weather_code, j),
      wind: num(w.wind_speed_10m, j), windDir: num(w.wind_direction_10m, j), gust: num(w.wind_gusts_10m, j), uv: num(w.uv_index, j),
    };
  });
  const days: SeaDay[] = ((d.time ?? []) as string[]).map((date, i) => ({
    date, sunrise: (d.sunrise?.[i] as string) ?? null, sunset: (d.sunset?.[i] as string) ?? null,
    tmax: num(d.temperature_2m_max, i), tmin: num(d.temperature_2m_min, i), rain: num(d.precipitation_probability_max, i), uv: num(d.uv_index_max, i),
  }));
  return { spot: spot.id, at, hours, days };
}

/** Viento respecto a la playa: offshore (de tierra al mar) es lo bueno. */
export function windKind(from: number | null, face: number) {
  if (from == null) return null;
  const off = (face + 180) % 360;
  const d = Math.abs(((from - off + 540) % 360) - 180);
  if (d <= 45) return { k: 'off', label: 'offshore', good: true };
  if (d <= 85) return { k: 'xoff', label: 'cross-offshore', good: true };
  if (d <= 115) return { k: 'cross', label: 'cruzado', good: false };
  if (d <= 145) return { k: 'xon', label: 'cross-onshore', good: false };
  return { k: 'on', label: 'onshore', good: false };
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
export const compass = (deg: number | null) => (deg == null ? '' : COMPASS[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16]);

/** Código WMO a palabras. */
export function weatherWord(code: number | null): string {
  if (code == null) return '';
  if (code === 0) return 'despejado';
  if (code <= 2) return 'parcial';
  if (code === 3) return 'nublado';
  if (code <= 48) return 'neblina';
  if (code <= 57) return 'llovizna';
  if (code <= 67) return 'lluvia';
  if (code <= 77) return 'nieve';
  if (code <= 82) return 'aguaceros';
  return 'tormenta';
}

/** Índice de la hora actual (o la más cercana anterior). */
export function hourIndex(hours: SeaHour[], nowLocal: string): number {
  const key = nowLocal.slice(0, 13);
  let idx = -1;
  hours.forEach((h, i) => { if (h.time.slice(0, 13) <= key) idx = i; });
  return Math.max(0, idx);
}

export interface TideTurn { time: string; kind: 'alta' | 'baja'; level: number }

/** Mareas altas y bajas: picos y valles de la curva, afinados con una parábola entre horas. */
export function tideTurns(hours: SeaHour[]): TideTurn[] {
  const out: TideTurn[] = [];
  for (let i = 1; i < hours.length - 1; i++) {
    const a = hours[i - 1].tide, b = hours[i].tide, c = hours[i + 1].tide;
    if (a == null || b == null || c == null) continue;
    const high = b >= a && b > c, low = b <= a && b < c;
    if (!high && !low) continue;
    const den = a - 2 * b + c;
    const off = den ? Math.max(-0.5, Math.min(0.5, (a - c) / (2 * den))) : 0;
    const level = b - ((a - c) * off) / 4;
    const t = new Date(hours[i].time + ':00Z').getTime() + off * 3600e3;
    const iso = new Date(t).toISOString().slice(0, 16);
    out.push({ time: iso, kind: high ? 'alta' : 'baja', level: Math.round(level * 100) / 100 });
  }
  return out;
}

/** ¿Está subiendo la marea a esta hora? */
export const tideRising = (hours: SeaHour[], i: number) => {
  const a = hours[i]?.tide, b = hours[i + 1]?.tide;
  return a != null && b != null ? b > a : null;
};

export interface Window { date: string; from: string; to: string; swell: number; wind: string }

/** Buenas horas para clases: de día, viento offshore o cross-offshore (o flojo) y swell entre 0.5 y 2 m. */
export function goodWindows(r: SeaReport, face: number): Window[] {
  const out: Window[] = [];
  let cur: Window | null = null;
  for (const h of r.hours) {
    const date = h.time.slice(0, 10), hour = Number(h.time.slice(11, 13));
    const day = r.days.find(d => d.date === date);
    const rise = day?.sunrise ? Number(day.sunrise.slice(11, 13)) : 6, set = day?.sunset ? Number(day.sunset.slice(11, 13)) : 17;
    const wk = windKind(h.windDir, face);
    const ok = hour >= rise && hour < set && h.swell != null && h.swell >= 0.5 && h.swell <= 2
      && (h.wind == null || h.wind <= 6 || (wk?.good ?? false));
    if (ok && cur && cur.date === date) { cur.to = h.time.slice(11, 16); cur.swell = Math.max(cur.swell, h.swell!); }
    else if (ok) { cur = { date, from: h.time.slice(11, 16), to: h.time.slice(11, 16), swell: h.swell!, wind: wk?.label ?? 'flojo' }; out.push(cur); }
    else cur = null;
  }
  // "to" es la última hora buena: la ventana termina una hora después
  return out.map(w => ({ ...w, to: `${String(Number(w.to.slice(0, 2)) + 1).padStart(2, '0')}:00` }));
}

/** Ícono del clima según el código WMO; de noche, despejado es luna. */
export function weatherIcon(code: number | null, night = false): string {
  if (code == null || code <= 1) return night ? 'luna' : 'sol';
  if (code === 2) return night ? 'nube' : 'parcial';
  if (code <= 48) return 'nube';
  if (code >= 95) return 'tormenta';
  return 'lluvia';
}

/** Nivel de marea interpolado en un minuto dado (YYYY-MM-DDTHH:MM). */
export function tideAt(hours: SeaHour[], at: string): number | null {
  const pts = hours.filter(h => h.tide != null);
  const t = Date.parse(at + 'Z');
  for (let i = 1; i < pts.length; i++) {
    const a = Date.parse(pts[i - 1].time + 'Z'), b = Date.parse(pts[i].time + 'Z');
    if (t >= a && t <= b) return pts[i - 1].tide! + (pts[i].tide! - pts[i - 1].tide!) * ((t - a) / (b - a || 1));
  }
  return null;
}
