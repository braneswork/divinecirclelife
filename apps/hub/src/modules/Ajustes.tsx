/* Ajustes: el tema y los datos orbitando alrededor del centro. */

import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { sb } from '../supabase';
import { syncNow } from '../cloud';
import { getState, replaceState, type State } from '../store';
import { claimRole, syncError } from '../sync';
import { useToast } from '@dc/ui';
import { getTheme, setTheme, type Theme } from '../theme';
import { Bubble, Focus, Stage, Track, around } from '@dc/ui';

export function Ajustes() {
  const toast = useToast();
  const [theme, setThemeState] = useState<Theme>(getTheme);
  const [session, setSession] = useState<Session | null>(null);
  const [cloud, setCloud] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => { setSession(s); if (s) void claimRole().then(setRole); });
    return () => data.subscription.unsubscribe();
  }, []);

  const pickTheme = (t: Theme) => { setTheme(t); setThemeState(t); };

  function exportJson() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' }));
    a.download = `divine-circle-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importJson(file: File) {
    try {
      const data = JSON.parse(await file.text()) as State;
      if (!Array.isArray(data.orders) || !Array.isArray(data.offerings) || !Array.isArray(data.projects)) throw new Error();
      if (!confirm('Esto reemplaza los datos de este dispositivo. ¿Seguir?')) return;
      replaceState(data);
      toast('Respaldo cargado');
    } catch {
      toast('Ese archivo no es un respaldo del hub');
    }
  }

  const items = [
    { key: 'auto', label: 'automático', on: theme === 'auto', run: () => pickTheme('auto') },
    { key: 'light', label: 'claro', on: theme === 'light', run: () => pickTheme('light') },
    { key: 'dark', label: 'oscuro', on: theme === 'dark', run: () => pickTheme('dark') },
    { key: 'cloud', label: session ? 'nube ✓' : 'nube', on: !!session, run: () => setCloud(true) },
    { key: 'down', label: 'descargar respaldo', on: false, run: exportJson },
    { key: 'up', label: 'cargar respaldo', on: false, run: () => fileRef.current?.click() },
  ];

  return (
    <>
      <Stage>
        <Track r={36} dashed />
        <Bubble d={34} className="core">
          <span className="eyebrow">Este dispositivo</span>
          <strong className="big">{getState().orders.length}</strong>
          <span className="small">pedidos</span>
          <span className="small">{session ? 'en la nube' : 'solo aquí'}</span>
        </Bubble>
        {items.map((it, i) => (
          <Bubble key={it.key} at={around(i, items.length, 36)} d={22} className={'setting' + (it.on ? ' on' : '')} onClick={it.run}>
            <span>{it.label}</span>
          </Bubble>
        ))}
      </Stage>
      <input ref={fileRef} type="file" accept="application/json" hidden onChange={e => e.target.files?.[0] && importJson(e.target.files[0])} />

      {cloud && (
        <Focus
          onClose={() => setCloud(false)}
          center={
            !sb ? (
              <>
                <span className="eyebrow">Nube</span>
                <span className="small">Todo se guarda en este dispositivo. Al crear el Supabase nuevo se configura <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.</span>
              </>
            ) : session ? (
              <>
                <span className="eyebrow">Conectado</span>
                <strong className="small">{session.user.email}</strong>
                <span className={'small ' + (role === 'sin acceso' || role === 'error' ? 'warn' : 'ok')}>
                  {role === 'owner' ? 'dueño' : role === 'admin' ? 'admin' : role === 'staff' ? 'equipo' : role === 'sin acceso' ? 'sin acceso: pide al dueño que te agregue' : role === 'error' ? syncError() : '…'}
                </span>
              </>
            ) : (
              <form className="circle-form" onSubmit={async e => {
                e.preventDefault();
                const { error } = await sb!.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href } });
                toast(error ? error.message : 'Revisa tu correo para entrar');
              }}>
                <span className="eyebrow">Entrar</span>
                <input type="email" required placeholder="tu@correo.com" value={email} onChange={e => setEmail(e.target.value)} />
                <button className="btn-inline">enviar enlace</button>
              </form>
            )
          }
          actions={session ? [
            { label: 'sincronizar', onClick: async () => toast((await syncNow()) ? 'Sincronizado' : syncError() || 'No se pudo sincronizar'), tone: 'on' },
            { label: 'salir', onClick: () => sb!.auth.signOut(), tone: 'bad' },
          ] : []}
        />
      )}
    </>
  );
}
