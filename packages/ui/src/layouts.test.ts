import { describe, expect, it } from 'vitest';
import { hexCells, spiralCells } from './layouts';

const overlap = (cells: { at: { x: number; y: number }; d: number }[]) => {
  for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
    const a = cells[i], b = cells[j];
    if (Math.hypot(a.at.x - b.at.x, a.at.y - b.at.y) < (a.d + b.d) / 2 - 0.05) return true;
  }
  return false;
};
const inside = (cells: { at: { x: number; y: number }; d: number }[]) =>
  cells.every(c => c.at.x - c.d / 2 >= -0.1 && c.at.x + c.d / 2 <= 100.1 && c.at.y - c.d / 2 >= -0.1 && c.at.y + c.d / 2 <= 100.1);

describe('panal', () => {
  it('centro y anillos de seis sin superponerse', () => {
    for (const n of [1, 7, 12, 19, 30]) {
      const c = hexCells(n);
      expect(c).toHaveLength(n);
      expect(overlap(c)).toBe(false);
      expect(inside(c)).toBe(true);
    }
    expect(hexCells(6, { skipCenter: true })[0].at).not.toEqual({ x: 50, y: 50 });
  });
});

describe('espiral de Doyle', () => {
  it('n círculos que no se pisan, crecen hacia afuera y dejan el centro libre', () => {
    for (const n of [1, 3, 6, 10, 14, 20, 30, 45]) {
      const c = spiralCells(n, { hole: 13 });
      expect(c).toHaveLength(n);
      expect(overlap(c)).toBe(false);
      expect(inside(c)).toBe(true);
      expect(c.every(x => Math.hypot(x.at.x - 50, x.at.y - 50) - x.d / 2 >= 12.5)).toBe(true);
      expect(c[c.length - 1].d).toBeGreaterThanOrEqual(c[0].d);
    }
  });
});
