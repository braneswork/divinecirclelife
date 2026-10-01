/* Lo que la web muestra: ofertas públicas y proyectos activos.
   Sin Supabase todavía, usa la semilla del catálogo para poder diseñar. */

import { useEffect, useState } from 'react';
import { SEED_OFFERINGS, SEED_PROJECTS, type Offering, type Project } from '@dc/core';
import { sb } from './supabase';

const camel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const fromRow = <T,>(row: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [camel(k), v ?? undefined])) as T;

export function useCircle() {
  const [offerings, setOfferings] = useState<Offering[]>(SEED_OFFERINGS.filter(o => o.public));
  const [projects, setProjects] = useState<Project[]>(SEED_PROJECTS);

  useEffect(() => {
    if (!sb) return;
    sb.from('offerings').select('*').eq('active', true).eq('public', true).order('price')
      .then(({ data }) => data && setOfferings(data.map(r => fromRow<Offering>(r))));
    sb.from('projects').select('*').eq('active', true)
      .then(({ data }) => data && setProjects(data.map(r => fromRow<Project>(r))));
  }, []);

  return { offerings, projects };
}

export async function placeOrder(input: {
  client: string; phone: string; date: string; lines: { code: string; qty: number }[]; note?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!sb) return { ok: false, message: 'Los pedidos en línea abren pronto.' };
  const { error } = await sb.rpc('place_web_order', {
    p_client: input.client, p_phone: input.phone, p_date: input.date,
    p_lines: input.lines, p_note: input.note ?? null,
  });
  return error ? { ok: false, message: error.message } : { ok: true };
}
