/* Salir: primero sube lo pendiente; luego cierra la sesión y borra los datos
   de este dispositivo (para que en un teléfono o computadora compartida no quede nada). */

import { sb } from '../supabase';
import { syncNow } from '../cloud';
import { clearLocal } from '../store';

export async function signOutAndClear(syncFirst = true): Promise<boolean> {
  if (syncFirst) {
    const ok = await syncNow();
    if (!ok && !confirm('No se pudo sincronizar. Si sales ahora, lo que no se subió se pierde en este dispositivo. ¿Salir de todos modos?')) return false;
  }
  await sb?.auth.signOut();
  clearLocal();
  location.hash = '';
  return true;
}
