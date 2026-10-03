/* Sincronización completa al abrir o al iniciar sesión:
   lo de la nube gana para los mismos ids, y lo que solo existe en el
   dispositivo (creado sin señal o antes de conectar Supabase) se sube. */

import { dropDuplicates, ensureRecurring, getState, replaceState, type State } from './store';
import { TABLES, claimRole, pullAll, upsertMany } from './sync';

const FIRST = 'dc-synced-once';

export async function syncNow(): Promise<boolean> {
  const role = await claimRole();
  if (role !== 'owner' && role !== 'admin' && role !== 'staff') return false;
  const remote = await pullAll();
  if (!remote) return false;
  const local = getState();
  const next = { ...local } as Record<string, unknown>;
  // La primera vez en este dispositivo gana lo local (fichas, fotos, ventas que ya
  // estaban aquí) y se sube; después gana la nube para los mismos ids.
  let first = false;
  try { first = !localStorage.getItem(FIRST); } catch { /* sin storage: tratar como ya sincronizado */ }
  // en orden: proyectos antes que ofertas, clientes antes que pedidos
  for (const t of TABLES) {
    const r = remote[t];
    const l = local[t] as { id: string }[];
    if (first) {
      const ids = new Set(l.map(x => x.id));
      if (!(await upsertMany(t, l))) return false;
      next[t] = [...l, ...r.filter(x => !ids.has(x.id))];
    } else {
      const ids = new Set(r.map(x => x.id));
      const onlyLocal = l.filter(x => !ids.has(x.id));
      if (!(await upsertMany(t, onlyLocal))) return false;
      next[t] = [...r, ...onlyLocal];
    }
  }
  try { localStorage.setItem(FIRST, new Date().toISOString()); } catch { /* nada */ }
  replaceState(next as unknown as State);
  dropDuplicates();
  ensureRecurring();
  return true;
}
