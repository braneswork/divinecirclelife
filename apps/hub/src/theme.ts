export type Theme = 'auto' | 'light' | 'dark';
const KEY = 'dc-theme';

export function getTheme(): Theme {
  try { return (localStorage.getItem(KEY) as Theme) || 'auto'; } catch { return 'auto'; }
}

export function setTheme(t: Theme) {
  try { localStorage.setItem(KEY, t); } catch { /* preferencia por dispositivo, no crítica */ }
  applyTheme(t);
}

export function applyTheme(t: Theme = getTheme()) {
  const root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
}
