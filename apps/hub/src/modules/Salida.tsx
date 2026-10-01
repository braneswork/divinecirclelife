/* − Salida: el monto al centro y los tipos de gasto como un panal alrededor
   (de la hoja "Fixed Cost"). También se puede escribir rápido: "25000 super". */

import { useState } from 'react';
import { EXPENSE_TYPES, addDays, colones, dayLabel, fromISODate, parseExpense } from '@dc/core';
import { Bubble, Stage, hexCells, useToast } from '@dc/ui';
import { now as nowIso, removeExpense, today, upsertExpense } from '../store';
import { useNav } from '../nav';
import { HelpDot } from '../HelpDot';

const CELLS = hexCells(EXPENSE_TYPES.length + 1);

export function Salida() {
  const toast = useToast();
  const nav = useNav();
  const now = today();
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('super');
  const [date, setDate] = useState(now);
  const [note, setNote] = useState('');
  const value = Number(amount.replace(/\D/g, '')) || 0;

  function save(e?: React.FormEvent) {
    e?.preventDefault();
    // permite escribir todo junto en el monto: "25000 super // harina"
    const quick = /\D/.test(amount.trim()) ? parseExpense(amount, now) : null;
    const exp = quick?.ok
      ? { amount: quick.amount, type: quick.type, date: quick.date, note: quick.note ?? (note.trim() || undefined) }
      : { amount: value, type, date, note: note.trim() || undefined };
    if (!exp.amount) return toast('Escribe el monto');
    const row = { id: crypto.randomUUID(), createdAt: nowIso(), ...exp };
    upsertExpense(row);
    setAmount(''); setNote('');
    toast(`Salida ${colones(row.amount)} · ${row.type} · ${dayLabel(row.date, now)}`, { label: 'Deshacer', run: () => removeExpense(row.id) });
  }

  return (
    <form className="salida" onSubmit={save}>
      <Stage>
        <Bubble at={CELLS[0].at} d={CELLS[0].d} className="core">
          <span className="eyebrow">salida</span>
          <input className="amount" value={amount} onChange={e => setAmount(e.target.value)} inputMode="text" placeholder="₡0" aria-label="Monto" autoFocus />
          <span className="small">{value ? colones(value) : 'monto'}</span>
        </Bubble>
        {EXPENSE_TYPES.map((t, i) => (
          <Bubble key={t} at={CELLS[i + 1].at} d={CELLS[i + 1].d} className={'type' + (t === type ? ' on' : '')} onClick={() => setType(t)} label={t}>
            <span>{t}</span>
          </Bubble>
        ))}
      </Stage>
      <div className="beads">
        {Array.from({ length: 7 }, (_, i) => addDays(now, -6 + i)).map(d => (
          <button type="button" key={d} className={'bead' + (d === date ? ' on' : '')} onClick={() => setDate(d)} aria-pressed={d === date}>
            <span>{d === now ? 'hoy' : 'dlmmjvs'[fromISODate(d).getDay()]}</span><b>{fromISODate(d).getDate()}</b>
          </button>
        ))}
      </div>
      <div className="portal">
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Nota (opcional)" aria-label="Nota" />
        <HelpDot topic="salida" label="Cómo anotar una salida" />
        <button className="go out" aria-label="Anotar salida">−</button>
      </div>
      <button type="button" className="btn-inline ghost" onClick={() => nav.enter('caja')}>Ver caja</button>
    </form>
  );
}
