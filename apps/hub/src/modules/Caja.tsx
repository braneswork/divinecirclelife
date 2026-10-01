/* Caja: la plata de todo junto (productos, experiencias, servicios) en el mes.
   Balance al centro, ventas por familia como anillo y alrededor cada cuenta:
   ventas, ✓ cobrado, ✕ por cobrar, + crédito, salidas y facturas abiertas. */

import { useMemo, useState } from 'react';
import { useNav } from '../nav';
import { colones, monthOf, monthRange, summarize } from '@dc/core';
import { Bubble, Focus, Icon, PayMark, Stage, hexCells, useToast } from '@dc/ui';
import { removeExpense, today, upsertExpense, useStore } from '../store';
import { monthName, shiftMonth } from './Clientes';

/** la flor: balance al centro, seis cuentas que lo tocan */
const HEX = hexCells(7);

type Key = 'ventas' | 'cobrado' | 'porCobrar' | 'credito' | 'salidas' | 'facturas';

export function Caja() {
  const s = useStore(x => x);
  const toast = useToast();
  const [period, setPeriod] = useState(monthOf(today()));
  const [focus, setFocus] = useState<Key | null>(null);
  const nav = useNav();
  const range = monthRange(period);
  const m = useMemo(() => summarize({ ...s, ...range }), [s, range.from, range.to]);
  const monthExpenses = s.expenses.filter(e => e.date >= range.from && e.date <= range.to).sort((a, b) => b.date.localeCompare(a.date));
  const openInvoices = s.invoices.filter(i => i.status === 'abierta');

  const nodes: { key: Key; label: string; value: number; tone: string; mark?: 'paid' | 'pending' | 'credit' }[] = [
    { key: 'ventas', label: 'ventas', value: m.ventas, tone: 'gold' },
    { key: 'cobrado', label: 'cobrado', value: m.cobrado, tone: 'ok', mark: 'paid' },
    { key: 'porCobrar', label: 'no pagó', value: m.porCobrar, tone: 'bad', mark: 'pending' },
    { key: 'credito', label: 'crédito', value: m.credito, tone: 'accent', mark: 'credit' },
    { key: 'salidas', label: 'salidas', value: m.salidas, tone: 'bad' },
    { key: 'facturas', label: 'facturas abiertas', value: m.facturasAbiertas, tone: 'gold' },
  ];

  const list = (rows: { k: string; v: number }[], empty: string) =>
    rows.length ? <ul className="mini-list">{rows.slice(0, 6).map(r => <li key={r.k}><span>{r.k}</span><b>{colones(r.v)}</b></li>)}</ul> : <span className="small">{empty}</span>;

  return (
    <>
      <div className="month-nav">
        <button onClick={() => setPeriod(shiftMonth(period, -1))} aria-label="Mes anterior">‹</button>
        <span>{monthName(period)}</span>
        <button onClick={() => setPeriod(shiftMonth(period, 1))} aria-label="Mes siguiente">›</button>
      </div>

      <Stage>
        <Bubble d={HEX[0].d} className="core">
          <span className="eyebrow">balance</span>
          <strong className={'mid money' + (m.balance < 0 ? ' warn' : '')}>{colones(m.balance)}</strong>
          <span className="small">cobrado − salidas</span>
          <span className="small">{m.pedidos} pedidos</span>
        </Bubble>
        {nodes.map((n, i) => (
          <Bubble key={n.key} at={HEX[i + 1].at} d={HEX[i + 1].d} className={'money-node ' + n.tone} onClick={() => setFocus(n.key)} label={n.label}>
            {n.mark ? <PayMark state={n.mark} size={16} /> : <Icon name={n.key === 'salidas' ? 'salida' : n.key === 'facturas' ? 'factura' : 'caja'} size={16} />}
            <strong>{colones(n.value)}</strong>
            <span className="small">{n.label}</span>
          </Bubble>
        ))}
      </Stage>

      {focus && (
        <Focus
          onClose={() => setFocus(null)}
          center={
            <>
              <span className="eyebrow">{nodes.find(n => n.key === focus)!.label} · {monthName(period)}</span>
              <strong className="mid">{colones(nodes.find(n => n.key === focus)!.value)}</strong>
              {focus === 'ventas' && list(m.porFamilia.map(f => ({ k: f.key, v: f.value })), 'sin ventas')}
              {focus === 'porCobrar' && list(m.deudores.map(d => ({ k: d.client, v: d.value })), 'nadie debe')}
              {focus === 'cobrado' && <span className="small">{Math.round((m.cobrado / (m.ventas || 1)) * 100)}% de lo vendido</span>}
              {focus === 'credito' && <span className="small">pedidos marcados + (a favor del cliente)</span>}
              {focus === 'salidas' && (monthExpenses.length ? (
                <ul className="mini-list">
                  {monthExpenses.slice(0, 5).map(e => (
                    <li key={e.id}><span>{e.type}{e.note ? ` · ${e.note}` : ''}</span><b>{colones(e.amount)}</b>
                      <button className="link" onClick={() => { removeExpense(e.id); toast('Salida borrada', { label: 'Deshacer', run: () => upsertExpense(e) }); }} aria-label="Borrar salida">×</button></li>
                  ))}
                </ul>
              ) : <span className="small">sin salidas</span>)}
              {focus === 'facturas' && list(openInvoices.map(i => ({ k: `${i.number} · ${i.client}`, v: i.lines.reduce((a, l) => a + l.total, 0) + i.adjustments.reduce((a, x) => a + x.amount, 0) })), 'todas pagadas')}
            </>
          }
          actions={focus === 'salidas' ? [{ label: 'nueva salida', onClick: () => { setFocus(null); nav.enter('salida'); }, tone: 'on' }] : []}
        />
      )}
    </>
  );
}
