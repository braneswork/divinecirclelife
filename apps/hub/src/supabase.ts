import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** null mientras no exista el proyecto nuevo de Supabase: el hub funciona solo en el dispositivo. */
export const sb: SupabaseClient | null = url && key ? createClient(url, key) : null;
