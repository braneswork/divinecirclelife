/* Ajustes: el dispositivo al centro; alrededor tema, cuenta, equipo y respaldo. */

import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Bubble, Focus, Sheet, Stage, Track, around, useToast } from '@dc/ui';
import { sb } from '../supabase';
import { syncNow } from '../cloud';
import { getState, replaceState, useStore, type State } from '../store';
import { backupToState, claimRole, syncError } from '../sync';
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
  const [panel, setPanel] = useState<'cuenta' | 'equipo' | 'clave' | 'actividad' | 'respaldos' | null>(null);
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
    ...(isAdmin ? [
      { key: 'equipo', label: 'equipo', on: false, run: () => setPanel('equipo') },
      { key: 'actividad', label: 'actividad', on: false, run: () => setPanel('actividad') },
      { key: 'respaldos', label: 'respaldos', on: false, run: () => setPanel('respaldos') },
    ] : []),
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
      {panel === 'actividad' && <Activity onClose={() => setPanel(null)} />}
      {panel === 'respaldos' && <Backups onClose={() => setPanel(null)} onExport={exportJson} onImport={() => fileRef.current?.click()} />}
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

interface AuditRow { id: number; at: string; email: string | null; tbl: string; action: 'insert' | 'update' | 'delete'; old: Record<string, unknown> | null; new: Record<string, unknown> | null }

const TBL: Record<string, string> = { orders: 'venta', clients: 'cliente', offerings: 'producto', expenses: 'salida', invoices: 'factura', recurring: 'fijo', members: 'equipo', projects: 'proyecto' };
const VERB = { insert: 'anotó', update: 'cambió', delete: 'borró' };
const FIELD: Record<string, string> = {
  pay: 'pago', status: 'estado', items: 'productos', date: 'día', client: 'cliente', note: 'nota', amount_override: 'total', discount: 'descuento',
  paid_amount: 'abono', price: 'precio', promo_price: 'precio especial', promo_until: 'fin del especial', name: 'nombre', amount: 'monto',
  discounts: 'descuentos', billing: 'cobro', active: 'activo', role: 'rol', weekdays: 'días', skips: 'días saltados', invoice_id: 'factura',
};
const money = (v: unknown) => (typeof v === 'number' ? '₡' + v.toLocaleString('es-CR') : '');

/** Qué fila fue, en palabras: "Jesús · 2 Campesino ₡8.000" */
function what(r: AuditRow) {
  const x = (r.new ?? r.old ?? {}) as Record<string, unknown>;
  if (r.tbl === 'orders') {
    const items = (x.items as { qty: number; code: string }[] | undefined)?.map(i => `${i.qty}${i.code}`).join(' ') ?? '';
    return `${x.client ?? ''} · ${items} · ${x.date ?? ''}`;
  }
  if (r.tbl === 'expenses') return `${x.type ?? ''} ${money(x.amount)}`;
  if (r.tbl === 'invoices') return `${x.number ?? ''} · ${x.client ?? ''}`;
  if (r.tbl === 'members') return `${x.name ?? ''} (${x.role ?? ''})`;
  return String(x.client ?? x.name ?? '');
}

function changes(r: AuditRow) {
  if (r.action !== 'update' || !r.old || !r.new) return '';
  const keys = Object.keys(r.new).filter(k => k !== 'updated_at' && JSON.stringify(r.new![k]) !== JSON.stringify(r.old![k]));
  const show = (k: string, v: unknown) => (k === 'pay' ? ({ paid: '✓', pending: '✕', credit: '+' } as Record<string, string>)[String(v)] ?? '' : k === 'status' ? String(v) : typeof v === 'number' ? money(v) : '');
  return keys.map(k => { const a = show(k, r.old![k]), b = show(k, r.new![k]); return (FIELD[k] ?? k) + (a || b ? ` ${a || '–'}→${b || '–'}` : ''); }).join(', ');
}

