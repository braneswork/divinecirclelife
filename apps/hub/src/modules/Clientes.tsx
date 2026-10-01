/* Clientes: cada cliente orbita el centro. Tocar uno lo expande y se entra
   en su círculo: descuentos negociados por producto, pedidos del mes y
   facturas mensuales (como las hojas Payments y Facturas). */

import { useRef, useState } from 'react';
import {
  INVOICE_SEQ_START, MESES, buildInvoice, colones, invoiceLines, invoiceTotals, invoiceableOrders, monthOf, orderTotal,
  type Client, type Invoice,
} from '@dc/core';
import { Bubble, Focus, Icon, Stage, Track, Zoom, around, hexCells, originOf, useToast, type Origin } from '@dc/ui';
import { now, saveInvoice, today, upsertClient, useStore } from '../store';
import { InvoiceSheet } from './InvoiceSheet';

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pct = (d?: number) => (d ? `-${Math.round(d * 100)}%` : 'lista');
export const monthName = (period: string) => { const [y, m] = period.split('-').map(Number); return `${MESES[m - 1]} ${y}`; };
export const shiftMonth = (period: string, n: number) => {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export function Clientes() {
  const clients = useStore(s => s.clients);
  const orders = useStore(s => s.orders);
  const toast = useToast();
  const wrap = useRef<HTMLDivElement>(null);
  const [inside, setInside] = useState<{ id: string; from?: Origin; closing?: boolean } | null>(null);
  const [draft, setDraft] = useState<Client | null>(null);
  const period = monthOf(today());
  // el contenedor real es la capa del módulo (este div es display: contents)
  const box = () => wrap.current?.closest('.zoom') ?? null;

  const list = clients.filter(c => c.active).sort((a, b) => Number(b.billing === 'mensual') - Number(a.billing === 'mensual') || a.name.localeCompare(b.name));
  const owed = (c: Client) => orders.filter(o => o.clientId === c.id && o.status !== 'cancelado' && o.pay === 'pending').reduce((s, o) => s + orderTotal(o), 0);
  const thisMonth = (c: Client) => orders.filter(o => o.clientId === c.id && o.status !== 'cancelado' && monthOf(o.date) === period).reduce((s, o) => s + orderTotal(o), 0);
  const totalOwed = list.reduce((s, c) => s + owed(c), 0);
  // panal uniforme: núcleo al centro, clientes alrededor y el "+" al final
  const cells = hexCells(list.length + 2);

  function create() {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) return toast('Falta el nombre');
    const id = slug(name);
    if (clients.some(c => c.id === id)) return toast('Ya existe ese cliente');
    upsertClient({ ...draft, id, name });
    setDraft(null);
    toast(`${name} agregado`);
  }

  return (
    <div className="nest" ref={wrap}>
      <Stage>
        <Bubble d={cells[0].d} className="core">
          <span className="eyebrow">Clientes</span>
          <strong className="big">{list.length}</strong>
          {totalOwed > 0 ? <span className="small warn">✕ {colones(totalOwed)}</span> : <span className="small">todo al día</span>}
        </Bubble>
        {list.map((c, i) => (
          <Bubble key={c.id} dataKey={'c-' + c.id} at={cells[i + 1].at} d={cells[i + 1].d} className={'client' + (c.billing === 'mensual' ? ' monthly' : '')}
            onClick={el => setInside({ id: c.id, from: originOf(el, box()) })} label={c.name}>
            <strong>{c.name.split(' ')[0]}</strong>
            <span className="small">{c.billing === 'mensual' ? `${colones(thisMonth(c))} mes` : owed(c) ? `✕ ${colones(owed(c))}` : 'al día'}</span>
          </Bubble>
        ))}
        <Bubble at={cells[list.length + 1].at} d={cells[list.length + 1].d} className="add" onClick={() => setDraft({ id: '', name: '', billing: 'contado', discounts: {}, active: true })} label="Nuevo cliente"><span>+</span></Bubble>
      </Stage>
      <p className="hint">Borde dorado: cobro mensual con factura. Al escribir un pedido con su nombre (o alias) se aplica su descuento.</p>

      {draft && (
        <Focus
          onClose={() => setDraft(null)}
          center={
            <form className="circle-form" onSubmit={e => { e.preventDefault(); create(); }}>
              <span className="eyebrow">Nuevo cliente</span>
              <input autoFocus value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Nombre" aria-label="Nombre" />
              <input value={draft.contact ?? ''} onChange={e => setDraft({ ...draft, contact: e.target.value })} placeholder="Contacto" aria-label="Contacto" />
              <button hidden />
            </form>
          }
          actions={[
            { label: 'guardar', onClick: create, tone: 'on' },
            { label: draft.billing, onClick: () => setDraft({ ...draft, billing: draft.billing === 'mensual' ? 'contado' : 'mensual' }), title: 'Forma de cobro' },
          ]}
        />
      )}

      {inside && (
        <Zoom key={inside.id} from={inside.from} closing={inside.closing} onClosed={() => setInside(null)} label="Cliente">
          <ClientPage
            id={inside.id}
            onBack={() => setInside(x => x && { ...x, from: originOf(box()?.querySelector(`[data-key="c-${x.id}"]`), box()) ?? x.from, closing: true })}
          />
        </Zoom>
      )}
    </div>
  );
}

