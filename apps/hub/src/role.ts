/* El rol de quien usa el hub (dueño, admin o equipo), para mostrar solo lo que
   puede hacer. La regla de verdad está en la base de datos (supabase/equipo.sql):
   esto solo evita botones que la nube rechazaría. */

import { useSyncExternalStore } from 'react';

const KEY = 'dc-role';
const listeners = new Set<() => void>();
let role = (() => { try { return localStorage.getItem(KEY) ?? ''; } catch { return ''; } })();

export function setRole(r: string) {
  if (!['owner', 'admin', 'staff'].includes(r) || r === role) return;
  role = r;
  try { localStorage.setItem(KEY, r); } catch { /* sin storage */ }
  listeners.forEach(l => l());
}

export const getRole = () => role;
export const useRole = () => useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => role);
/** dueño o admin; mientras no se sabe, se asume que sí (la nube decide igual) */
export const useIsAdmin = () => { const r = useRole(); return r !== 'staff'; };
