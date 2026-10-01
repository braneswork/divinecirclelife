/* Ajustes: el dispositivo al centro; alrededor tema, cuenta, equipo y respaldo. */

import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Bubble, Focus, Sheet, Stage, Track, around, useToast } from '@dc/ui';
import { sb } from '../supabase';
import { syncNow } from '../cloud';
import { getState, replaceState, useStore, type State } from '../store';
import { claimRole, syncError } from '../sync';
import { getTheme, setTheme, type Theme } from '../theme';
import { signOutAndClear } from '../auth/session';
import { HelpDot } from '../HelpDot';

const ROLE_LABEL: Record<string, string> = { owner: 'dueño', admin: 'admin', staff: 'equipo' };

export function Ajustes() {
  const toast = useToast();
  const orders = useStore(s => s.orders.length);
  const [theme, setThemeState] = useState<Theme>(getTheme);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState('');
  const [panel, setPanel] = useState<'cuenta' | 'equipo' | 'clave' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    sb?.auth.getSession().then(({ data }) => setSession(data.session));
    void claimRole().then(setRole);
  }, []);

  const pickTheme = (t: Theme) => { setTheme(t); setThemeState(t); };
  const isAdmin = role === 'owner' || role === 'admin';

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
    { key: 'cuenta', label: 'cuenta', on: false, run: () => setPanel('cuenta') },
    ...(isAdmin ? [{ key: 'equipo', label: 'equipo', on: false, run: () => setPanel('equipo') }] : []),
    { key: 'down', label: 'descargar respaldo', on: false, run: exportJson },
    { key: 'up', label: 'cargar respaldo', on: false, run: () => fileRef.current?.click() },
  ];

  return (
    <>
      <Stage>
        <Track r={36} dashed />
        <Bubble d={34} className="core">
          <span className="eyebrow">{ROLE_LABEL[role] ?? 'cuenta'}</span>
          <strong className="small">{session?.user.email}</strong>
          <strong className="big">{orders}</strong>
          <span className="small">ventas en este dispositivo</span>
        </Bubble>
        {items.map((it, i) => (
          <Bubble key={it.key} at={around(i, items.length, 36)} d={21} className={'setting' + (it.on ? ' on' : '')} onClick={it.run}>
            <span>{it.label}</span>
          </Bubble>
        ))}
      </Stage>
      <input ref={fileRef} type="file" accept="application/json" hidden onChange={e => e.target.files?.[0] && importJson(e.target.files[0])} />

      {panel === 'cuenta' && (
        <Focus
          onClose={() => setPanel(null)}
          center={
            <>
              <span className="eyebrow">Sesión</span>
              <strong className="small">{session?.user.email}</strong>
              <span className="small ok">{ROLE_LABEL[role] ?? role}</span>
              <span className="small">Salir sube lo pendiente y borra los datos de este dispositivo.</span>
            </>
          }
          actions={[
            { label: 'sincronizar', onClick: async () => toast((await syncNow()) ? 'Sincronizado' : syncError() || 'No se pudo sincronizar'), tone: 'on' },
            { label: 'contraseña', onClick: () => setPanel('clave') },
            { label: 'salir', onClick: () => void signOutAndClear(true), tone: 'bad' },
          ]}
        />
      )}
      {panel === 'clave' && <PasswordSheet onClose={() => setPanel(null)} />}
      {panel === 'equipo' && <Team myRole={role} me={session?.user.id} onClose={() => setPanel(null)} />}
    </>
  );
}

interface Member { user_id: string; email: string; role: string }

function Team({ myRole, me, onClose }: { myRole: string; me?: string; onClose: () => void }) {
  const toast = useToast();
  const [list, setList] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('staff');

  const load = async () => {
    const { data, error } = await sb!.rpc('team');
    if (error) toast('No se pudo cargar el equipo'); else setList(data as Member[]);
  };
  useEffect(() => { void load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await sb!.rpc('set_member', { p_email: email, p_role: role });
    if (error) return toast(error.message);
    if (data === 'sin cuenta') return toast('Esa persona aún no tiene cuenta: invítala en Supabase → Authentication → Users → Invite user, y después la agregas aquí.');
    setEmail(''); toast('Agregado al equipo'); void load();
  }

  async function change(m: Member, r: string) {
    const { error } = await sb!.rpc('set_member', { p_email: m.email, p_role: r });
    if (error) toast(error.message); else void load();
  }

  async function remove(m: Member) {
    if (!confirm(`¿Quitar a ${m.email} del equipo?`)) return;
    const { error } = await sb!.rpc('remove_member', { p_user: m.user_id });
    if (error) toast(error.message); else void load();
  }

  const roles = myRole === 'owner' ? ['owner', 'admin', 'staff'] : ['admin', 'staff'];
  return (
    <Sheet onClose={onClose} label="Equipo" className="team-sheet">
      <h2>Equipo <HelpDot topic="equipo" label="Equipo y acceso" /></h2>
      <ul className="team">
        {list.map(m => (
          <li key={m.user_id}>
            <span>{m.email}{m.user_id === me ? ' (tú)' : ''}</span>
            <select value={m.role} onChange={e => change(m, e.target.value)} disabled={m.role === 'owner' && myRole !== 'owner'} aria-label={`Rol de ${m.email}`}>
              {(m.role === 'owner' && myRole !== 'owner' ? ['owner'] : roles).map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
            <button className="link" onClick={() => remove(m)} disabled={m.role === 'owner' && myRole !== 'owner'}>quitar</button>
          </li>
        ))}
      </ul>
      <form className="team-add" onSubmit={add}>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@persona.com" aria-label="Correo de la persona" />
        <select value={role} onChange={e => setRole(e.target.value)} aria-label="Rol">
          {roles.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        <button className="btn-inline">Agregar</button>
      </form>
    </Sheet>
  );
}

/** Crear o cambiar la contraseña (mínimo 10 caracteres, con letras y números). */
function PasswordSheet({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const strong = a.length >= 10 && /[A-Za-z]/.test(a) && /\d/.test(a);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!strong) return toast('Mínimo 10 caracteres, con letras y números');
    if (a !== b) return toast('Las dos contraseñas no coinciden');
    const { error } = await sb!.auth.updateUser({ password: a });
    if (error) return toast(/reauth|recent/i.test(error.message) ? 'Por seguridad, sal y vuelve a entrar con el enlace antes de cambiarla.' : error.message);
    toast('Contraseña guardada. Desde ahora puedes entrar con ella.');
    onClose();
  }

  return (
    <Sheet onClose={onClose} label="Contraseña" className="team-sheet">
      <h2>Contraseña</h2>
      <form className="ficha" onSubmit={save}>
        <label className="field wide">Nueva contraseña<input type="password" autoComplete="new-password" value={a} onChange={e => setA(e.target.value)} autoFocus /></label>
        <label className="field wide">Repetir<input type="password" autoComplete="new-password" value={b} onChange={e => setB(e.target.value)} /></label>
        <p className={'field wide ' + (strong ? 'ok-text' : 'muted')}>Mínimo 10 caracteres, con letras y números.</p>
        <div className="field wide row end"><button type="button" className="btn-inline ghost" onClick={onClose}>Cancelar</button><button className="btn-inline">Guardar</button></div>
      </form>
    </Sheet>
  );
}
