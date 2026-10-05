/* Clientes: cada cliente orbita el centro. Tocar uno lo expande y se entra
   en su círculo: descuentos negociados por producto, pedidos del mes y
   facturas mensuales (como las hojas Payments y Facturas). */

import { useIsAdmin } from '../role';
import { useRef, useState } from 'react';
import {
  INVOICE_SEQ_START, MESES, buildInvoice, pillarOf, colones, invoiceLines, invoiceTotals, invoiceableOrders, monthOf, orderDue, orderTotal,
  type Client, type Invoice,
} from '@dc/core';
import { Bubble, Focus, Icon, Photo, Sheet, Stage, Timeline, Track, ViewToggle, Zoom, around, hexCells, originOf, useToast, useViewMode, type Origin, type TimelineItem } from '@dc/ui';
import { now, removeClient, saveInvoice, today, upsertClient, useStore } from '../store';
import { InvoiceSheet } from './InvoiceSheet';
import { HelpDot } from '../HelpDot';

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

  const [archived, setArchived] = useState(false);
  const nArchived = clients.filter(c => !c.active).length;
  const list = clients.filter(c => (archived ? !c.active : c.active)).sort((a, b) => Number(b.billing === 'mensual') - Number(a.billing === 'mensual') || a.name.localeCompare(b.name));
  const owed = (c: Client) => orders.filter(o => o.clientId === c.id && o.status !== 'cancelado' && o.pay === 'pending').reduce((s, o) => s + orderDue(o), 0);
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
          <span className="eyebrow">{archived ? 'Archivados' : 'Clientes'}</span>
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
        <Bubble at={cells[list.length + 1].at} d={cells[list.length + 1].d} className={'add' + (archived ? ' hidden-add' : '')} onClick={() => setDraft({ id: '', name: '', billing: 'contado', discounts: {}, active: true })} label="Nuevo cliente"><span>+</span></Bubble>
      </Stage>
      {(nArchived > 0 || archived) && (
        <button className="chip" onClick={() => setArchived(!archived)}>{archived ? '← clientes activos' : `ver archivados (${nArchived})`}</button>
      )}

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

/** Si el cliente se borró mientras su página se cierra, no se dibuja nada. */
function ClientPage(props: { id: string; onBack: () => void }) {
  const exists = useStore(s => s.clients.some(c => c.id === props.id));
  return exists ? <ClientPageInner {...props} /> : null;
}

