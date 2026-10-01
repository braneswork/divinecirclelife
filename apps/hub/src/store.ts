/* Estado del hub.
   El dispositivo es la caché (funciona sin señal); si hay Supabase y sesión,
   cada cambio se envía a la nube y al abrir se trae lo último de allá. */

import { useSyncExternalStore } from 'react';
import {
  SEED_OFFERINGS, SEED_PROJECTS, toISODate,
  type Offering, type Order, type PayState, type Project, type QuickLine,
} from '@dc/core';
import { pushRow, deleteRow } from './sync';

export interface State {
  orders: Order[];
  offerings: Offering[];
  projects: Project[];
}

const KEY = 'divine-circle-hub-v2';

/** Pedidos guardados antes de la marca ✓ ✕ + traían paid: boolean. */
const migrate = (s: State): State => ({
  ...s,
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
  return { orders: [], offerings: SEED_OFFERINGS, projects: SEED_PROJECTS };
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
const now = () => new Date().toISOString();

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
  const order: Order = {
    id: prev?.id ?? crypto.randomUUID(),
    client: input.client,
    date: input.date,
    items: input.lines.map(l => ({
      offeringId: l.offering.id, code: l.offering.code, name: l.offering.name,
      qty: l.qty, unitPrice: l.offering.price,
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

// ---------------------------------------------------------------- catálogo y círculo

export function upsertOffering(o: Offering) {
  const exists = state.offerings.some(x => x.id === o.id);
  commit({ ...state, offerings: exists ? state.offerings.map(x => (x.id === o.id ? o : x)) : [...state.offerings, o] });
  pushRow('offerings', o);
}

export function upsertProject(p: Project) {
  const exists = state.projects.some(x => x.id === p.id);
  commit({ ...state, projects: exists ? state.projects.map(x => (x.id === p.id ? p : x)) : [...state.projects, p] });
  pushRow('projects', p);
}