function ClientPage({ id, onBack }: { id: string; onBack: () => void }) {
  const client = useStore(s => s.clients.find(c => c.id === id))!;
  const offerings = useStore(s => s.offerings);
  const orders = useStore(s => s.orders);
  const invoices = useStore(s => s.invoices);
  const toast = useToast();
  const [period, setPeriod] = useState(monthOf(today()));
  const [edit, setEdit] = useState<Client | null>(null);
  const [disc, setDisc] = useState<{ offeringId: string; value: string } | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);

  const products = offerings.filter(o => o.active && o.kind === 'producto');
  const monthOrders = orders.filter(o => o.clientId === id && o.status !== 'cancelado' && monthOf(o.date) === period);
  const pendingInv = invoiceableOrders(orders, id, period);
  const preview = invoiceLines(pendingInv);
  const previewTotal = preview.reduce((s, l) => s + l.total, 0);
  const previewSub = preview.reduce((s, l) => s + l.subtotal, 0);
  const mine = invoices.filter(i => i.clientId === id).sort((a, b) => b.number.localeCompare(a.number));
  const n = products.length;

  function issue() {
    const [y, m] = period.split('-').map(Number);
    const last = new Date(y, m, 0);
    const date = `${period}-${String(last.getDate()).padStart(2, '0')}`;
    const inv: Invoice = buildInvoice({ id: crypto.randomUUID(), client, period, date: date > today() ? today() : date, orders: pendingInv, invoices, seqStart: INVOICE_SEQ_START, now: now() });
    saveInvoice(inv);
    toast(`Factura ${inv.number} emitida`);
    setSheet(inv.id);
  }

  function saveDiscount() {
    if (!disc) return;
    const v = Number(disc.value.replace(',', '.'));
    if (Number.isNaN(v) || v < 0 || v >= 100) return toast('Escribe un porcentaje entre 0 y 99');
    const discounts = { ...client.discounts };
    if (v) discounts[disc.offeringId] = v / 100; else delete discounts[disc.offeringId];
    upsertClient({ ...client, discounts });
    setDisc(null);
  }

  return (
    <>
      <div className="zoom-head">
        <button className="zoom-back" onClick={onBack} aria-label="Volver a clientes"><Icon name="volver" size={18} /></button>
        <div className="month-nav" data-noswipe>
          <button onClick={() => setPeriod(shiftMonth(period, -1))} aria-label="Mes anterior">‹</button>
          <span>{monthName(period)}</span>
          <button onClick={() => setPeriod(shiftMonth(period, 1))} aria-label="Mes siguiente">›</button>
        </div>
      </div>

      <Stage>
        <Track r={40} dashed />
        <Bubble d={36} className={'core client-core' + (client.billing === 'mensual' ? ' monthly' : '')} onClick={() => setEdit({ ...client })} label="Editar cliente">
          <span className="eyebrow">{client.billing === 'mensual' ? 'cobro mensual' : 'contado'}</span>
          <strong className="mid">{client.name}</strong>
          <span className="small">{monthOrders.length} pedidos · {colones(monthOrders.reduce((s, o) => s + orderTotal(o), 0))}</span>
          {client.contact && <span className="small">{client.contact}</span>}
        </Bubble>
        {products.map((p, i) => (
          <Bubble key={p.id} at={around(i, n, 40)} d={n > 10 ? 12 : 14} className={'discount' + (client.discounts[p.id] ? ' on' : '')}
            onClick={() => setDisc({ offeringId: p.id, value: client.discounts[p.id] ? String(Math.round(client.discounts[p.id] * 100)) : '' })} label={`Descuento ${p.name}`}>
            <strong className="code">{p.code}</strong>
            <span className="small">{pct(client.discounts[p.id])}</span>
          </Bubble>
        ))}
      </Stage>

      {pendingInv.length > 0 ? (
        <div className="invoice-cta">
          <span>{pendingInv.length} pedidos sin facturar · {colones(previewSub)} → <b>{colones(previewTotal)}</b></span>
          <button className="btn-inline" onClick={issue}><Icon name="factura" size={16} /> Emitir factura</button>
        </div>
      ) : (
        <p className="hint">Nada por facturar en {monthName(period)}.</p>
      )}

      {mine.length > 0 && (
        <div className="beads" aria-label="Facturas">
          {mine.map(inv => (
            <button key={inv.id} className={'bead wide invoice-bead ' + inv.status} onClick={() => setSheet(inv.id)} title={`${monthName(inv.period)} · ${colones(invoiceTotals(inv).total)}`}>
              <b>{inv.number}</b>
              <span>{inv.status === 'pagada' ? '✓' : '✕'} {MESES[Number(inv.period.slice(5)) - 1].slice(0, 3)}</span>
            </button>
          ))}
        </div>
      )}

      {disc && (
        <Focus
          onClose={() => setDisc(null)}
          center={
            <form className="circle-form" onSubmit={e => { e.preventDefault(); saveDiscount(); }}>
              <span className="eyebrow">Descuento negociado</span>
              <strong className="mid">{offerings.find(o => o.id === disc.offeringId)?.name}</strong>
              <input autoFocus inputMode="decimal" value={disc.value} onChange={e => setDisc({ ...disc, value: e.target.value })} placeholder="% (vacío = precio de lista)" aria-label="Porcentaje" />
              <span className="small">precio de lista {colones(offerings.find(o => o.id === disc.offeringId)?.price ?? 0)}</span>
              <button hidden />
            </form>
          }
          actions={[{ label: 'guardar', onClick: saveDiscount, tone: 'on' }, { label: 'sin descuento', onClick: () => setDisc({ ...disc, value: '' }) }]}
        />
      )}

      {edit && (
        <Focus
          onClose={() => setEdit(null)}
          center={
            <form className="circle-form" onSubmit={e => { e.preventDefault(); upsertClient(edit); setEdit(null); }}>
              <span className="eyebrow">Cliente</span>
              <input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} placeholder="Nombre" aria-label="Nombre" />
              <input value={edit.contact ?? ''} onChange={e => setEdit({ ...edit, contact: e.target.value })} placeholder="Contacto" aria-label="Contacto" />
              <input value={edit.phone ?? ''} onChange={e => setEdit({ ...edit, phone: e.target.value })} placeholder="Teléfono" aria-label="Teléfono" inputMode="tel" />
              <input value={edit.address ?? ''} onChange={e => setEdit({ ...edit, address: e.target.value })} placeholder="Dirección" aria-label="Dirección" />
              <input value={(edit.aliases ?? []).join(', ')} onChange={e => setEdit({ ...edit, aliases: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} placeholder="Alias: manta, pilo" aria-label="Alias" />
              <button hidden />
            </form>
          }
          actions={[
            { label: 'guardar', onClick: () => { upsertClient(edit); setEdit(null); }, tone: 'on' },
            { label: edit.billing, onClick: () => setEdit({ ...edit, billing: edit.billing === 'mensual' ? 'contado' : 'mensual' }), title: 'Forma de cobro' },
            { label: edit.active ? 'activo' : 'inactivo', onClick: () => setEdit({ ...edit, active: !edit.active }), tone: edit.active ? 'ok' : 'muted' },
          ]}
        />
      )}

      {sheet && <InvoiceSheet id={sheet} onClose={() => setSheet(null)} />}
    </>
  );
}
