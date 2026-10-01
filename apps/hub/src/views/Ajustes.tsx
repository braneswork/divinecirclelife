import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { sb } from '../supabase';
import { syncNow } from '../cloud';
import { getState, replaceState, type State } from '../store';
import { syncError } from '../sync';
import { useToast } from '../toast';
import { setTheme, getTheme, type Theme } from '../theme';

export function Ajustes() {
  const toast = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [theme, setThemeState] = useState<Theme>(getTheme);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await sb!.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href } });
    toast(error ? error.message : 'Revisa tu correo para entrar');
  }

  async function sync() {
    toast((await syncNow()) ? 'Sincronizado' : syncError() || 'No se pudo sincronizar');
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
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

  return (
    <div className="stack">
      <section className="card">
        <div className="eyebrow">Apariencia</div>
        <div className="seg">
          {(['auto', 'light', 'dark'] as Theme[]).map(t => (
            <button key={t} className={theme === t ? 'on' : ''} onClick={() => { setTheme(t); setThemeState(t); }}>
              {t === 'auto' ? 'Automático' : t === 'light' ? 'Claro' : 'Oscuro'}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="eyebrow">Nube</div>
        {!sb ? (
          <p className="hint">
            Por ahora todo se guarda en este dispositivo. Cuando creemos el proyecto nuevo de Supabase,
            se configura con <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> y aquí aparece el acceso.
          </p>
        ) : session ? (
          <div className="stack tight">
            <p>Conectado como <b>{session.user.email}</b></p>
            <div className="row">
              <button className="btn primary" onClick={sync}>Sincronizar ahora</button>
              <button className="btn ghost" onClick={() => sb!.auth.signOut()}>Salir</button>
            </div>
          </div>
        ) : (
          <form className="row" onSubmit={login}>
            <input type="email" required placeholder="tu@correo.com" value={email} onChange={e => setEmail(e.target.value)} />
            <button className="btn primary">Enviar enlace</button>
          </form>
        )}
      </section>

      <section className="card">
        <div className="eyebrow">Respaldo</div>
        <div className="row">
          <button className="btn ghost" onClick={exportJson}>Descargar respaldo</button>
          <label className="btn ghost">
            Cargar respaldo
            <input type="file" accept="application/json" hidden onChange={e => e.target.files?.[0] && importJson(e.target.files[0])} />
          </label>
        </div>
      </section>
    </div>
  );
}
