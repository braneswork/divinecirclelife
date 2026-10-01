/* La puerta del hub: sin sesión no se ve nada.
   - Acceso con el correo: llega un código de 6 dígitos (y un enlace). El código
     sirve también en la app instalada, donde el enlace se abriría en otro navegador.
   - Con sesión pero fuera del equipo: "sin acceso".
   - Sin señal: si este dispositivo ya tenía sesión y rol, se puede seguir trabajando. */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import logo from '@dc/brand/assets/logo-light.png';
import mark from '@dc/brand/assets/mark.png';
import { sb } from '../supabase';
import { claimRole } from '../sync';
import { signOutAndClear } from './session';

type Phase = 'cargando' | 'fuera' | 'sin-acceso' | 'dentro';
const ROLE_KEY = 'dc-role';
const ok = (r: string) => r === 'owner' || r === 'admin' || r === 'staff';

function cachedRole(userId: string) {
  try { const c = JSON.parse(localStorage.getItem(ROLE_KEY) ?? 'null'); return c?.user === userId ? (c.role as string) : null; } catch { return null; }
}
function cacheRole(userId: string, role: string) {
  try { localStorage.setItem(ROLE_KEY, JSON.stringify({ user: userId, role })); } catch { /* sin storage */ }
}

export function Gate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('cargando');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!sb) { setPhase('fuera'); return; }
    const decide = async (s: Session | null) => {
      setSession(s);
      if (!s) return setPhase('fuera');
      const role = await claimRole();
      if (ok(role)) { cacheRole(s.user.id, role); return setPhase('dentro'); }
      if (role === 'error' && ok(cachedRole(s.user.id) ?? '')) return setPhase('dentro'); // sin señal
      setPhase(role === 'error' ? 'fuera' : 'sin-acceso');
    };
    sb.auth.getSession().then(({ data }) => decide(data.session));
    const { data } = sb.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') void decide(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (phase === 'dentro') return <>{children}</>;
  return (
    <div className="gate">
      <img src={logo} alt="Divine Circle" className="gate-logo" />
      {phase === 'cargando' && <div className="gate-orb loading"><img src={mark} alt="" /></div>}
      {phase === 'fuera' && <Login />}
      {phase === 'sin-acceso' && (
        <div className="gate-card">
          <div className="gate-orb"><img src={mark} alt="" /></div>
          <h1>Sin acceso</h1>
          <p>Entraste como <b>{session?.user.email}</b>, pero esta cuenta no es parte del equipo de Divine Circle.</p>
          <p className="muted">Pide al dueño que te agregue desde Ajustes → Equipo, y vuelve a entrar.</p>
          <button className="gate-btn ghost" onClick={() => signOutAndClear(false)}>Salir</button>
        </div>
      )}
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'correo' | 'codigo'>('correo');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!wait) return;
    const t = setTimeout(() => setWait(w => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return setMsg('Escribe un correo válido');
    setBusy(true); setMsg('');
    const { error } = await sb!.auth.signInWithOtp({ email: clean, options: { emailRedirectTo: location.origin + location.pathname } });
    setBusy(false);
    if (error) {
      setMsg(/rate|seconds|security purposes/i.test(error.message) ? 'Espera un momento antes de pedir otro código.' : /signups not allowed|not allowed/i.test(error.message) ? 'Esta cuenta no está habilitada.' : 'No se pudo enviar el código. Revisa tu conexión.');
      return;
    }
    setStep('codigo'); setWait(60); setCode('');
    setTimeout(() => codeRef.current?.focus(), 50);
  }

  async function verify(value = code) {
    if (value.length !== 6) return;
    setBusy(true); setMsg('');
    const { error } = await sb!.auth.verifyOtp({ email: email.trim().toLowerCase(), token: value, type: 'email' });
    setBusy(false);
    if (error) { setMsg('Código incorrecto o vencido.'); setCode(''); codeRef.current?.focus(); }
  }

  return (
    <div className="gate-card">
      <div className={'gate-orb' + (busy ? ' loading' : '')}><img src={mark} alt="" /></div>
      <h1>Hub</h1>
      {step === 'correo' ? (
        <form onSubmit={send} className="gate-form">
          <label htmlFor="gate-email" className="eyebrow">Correo</label>
          <input id="gate-email" type="email" inputMode="email" autoComplete="email" autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" />
          <button className="gate-btn" disabled={busy}>Enviar código</button>
        </form>
      ) : (
        <form className="gate-form" onSubmit={e => { e.preventDefault(); void verify(); }}>
          <p className="muted">Te enviamos un código de 6 dígitos a <b>{email.trim().toLowerCase()}</b>. También puedes abrir el enlace del correo en este mismo navegador.</p>
          <label className="code-circles" htmlFor="gate-code">
            {Array.from({ length: 6 }, (_, i) => <span key={i} className={i < code.length ? 'on' : ''}>{code[i] ?? ''}</span>)}
            <input
              id="gate-code" ref={codeRef} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} aria-label="Código de 6 dígitos"
              onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setCode(v); if (v.length === 6) void verify(v); }}
            />
          </label>
          <button className="gate-btn" disabled={busy || code.length !== 6}>Entrar</button>
          <div className="gate-row">
            <button type="button" className="gate-link" onClick={() => { setStep('correo'); setMsg(''); }}>Cambiar correo</button>
            <button type="button" className="gate-link" disabled={wait > 0 || busy} onClick={() => send()}>{wait ? `Reenviar en ${wait}s` : 'Reenviar código'}</button>
          </div>
        </form>
      )}
      {msg && <p className="gate-msg" role="alert">{msg}</p>}
    </div>
  );
}
