/* Sincronización completa al abrir o al iniciar sesión:
   lo de la nube gana para los mismos ids, y lo que solo existe en el
   dispositivo (creado sin señal o antes de conectar Supabase) se sube. */

import { getState, replaceState } from './store';
import { pullAll, pushRow } from './sync';

export async function syncNow(): Promise<boolean> {
  const remote = await pullAll();
  if (!remote) return false;
  const local = getState();
  const merge = <T extends { id: string }>(table: 'orders' | 'offerings' | 'projects', l: T[], r: T[]) => {
    const ids = new Set(r.map(x => x.id));
    const onlyLocal = l.filter(x => !ids.has(x.id));
    onlyLocal.forEach(x => pushRow(table, x as never));
    return [...r, ...onlyLocal];
  };
  // proyectos antes que ofertas: las ofertas apuntan a un proyecto
  const projects = merge('projects', local.projects, remote.projects);
  const offerings = merge('offerings', local.offerings, remote.offerings);
  const orders = merge('orders', local.orders, remote.orders);
  replaceState({ projects, offerings, orders });
  return true;
}
