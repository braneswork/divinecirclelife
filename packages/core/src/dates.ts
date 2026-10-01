/* Fechas como texto local YYYY-MM-DD: sin zonas horarias de por medio. */

export const pad = (n: number) => String(n).padStart(2, '0');

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromISODate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (iso: string, n: number) => {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
};

export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "hoy", "mañana", "ayer" o "viernes 3 oct" */
export function dayLabel(iso: string, today: string): string {
  if (iso === today) return 'Hoy';
  if (iso === addDays(today, 1)) return 'Mañana';
  if (iso === addDays(today, -1)) return 'Ayer';
  const d = fromISODate(iso);
  const dia = DIAS[d.getDay()];
  return `${dia[0].toUpperCase()}${dia.slice(1)} ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
}