/** Registro de actividad: quién anotó, cambió o borró qué (solo dueño y admin). */
function Activity({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [error, setError] = useState('');
  const [who, setWho] = useState('');
  useEffect(() => {
    void sb?.from('audit').select('*').order('at', { ascending: false }).limit(300)
      .then(({ data, error: e }) => { if (e) setError(e.message.includes('audit') ? 'Falta correr supabase/equipo.sql en Supabase.' : e.message); else setRows(data as AuditRow[]); });
  }, []);
  const people = [...new Set((rows ?? []).map(r => r.email ?? '—'))];
  const shown = (rows ?? []).filter(r => !who || (r.email ?? '—') === who);
  return (
    <Sheet onClose={onClose} label="Actividad" className="activity-sheet">
      <h2>Actividad</h2>
      <p className="muted small">Quién anotó, cambió o borró qué. Solo lo ven dueño y admin; nadie lo puede editar.</p>
      {people.length > 1 && (
        <div className="row">
          <button className={'chip' + (!who ? ' on' : '')} onClick={() => setWho('')}>todos</button>
          {people.map(p => <button key={p} className={'chip' + (who === p ? ' on' : '')} onClick={() => setWho(p)}>{p.split('@')[0]}</button>)}
        </div>
      )}
      {error ? <p className="gate-msg">{error}</p> : !rows ? <p className="muted">Cargando…</p> : (
        <ul className="activity">
          {shown.map(r => (
            <li key={r.id} className={r.action}>
              <time>{new Date(r.at).toLocaleString('es-CR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
              <span><b>{(r.email ?? 'sistema').split('@')[0]}</b> {VERB[r.action]} {TBL[r.tbl] ?? r.tbl}: {what(r)}{changes(r) && <small> · {changes(r)}</small>}</span>
            </li>
          ))}
          {!shown.length && <li className="muted">Sin actividad todavía.</li>}
        </ul>
      )}
    </Sheet>
  );
}

interface BackupRow { id: number; at: string; kind: string; size: number }

const fileName = (at: string) => `divine-circle-${at.slice(0, 10)}.json`;
function download(name: string, data: unknown) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Respaldos: los automáticos de la nube (uno por día, 35 días) y los de este dispositivo. */
function Backups({ onClose, onExport, onImport }: { onClose: () => void; onExport: () => void; onImport: () => void }) {
  const toast = useToast();
  const [rows, setRows] = useState<BackupRow[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => void sb?.from('backups').select('id,at,kind,size').order('at', { ascending: false }).limit(60)
    .then(({ data, error: e }) => { if (e) setError(e.message.includes('backups') ? 'Falta correr supabase/respaldos.sql en Supabase.' : e.message); else setRows(data as BackupRow[]); });
  useEffect(load, []);

  async function now() {
    setBusy(true);
    const { error: e } = await sb!.rpc('take_backup', { p_kind: 'manual' });
    setBusy(false);
    if (e) return toast(e.message);
    toast('Respaldo guardado en la nube');
    load();
  }

  async function get(r: BackupRow) {
    const { data, error: e } = await sb!.from('backups').select('data').eq('id', r.id).single();
    if (e || !data) return toast(e?.message ?? 'No se pudo descargar');
    download(fileName(r.at), backupToState((data as { data: Record<string, unknown> }).data));
  }

  const last = rows?.[0];
  const fresh = last && Date.now() - new Date(last.at).getTime() < 36 * 3600e3;
  return (
    <Sheet onClose={onClose} label="Respaldos" className="activity-sheet">
      <h2>Respaldos</h2>
      <p className="muted small">Cada madrugada (3:00) la nube guarda una copia completa y la conserva 35 días. Puedes descargar cualquiera; para recuperar algo borrado, descárgalo y usa <b>cargar archivo</b>.</p>
      {error ? <p className="gate-msg">{error}</p> : rows && (
        <p className={fresh ? 'ok-text' : 'gate-msg'}>{last ? `Último: ${new Date(last.at).toLocaleString('es-CR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Todavía no hay respaldos en la nube.'}{last && !fresh ? ' — hace más de un día: revisa que pg_cron esté activo.' : ''}</p>
      )}
      <div className="row">
        <button className="btn-inline" disabled={busy} onClick={now}>{busy ? 'Guardando…' : 'Respaldar ahora'}</button>
        <button className="btn-inline ghost" onClick={onExport}>Descargar este dispositivo</button>
        <button className="btn-inline ghost" onClick={onImport}>Cargar archivo</button>
      </div>
      {rows && rows.length > 0 && (
        <ul className="activity">
          {rows.map(r => (
            <li key={r.id}>
              <time>{new Date(r.at).toLocaleString('es-CR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
              <span className="backup-row">{r.kind === 'manual' ? 'a mano' : 'automático'} · {Math.max(1, Math.round(r.size / 1024))} KB
                <button className="link" onClick={() => get(r)}>descargar</button></span>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
