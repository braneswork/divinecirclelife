/* Sincronización completa al abrir o al iniciar sesión:
   lo de la nube gana para los mismos ids, y lo que solo existe en el
   dispositivo (creado sin señal o antes de conectar Supabase) se sube. */

import { getState, replaceState, type State } from './store';
import { TABLES, pullAll, pushRow } from './sync';

export async function syncNow(): Promise<boolean> {
  const remote = await pullAll();
  if (!remote) return false;
  const local = getState();
  const next = { ...local } as Record<string, unknown>;
  // en orden: proyectos antes que ofertas, clientes antes que pedidos
  for (const t of TABLES) {
    const r = remote[t];
    const ids = new Set(r.map(x => x.id));
    const onlyLocal = (local[t] as { id: string }[]).filter(x => !ids.has(x.id));
    onlyLocal.forEach(x => pushRow(t, x as never));
    next[t] = [...r, ...onlyLocal];
  }
  replaceState(next as unknown as State);
  return true;
}
