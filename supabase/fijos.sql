-- Divine Circle: pedidos fijos (semanales). Una sentencia por linea. Pegar todo y Run, despues de setup.sql y seguridad.sql.
create table if not exists public.recurring ( id uuid primary key, client text not null, client_id text references public.clients on delete set null, items jsonb not null default '[]'::jsonb, weekdays integer[] not null default '{}', every integer not null default 1 check (every in (1, 2)), start date not null, until date, pay text not null default 'pending' check (pay in ('paid', 'pending', 'credit')), note text, active boolean not null default true, skips text[] not null default '{}', created_at timestamptz not null default now() );
alter table public.orders add column if not exists recurring_id uuid;
create index if not exists orders_recurring_idx on public.orders (recurring_id, date);
alter table public.recurring enable row level security;
drop policy if exists "recurring: solo equipo" on public.recurring;
create policy "recurring: solo equipo" on public.recurring for all using (public.is_member()) with check (public.is_member());