function ClientPageInner({ id, onBack }: { id: string; onBack: () => void }) {
  const admin = useIsAdmin();
  const client = useStore(s => s.clients.find(c => c.id === id))!;
  const offerings = useStore(s => s.offerings);
  const orders = useStore(s => s.orders);
  const invoices = useStore(s => s.invoices);
  const toast = useToast();
  const [period, setPeriod] = useState(monthOf(today()));
  const [edit, setEdit] = useState<Client | null>(null);
  const [disc, setDisc] = useState<{ offeringId: string; value: string } | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [view, setView] = useViewMode('cliente');

  // solo lo que este cliente pide o tiene negociado (una clave con 0 = precio de lista, fijado a mano)
  const ordered = new Set(orders.filter(o => o.clientId === id).flatMap(o => o.items.map(i => i.offeringId)));
  const products = offerings.filter(o => o.kind !== 'experiencia' && (o.id in client.discounts || ordered.has(o.id)));
  const others = offerings.filter(o => o.active && o.kind === 'producto' && !products.includes(o));
  const monthOrders = orders.filter(o => o.clientId === id && o.status !== 'cancelado' && monthOf(o.date) === period);
  const pendingInv = invoiceableOrders(orders, id, period);
  const preview = invoiceLines(pendingInv);
  const previewTotal = preview.reduce((s, l) => s + l.total, 0);
  const previewSub = preview.reduce((s, l) => s + l.subtotal, 0);
  const mine = invoices.filter(i => i.clientId === id).sort((a, b) => b.number.localeCompare(a.number));
  const n = products.length + 1;

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
    discounts[disc.offeringId] = v / 100; // 0 = precio de lista, pero queda en su círculo
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
      <ViewToggle value={view} onChange={setView} />

      {view === 'historial' ? (
        <Timeline today={today()} empty={`Sin movimientos en ${monthName(period)}.`} items={[
          ...monthOrders.map((o): TimelineItem => ({
            id: o.id, date: o.date, mark: o.pay,
            title: o.items.map(i => `${i.qty} ${i.name}`).join(' · '),
            detail: [o.invoiceId ? `factura ${invoices.find(x => x.id === o.invoiceId)?.number ?? ''}` : client.billing === 'mensual' ? 'por facturar' : null, o.note].filter(Boolean).join(' · ') || undefined,
            amount: orderTotal(o),
          })),
          ...mine.filter(i => i.period === period).map((i): TimelineItem => ({
            id: i.id, date: i.date, tone: i.status === 'pagada' ? 'var(--ok)' : 'var(--bad)', muted: true,
            title: `Factura ${i.number}`, detail: i.status === 'pagada' ? 'pagada' : 'pendiente de pago', amount: invoiceTotals(i).total,
            onClick: () => setSheet(i.id),
          })),
        ]} />
      ) : (
      <Stage>
        <Track r={36} dashed />
        <Bubble d={36} className={'core client-core' + (client.billing === 'mensual' ? ' monthly' : '')} onClick={() => setEdit({ ...client })} label="Editar cliente">
          <span className="eyebrow">{client.billing === 'mensual' ? 'cobro mensual' : 'contado'}</span>
          <strong className="mid">{client.name}</strong>
          <span className="small">{monthOrders.length} pedidos · {colones(monthOrders.reduce((s, o) => s + orderTotal(o), 0))}</span>
          {client.contact && <span className="small">{client.contact}</span>}
        </Bubble>
        {products.map((p, i) => (
          <Bubble key={p.id} at={around(i, n, 36, n === 2 ? 90 : 0)} d={n > 10 ? 12 : 17} className={'discount' + (client.discounts[p.id] ? ' on' : '')}
            onClick={() => setDisc({ offeringId: p.id, value: client.discounts[p.id] ? String(Math.round(client.discounts[p.id] * 100)) : '' })} label={`Descuento ${p.name}`}>
            <strong className="code">{p.code}</strong>
            <span className="small">{pct(client.discounts[p.id])}</span>
          </Bubble>
        ))}
        <Bubble at={around(products.length, n, 36, n === 2 ? 90 : 0)} d={n > 10 ? 12 : 15} className="add" onClick={() => setPicking(true)} label="Sumar un producto a este cliente"><span>+</span></Bubble>
      </Stage>
      )}

      {pendingInv.length > 0 ? (
        <div className="invoice-cta">
          <span>{pendingInv.length} pedidos sin facturar · {colones(previewSub)} → <b>{colones(previewTotal)}</b></span>
          {admin && <button className="btn-inline" onClick={issue}><Icon name="factura" size={16} /> Emitir factura</button>}
          <HelpDot topic="factura" label="Factura mensual" />
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

      {picking && (
        <Sheet onClose={() => setPicking(false)} label="Sumar producto" className="team-sheet">
          <h2>Sumar producto a {client.name}</h2>
          {others.length ? (
            <ul className="pick-grid">
              {others.map(o => (
                <li key={o.id}>
                  <button onClick={() => { setPicking(false); setDisc({ offeringId: o.id, value: '' }); }}>
                    <Photo src={o.image} name={o.name} tone={pillarOf(o.pillar)?.color} />
                    <strong>{o.name}</strong>
                    <small>{colones(o.price)}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="muted">Ya están todos los productos.</p>}
        </Sheet>
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
          actions={[
            { label: 'guardar', onClick: saveDiscount, tone: 'on' },
            { label: 'sin descuento', onClick: () => setDisc({ ...disc, value: '' }) },
            ...(disc.offeringId in client.discounts ? [{ label: 'quitar', tone: 'bad' as const, onClick: () => {
              const discounts = { ...client.discounts }; delete discounts[disc.offeringId];
              upsertClient({ ...client, discounts }); setDisc(null);
            } }] : []),
          ]}
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
            { label: edit.active ? 'archivar' : 'reactivar', onClick: () => { upsertClient({ ...edit, active: !edit.active }); setEdit(null); toast(edit.active ? `${edit.name} archivado` : `${edit.name} reactivado`); if (edit.active) onBack(); } },
            ...(admin ? [{ label: 'borrar', tone: 'bad' as const, onClick: () => {
              if (!confirm(`¿Borrar a ${edit.name}? Sus ventas se quedan con el nombre.`)) return;
              if (removeClient(client) === 'tiene-facturas') { toast('Tiene facturas emitidas: se archiva en vez de borrarse'); upsertClient({ ...client, active: false }); }
              else toast(`${client.name} borrado`);
              setEdit(null); onBack();
            } }] : []),
          ]}
        />
      )}

      {sheet && <InvoiceSheet id={sheet} onClose={() => setSheet(null)} />}
    </>
  );
}
