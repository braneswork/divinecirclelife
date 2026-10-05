/* La factura mensual como documento (hoja "Facturas"): se puede imprimir o
   guardar como PDF, marcar pagada, sumar ajustes (préstamo, abono) o anular. */

import { useIsAdmin } from '../role';
import { useState } from 'react';
import { colones, invoiceTotals } from '@dc/core';
import { PayMark, Sheet, useToast } from '@dc/ui';
import logo from '@dc/brand/assets/logo-light.png';
import { removeInvoice, setInvoicePaid, upsertInvoice, useStore } from '../store';
import { monthName } from './Clientes';
import { HelpDot } from '../HelpDot';

export function InvoiceSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const admin = useIsAdmin();
  const inv = useStore(s => s.invoices.find(i => i.id === id));
  const client = useStore(s => s.clients.find(c => c.id === inv?.clientId));
  const toast = useToast();
  const [adj, setAdj] = useState({ label: '', amount: '' });
  if (!inv) return null;
  const t = invoiceTotals(inv);

  function addAdjustment(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(adj.amount.replace(/[₡.,\s]/g, '').replace(/^\+/, ''));
    if (!adj.label.trim() || !amount) return toast('Escribe concepto y monto (negativo resta)');
    upsertInvoice({ ...inv!, adjustments: [...inv!.adjustments, { label: adj.label.trim(), amount }] });
    setAdj({ label: '', amount: '' });
  }

  return (
    <Sheet onClose={onClose} className="invoice" label={`Factura ${inv.number}`}>
        <header className="invoice-head">
          <img src={logo} alt="Divine Circle" />
          <div className="invoice-meta">
            <span>Recibo <b>{inv.number}</b></span>
            <span>{inv.date}</span>
          </div>
        </header>
        <div className="invoice-client">
          <div><span className="eyebrow">Cliente</span><b>{inv.client}</b>{client?.address && <span>{client.address}</span>}</div>
          <div><span className="eyebrow">Periodo</span><b>{monthName(inv.period)}</b><span>{inv.orderIds.length} pedidos</span></div>
        </div>
        <table>
          <thead><tr><th>Producto</th><th>Cant.</th><th>Subtotal</th><th>Desc.</th><th>Total</th></tr></thead>
          <tbody>
            {inv.lines.map(l => (
              <tr key={l.code + l.discount}><td>{l.name}</td><td>{l.qty}</td><td>{colones(l.subtotal)}</td><td>{l.discount ? `${Math.round(l.discount * 100)}%` : '—'}</td><td>{colones(l.total)}</td></tr>
            ))}
            {inv.adjustments.map((a, i) => (
              <tr key={'a' + i} className="adj">
                <td colSpan={4}>{a.label}
                  <button className="no-print link" onClick={() => upsertInvoice({ ...inv, adjustments: inv.adjustments.filter((_, j) => j !== i) })} aria-label="Quitar ajuste">quitar</button>
                </td>
                <td>{colones(a.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={4}>Subtotal</td><td>{colones(t.subtotal)}</td></tr>
            {t.discount > 0 && <tr><td colSpan={4}>Descuento</td><td>−{colones(t.discount)}</td></tr>}
            {t.adjustments !== 0 && <tr><td colSpan={4}>Ajustes</td><td>{colones(t.adjustments)}</td></tr>}
            <tr className="grand"><td colSpan={4}>Total</td><td>{colones(t.total)}</td></tr>
          </tfoot>
        </table>
        <footer className="invoice-status">
          <PayMark state={inv.status === 'pagada' ? 'paid' : 'pending'} size={28} />
          <span>{inv.status === 'pagada' ? 'Pagada' : 'Pendiente de pago'}</span>
        </footer>

        {admin && <form className="adj-form no-print" onSubmit={addAdjustment}>
          <input value={adj.label} onChange={e => setAdj({ ...adj, label: e.target.value })} placeholder="Ajuste: préstamo 2025, abono…" aria-label="Concepto del ajuste" />
          <input value={adj.amount} onChange={e => setAdj({ ...adj, amount: e.target.value })} placeholder="-45000" inputMode="numeric" aria-label="Monto del ajuste" />
          <button className="btn-inline">+</button>
        </form>}
        <div className="sheet-actions no-print">
          {admin && <button className="btn-inline" onClick={() => setInvoicePaid(inv, inv.status !== 'pagada')}>{inv.status === 'pagada' ? 'Reabrir' : 'Marcar pagada'}</button>}
          <button className="btn-inline ghost" onClick={() => print()}>Imprimir / PDF</button>
          {admin && <button className="btn-inline ghost bad" onClick={() => { if (confirm(`¿Anular la factura ${inv.number}? Sus pedidos vuelven a quedar por facturar.`)) { removeInvoice(inv); onClose(); } }}>Anular</button>}
          <button className="btn-inline ghost" onClick={onClose}>Cerrar</button>
          <HelpDot topic="factura" label="Factura mensual" />
        </div>
    </Sheet>
  );
}
