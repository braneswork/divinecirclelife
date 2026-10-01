/* Proyecto de Supabase de Divine Circle.
   La clave anon es pública por diseño (va dentro de la web y del hub); lo que
   protege los datos son las reglas RLS de supabase/migrations. Nunca poner aquí
   la service_role key. Se puede reemplazar con VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. */

export const SUPABASE_URL = 'https://vbeubyipzzpfbdjswavh.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiZXVieWlwenpwZmJkanN3YXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NTIxNDcsImV4cCI6MjEwNDIyODE0N30.Ps9Fgqvs5zoA3aBicanGbnlK-8IVSxkDtP78adk72vM';
