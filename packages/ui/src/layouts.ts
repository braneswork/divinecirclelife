/* Dos maneras de acomodar círculos que se tocan:
   - panal (uniforme): todos iguales, cada uno toca a seis, como el símbolo.
   - espiral de Doyle: cada círculo toca a seis pero crecen hacia afuera
     (como en "Cada círculo toca a seis. Y sale esta espiral").
   Devuelven posiciones y diámetros en % del Stage. */

import type { Point } from './orbit';

export interface Cell { at: Point; d: number }

/** Panal hexagonal: centro y anillos de 6, 12, 18… celdas. */
export function hexCells(n: number, opts: { skipCenter?: boolean; maxD?: number; fit?: number } = {}): Cell[] {
  const start = opts.skipCenter ? 1 : 0;
  const need = n + start;
  let R = 0;
  while (1 + 3 * R * (R + 1) < need) R++;
  const fit = opts.fit ?? 96;
  const d = 10; // unidad; se escala al final
  // todas las celdas del panal hasta el anillo R, ordenadas por anillo y luego por ángulo (desde arriba, horario)
  const cells: (Point & { ring: number; ang: number })[] = [];
  for (let q = -R; q <= R; q++) {
    for (let r = Math.max(-R, -q - R); r <= Math.min(R, -q + R); r++) {
      const ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
      const x = d * (q + r / 2), y = d * (r * Math.sqrt(3) / 2);
      const ang = (Math.atan2(x, -y) + 2 * Math.PI) % (2 * Math.PI);
      cells.push({ x, y, ring, ang });
    }
  }
  cells.sort((a, b) => a.ring - b.ring || a.ang - b.ang);
  // escalar y centrar lo que realmente se usa (los anillos incompletos ocupan menos)
  const used = cells.slice(start, start + n);
  const xs = used.flatMap(c => [c.x - d / 2, c.x + d / 2]), ys = used.flatMap(c => [c.y - d / 2, c.y + d / 2]);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
  const k = Math.min(fit / w, fit / h, (opts.maxD ?? 30) / d);
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  // el centro del panal se mantiene en el centro si está en uso (núcleo)
  const ox = start === 0 ? 0 : cx, oy = start === 0 ? 0 : cy;
  const kk = start === 0 ? Math.min(k, fit / 2 / Math.max(...xs.map(Math.abs), ...ys.map(Math.abs))) : k;
  return used.map(c => ({ at: { x: 50 + (c.x - ox) * kk, y: 50 + (c.y - oy) * kk }, d: d * kk * 0.94 }));
}

// Soluciones de las ecuaciones de tangencia (p, q brazos): |a|, arg a, radio relativo
const DOYLE: Record<string, [number, number, number]> = {
  '5,8': [2.508615195406194, 0.12814699554631837, 0.4338432181577314],
  '8,13': [1.7427779579504568, 0.07305376519636769, 0.2730844288022173],
  '13,21': [1.4059945998580803, 0.04661057068424766, 0.17029901608906217],
};

interface Circ { x: number; y: number; r: number }

function doyleCircles(p: number, q: number, span = 6): Circ[] {
  const [x, al, rr] = DOYLE[`${p},${q}`];
  const y = Math.pow(x, p / q), be = (p * al - 2 * Math.PI) / q;
  const out: Circ[] = [];
  const seen = new Set<string>();
  for (let m = -q * span; m <= q * span; m++) {
    for (let k = 0; k < q; k++) {
      // a^m b^k cubre todo el patrón porque a^p = b^q
      const mod = Math.pow(x, m) * Math.pow(y, k);
      if (mod < 1e-3 || mod > 1e3) continue;
      const t = m * al + k * be;
      const c = { x: mod * Math.cos(t), y: mod * Math.sin(t), r: rr * mod };
      const key = `${c.x.toFixed(6)},${c.y.toFixed(6)}`;
      if (!seen.has(key)) { seen.add(key); out.push(c); }
    }
  }
  return out.sort((a, b) => a.r - b.r);
}

const cache = new Map<string, Circ[]>();

/** n círculos de una espiral de Doyle, del más chico al más grande, dejando
    libre el centro (hueco de radio `hole` %) para el núcleo. */
export function spiralCells(n: number, opts: { hole?: number; fit?: number; rotate?: number } = {}): Cell[] {
  if (n <= 0) return [];
  const hole = opts.hole ?? 13, fit = opts.fit ?? 48.5;
  const rot = ((opts.rotate ?? 0) * Math.PI) / 180;
  // con pocos círculos, brazos más abiertos (círculos grandes); con muchos, más densos
  for (const arms of ['5,8', '8,13', '13,21']) {
    if (!cache.has(arms)) cache.set(arms, doyleCircles(...(arms.split(',').map(Number) as [number, number])));
    const all = cache.get(arms)!;
    // el patrón es autosimilar: basta escalar para que el círculo más grande toque el borde
    const outer = all[all.length - 1];
    const s = fit / (Math.hypot(outer.x, outer.y) + outer.r);
    const band = all.filter(c => {
      const dist = Math.hypot(c.x, c.y) * s, rad = c.r * s;
      return dist - rad >= hole && dist + rad <= fit + 0.01;
    });
    if (band.length >= n) {
      return band.slice(band.length - n).map(c => {
        const X = c.x * s, Y = c.y * s;
        return {
          at: { x: 50 + X * Math.cos(rot) - Y * Math.sin(rot), y: 50 + X * Math.sin(rot) + Y * Math.cos(rot) },
          d: c.r * s * 2 * 0.96,
        };
      });
    }
  }
  return hexCells(n, { skipCenter: true });
}
