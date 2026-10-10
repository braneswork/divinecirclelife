/* Puente con Supabase. Mapea camelCase (app) ↔ snake_case (base de datos).
   Si no hay Supabase o no hay sesión, no hace nada y todo queda en el dispositivo. */

import { setRole } from './role';
import type { Client, Expense, Invoice, Offering, Order, Project, Recurring } from '@dc/core';
import { sb } from './supabase';

export type Table = 'orders' | 'offerings' | 'projects' | 'clients' | 'invoices' | 'expenses' | 'recurring';
const TABLES: Table[] = ['projects', 'offerings', 'clients', 'recurring', 'orders', 'invoices', 'expenses'];
type Row = Record<string, unknown>;

const snake = (k: string) => k.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
const camel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

// columnas de supabase/precios.sql: si no tienen valor no se mandan, así el hub
// sigue sincronizando aunque ese SQL todavía no se haya corrido (para borrar
// un valor se guarda null)
const OPTIONAL = new Set(['discount', 'paidAmount', 'promoPrice', 'promoUntil']);
const toRow = (obj: object): Row =>
  Object.fromEntries(Object.entries(obj).filter(([k, v]) => !(OPTIONAL.has(k) && v === undefined)).map(([k, v]) => [snake(k), v ?? null]));
const fromRow = <T>(row: Row): T =>
  Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null).map(([k, v]) => [camel(k), v])) as T;

/** Un respaldo de la nube (tablas en snake_case) en el formato del hub. */
export function backupToState(data: Record<string, unknown>) {
  return Object.fromEntries(TABLES.map(t => [t, ((data[t] as Row[] | undefined) ?? []).map(r => fromRow(r))]));
}

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

export function pushRow(table: Table, obj: Order | Offering | Project | Client | Invoice | Expense | Recurring) {
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
export async function pullAll(): Promise<Record<Table, { id: string }[]> | null> {
  if (!(await signedIn())) return null;
  const res = await Promise.all(TABLES.map(t => sb!.from(t).select('*')));
  const err = res.find(r => r.error)?.error;
  if (err) { report(err); return null; }
  return Object.fromEntries(TABLES.map((t, i) => [t, (res[i].data as Row[]).map(r => fromRow<{ id: string }>(r))])) as Record<Table, { id: string }[]>;
}

export { TABLES };

/** Rol en el equipo: la primera persona que entra queda como dueña. */
export async function claimRole(): Promise<string> {
  if (!(await signedIn())) return 'sin sesión';
  const { data, error } = await sb!.rpc('claim_ownership');
  if (error) { report(error); return 'error'; }
  setRole(data as string);
  return data as string;
}

/** Sube muchas filas y espera (en lotes), para respetar el orden entre tablas. */
export async function upsertMany(table: Table, rows: object[]): Promise<boolean> {
  if (!rows.length || !(await signedIn())) return true;
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await sb!.from(table).upsert(rows.slice(i, i + 200).map(toRow));
    if (error) { report(error); return false; }
  }
  return true;
}
