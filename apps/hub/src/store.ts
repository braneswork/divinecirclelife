/* Estado del hub.
   El dispositivo es la caché (funciona sin señal); si hay Supabase y sesión,
   cada cambio se envía a la nube y al abrir se trae lo último de allá. */

import { useSyncExternalStore } from 'react';
import {
  SEED_CLIENTS, SEED_EXPERIENCES, SEED_OFFERINGS, SEED_PROJECTS, matchClient, toISODate,
  type Client, type Expense, type Invoice, type Offering, type Order, type PayState, type Project, type QuickLine,
} from '@dc/core';
import { pushRow, deleteRow, type Table } from './sync';

export interface State {
  orders: Order[];
  offerings: Offering[];
  projects: Project[];
  clients: Client[];
  invoices: Invoice[];
  expenses: Expense[];
}

const KEY = 'divine-circle-hub-v2';

/** Estados guardados con versiones anteriores del hub:
    - pedidos con paid: boolean (antes de la marca ✓ ✕ +)
    - sin clientes, facturas ni salidas */
const migrate = (s: State): State => ({
  ...s,
  clients: s.clients ?? SEED_CLIENTS,
  // experiencias de la hoja que aún no estén en el catálogo de este dispositivo,
  // y descripción/presentación de la semilla para fichas que aún no las tengan
  offerings: [...s.offerings, ...SEED_EXPERIENCES.filter(e => !s.offerings.some(o => o.id === e.id || o.code === e.code))].map(o => {
    const seed = [...SEED_OFFERINGS, ...SEED_EXPERIENCES].find(x => x.id === o.id);
    return seed ? { ...o, description: o.description ?? seed.description, unit: o.unit ?? seed.unit } : o;
  }),
  invoices: s.invoices ?? [],
  expenses: s.expenses ?? [],
  orders: s.orders.map(o => {
    const old = o as Order & { paid?: boolean };
    if (old.pay) return o;
    const { paid, ...rest } = old;
    return { ...rest, pay: paid ? 'paid' : 'pending' };
  }),
});

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw) as State);
  } catch { /* storage bloqueado o dañado: arrancamos limpio */ }
  return { orders: [], offerings: [...SEED_OFFERINGS, ...SEED_EXPERIENCES], projects: SEED_PROJECTS, clients: SEED_CLIENTS, invoices: [], expenses: [] };
}

let state: State = load();
const listeners = new Set<() => void>();

function commit(next: State) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sin espacio o privado */ }
  listeners.forEach(l => l());
}

export const getState = () => state;
export const replaceState = (next: State) => commit(migrate(next));

export function useStore<T>(pick: (s: State) => T): T {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb); },
    () => pick(state),
  );
}

export const today = () => toISODate(new Date());
export const now = () => new Date().toISOString();

/** Inserta o reemplaza por id y lo manda a la nube. */
function upsert<K extends Table>(table: K, row: State[K][number]) {
  const list = state[table] as { id: string }[];
  const exists = list.some(x => x.id === row.id);
  commit({ ...state, [table]: exists ? list.map(x => (x.id === row.id ? row : x)) : [...list, row] });
  pushRow(table, row);
}

function remove<K extends Table>(table: K, id: string) {
  commit({ ...state, [table]: (state[table] as { id: string }[]).filter(x => x.id !== id) });
  deleteRow(table, id);
}

// ---------------------------------------------------------------- pedidos

export interface NewOrder {
  lines: QuickLine[];
  client: string;
  date: string;
  amountOverride?: number;
  pay: PayState;
  note?: string;
}

export function saveOrder(input: NewOrder, replaceId?: string): Order {
  const prev = replaceId ? state.orders.find(o => o.id === replaceId) : undefined;
  // si el nombre es de un cliente registrado, se enlaza y se aplica su descuento negociado
  const client = matchClient(input.client, state.clients);
  const order: Order = {
    id: prev?.id ?? crypto.randomUUID(),
    client: client?.name ?? input.client,
    clientId: client?.id,
    invoiceId: prev?.invoiceId,
    date: input.date,
    items: input.lines.map(l => ({
      offeringId: l.offering.id, code: l.offering.code, name: l.offering.name,
      qty: l.qty, unitPrice: l.offering.price,
      ...(client?.discounts[l.offering.id] ? { discount: client.discounts[l.offering.id] } : {}),
    })),
    amountOverride: input.amountOverride,
    status: prev?.status ?? 'pendiente',
    // al editar se conserva la marca de pago salvo que se escriba "pagado" o "credito"
    pay: input.pay !== 'pending' ? input.pay : (prev?.pay ?? 'pending'),
    note: input.note,
    phone: prev?.phone,
    source: prev?.source ?? 'hub',
    createdAt: prev?.createdAt ?? now(),
    updatedAt: now(),
  };
  commit({ ...state, orders: prev ? state.orders.map(o => (o.id === order.id ? order : o)) : [...state.orders, order] });
  pushRow('orders', order);
  return order;
}

export function updateOrder(id: string, patch: Partial<Order>) {
  let changed: Order | undefined;
  commit({
    ...state,
    orders: state.orders.map(o => (o.id === id ? (changed = { ...o, ...patch, updatedAt: now() }) : o)),
  });
  if (changed) pushRow('orders', changed);
}

export function removeOrder(id: string): Order | undefined {
  const gone = state.orders.find(o => o.id === id);
  commit({ ...state, orders: state.orders.filter(o => o.id !== id) });
  if (gone) deleteRow('orders', id);
  return gone;
}

export function restoreOrder(order: Order) {
  commit({ ...state, orders: [...state.orders, order] });
  pushRow('orders', order);
}

// ---------------------------------------------------------------- catálogo, círculo, clientes, facturas, salidas

export const upsertOffering = (o: Offering) => upsert('offerings', o);
export const upsertProject = (p: Project) => upsert('projects', p);
export const upsertClient = (c: Client) => upsert('clients', c);
export const upsertExpense = (e: Expense) => upsert('expenses', e);
export const removeExpense = (id: string) => remove('expenses', id);

export const upsertInvoice = (i: Invoice) => upsert('invoices', i);

/** Emite la factura y marca sus pedidos como facturados. */
export function saveInvoice(inv: Invoice) {
  upsert('invoices', inv);
  for (const id of inv.orderIds) updateOrder(id, { invoiceId: inv.id });
}

/** Factura pagada: sus pedidos quedan ✓. Reabrirla los devuelve a ✕. */
export function setInvoicePaid(inv: Invoice, paid: boolean) {
  upsert('invoices', { ...inv, status: paid ? 'pagada' : 'abierta' });
  for (const id of inv.orderIds) updateOrder(id, { pay: paid ? 'paid' : 'pending' });
}

/** Anula la factura: sus pedidos vuelven a quedar por facturar. */
export function removeInvoice(inv: Invoice) {
  remove('invoices', inv.id);
  for (const id of inv.orderIds) updateOrder(id, { invoiceId: undefined });
}

/** Borra todo lo guardado en este dispositivo (al salir). */
export function clearLocal() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('divine-circle') || k.startsWith('dc-') || k.startsWith('sb-')) localStorage.removeItem(k);
  } catch { /* sin storage */ }
  commit({ orders: [], offerings: [...SEED_OFFERINGS, ...SEED_EXPERIENCES], projects: SEED_PROJECTS, clients: SEED_CLIENTS, invoices: [], expenses: [] });
  try { localStorage.removeItem(KEY); } catch { /* nada */ }
}
