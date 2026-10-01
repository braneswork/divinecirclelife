/* Puente con Supabase. Mapea camelCase (app) ↔ snake_case (base de datos).
   Si no hay Supabase o no hay sesión, no hace nada y todo queda en el dispositivo. */

import type { Offering, Order, Project } from '@dc/core';
import { sb } from './supabase';

type Table = 'orders' | 'offerings' | 'projects';
type Row = Record<string, unknown>;

const snake = (k: string) => k.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
const camel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

const toRow = (obj: object): Row =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [snake(k), v ?? null]));
const fromRow = <T>(row: Row): T =>
  Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null).map(([k, v]) => [camel(k), v])) as T;

export type SyncStatus = 'local' | 'sin-sesion' | 'ok' | 'error';
let lastError = '';
export const syncError = () => lastError;

async function signedIn() {
  if (!sb) return false;
  const { data } = await sb.auth.getSession();
  return !!data.session;
}

function report(error: { message: string } | null) {
  if (error) { lastError = error.message; console.warn('[sync]', error.message); }
}

export function pushRow(table: Table, obj: Order | Offering | Project) {
  void (async () => {
    if (!(await signedIn())) return;
    const { error } = await sb!.from(table).upsert(toRow(obj));
    report(error);
  })();
}

export function deleteRow(table: Table, id: string) {
  void (async () => {
    if (!(await signedIn())) return;
    const { error } = await sb!.from(table).delete().eq('id', id);
    report(error);
  })();
}

/** Trae todo de la nube. Devuelve null si no hay conexión configurada o sesión. */
export async function pullAll(): Promise<{ orders: Order[]; offerings: Offering[]; projects: Project[] } | null> {
  if (!(await signedIn())) return null;
  const [o, f, p] = await Promise.all([
    sb!.from('orders').select('*'),
    sb!.from('offerings').select('*'),
    sb!.from('projects').select('*'),
  ]);
  const err = o.error ?? f.error ?? p.error;
  if (err) { report(err); return null; }
  return {
    orders: (o.data as Row[]).map(r => fromRow<Order>(r)),
    offerings: (f.data as Row[]).map(r => fromRow<Offering>(r)),
    projects: (p.data as Row[]).map(r => fromRow<Project>(r)),
  };
}
