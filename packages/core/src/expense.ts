/* Salida rápida: "25000 super", "12.500 gas @ayer // tanque", "8000 ingredientes harina".
   - el primer número es el monto
   - la primera palabra que coincide con un tipo (o su comienzo) fija el tipo; si no, "otros"
   - @fecha como en pedidos (más @ayer); lo que queda es la nota */

import { EXPENSE_TYPES } from './types';
import { addDays } from './dates';
import { resolveDay } from './quick';

export type ExpenseResult =
  | { ok: true; amount: number; type: string; date: string; note?: string }
  | { ok: false; error: 'vacio' | 'sin_monto' | 'fecha_invalida'; detail?: string };

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function parseExpense(input: string, today: string, types = EXPENSE_TYPES): ExpenseResult {
  let text = (input ?? '').trim();
  if (!text) return { ok: false, error: 'vacio' };
  let note: string | undefined;
  const slash = text.indexOf('//');
  if (slash >= 0) { note = text.slice(slash + 2).trim() || undefined; text = text.slice(0, slash); }

  let date = today, amount: number | undefined, type: string | undefined;
  const rest: string[] = [];
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if (w.startsWith('@')) {
      const d = w.slice(1).toLowerCase() === 'ayer' ? addDays(today, -1) : resolveDay(w.slice(1), today);
      if (!d) return { ok: false, error: 'fecha_invalida', detail: w };
      date = d;
    } else if (amount === undefined && /^₡?\d[\d.,]*$/.test(w)) {
      amount = Number(w.replace(/[₡.,]/g, ''));
    } else if (!type && w.length >= 3 && types.some(t => norm(t).startsWith(norm(w)))) {
      type = types.find(t => norm(t).startsWith(norm(w)));
    } else rest.push(w);
  }
  if (!amount) return { ok: false, error: 'sin_monto' };
  const extra = rest.join(' ');
  return { ok: true, amount, type: type ?? 'otros', date, note: [extra, note].filter(Boolean).join(' · ') || undefined };
}
