import { describe, expect, it } from 'vitest';
import { SPOTS, compass, goodWindows, hourIndex, parseSea, tideAt, tideRising, tideTurns, weatherIcon, weatherWord, windKind, type SeaHour } from './sea';

const spot = SPOTS[0];
// un día sintético: marea seno con período ~12.4 h, swell 1.2 m, viento del E (offshore) hasta las 11, luego del O (onshore)
const times = Array.from({ length: 24 }, (_, h) => `2026-10-01T${String(h).padStart(2, '0')}:00`);
const marine = { hourly: {
  time: times, sea_level_height_msl: times.map((_, h) => Math.round(1.2 * Math.sin((2 * Math.PI * (h - 3)) / 12.42) * 1000) / 1000),
  swell_wave_height: times.map(() => 1.2), swell_wave_period: times.map(() => 14), swell_wave_direction: times.map(() => 210),
  wave_height: times.map(() => 1.4), sea_surface_temperature: times.map(() => 28.5),
} };
const weather = {
  hourly: { time: times, temperature_2m: times.map(() => 29), precipitation_probability: times.map((_, h) => (h > 14 ? 60 : 10)), weather_code: times.map(() => 2),
    wind_speed_10m: times.map(() => 9), wind_direction_10m: times.map((_, h) => (h < 11 ? 80 : 260)), wind_gusts_10m: times.map(() => 14), uv_index: times.map(() => 8) },
  daily: { time: ['2026-10-01'], sunrise: ['2026-10-01T05:32'], sunset: ['2026-10-01T17:41'], temperature_2m_max: [31], temperature_2m_min: [24], precipitation_probability_max: [60], uv_index_max: [11] },
};

describe('el mar', () => {
  const r = parseSea(spot, marine, weather, 'x');

  it('junta mar y clima por hora', () => {
    expect(r.hours).toHaveLength(24);
    expect(r.hours[9]).toMatchObject({ swell: 1.2, period: 14, temp: 29, wind: 9, windDir: 80, water: 28.5 });
    expect(r.days[0]).toMatchObject({ sunrise: '2026-10-01T05:32', tmax: 31 });
  });

  it('viento respecto a la playa (mira al OSO)', () => {
    expect(windKind(70, 250)?.k).toBe('off');
    expect(windKind(250, 250)?.k).toBe('on');
    expect(windKind(160, 250)?.k).toBe('cross');
    expect(compass(250)).toBe('OSO');
    expect(weatherWord(0)).toBe('despejado');
    expect(weatherWord(63)).toBe('lluvia');
  });

  it('mareas altas y bajas', () => {
    const t = tideTurns(r.hours);
    expect(t.map(x => x.kind)).toEqual(['alta', 'baja', 'alta']); // 3 cambios en 24 h (período 12.42 h)
    expect(t[0].time.slice(11, 13)).toBe('06'); // pico ~06:06
    expect(t[0].level).toBeGreaterThan(1.1);
    expect(tideRising(r.hours, hourIndex(r.hours, '2026-10-01T04:20'))).toBe(true);
    expect(tideRising(r.hours, hourIndex(r.hours, '2026-10-01T08:00'))).toBe(false);
  });

  it('buenas horas para clases: de día y con offshore', () => {
    expect(goodWindows(r, spot.face)).toEqual([{ date: '2026-10-01', from: '05:00', to: '11:00', swell: 1.2, wind: 'offshore' }]);
  });
});

describe('tideAt y weatherIcon', () => {
  const hs = [{ time: '2026-10-01T10:00', tide: 0 }, { time: '2026-10-01T11:00', tide: 1 }] as SeaHour[];
  it('interpola la marea entre horas', () => {
    expect(tideAt(hs, '2026-10-01T10:30')).toBeCloseTo(0.5);
    expect(tideAt(hs, '2026-10-01T12:00')).toBeNull();
  });
  it('elige el ícono del clima', () => {
    expect(weatherIcon(0)).toBe('sol');
    expect(weatherIcon(0, true)).toBe('luna');
    expect(weatherIcon(63)).toBe('lluvia');
    expect(weatherIcon(95)).toBe('tormenta');
  });
});
