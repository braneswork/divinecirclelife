-- Divine Circle: respaldo automatico diario dentro de Supabase (se guardan 35 dias). Una sentencia por linea. Pegar todo y Run, despues de equipo.sql.
create table if not exists public.backups ( id bigserial primary key, at timestamptz not null default now(), kind text not null default 'auto', size integer not null default 0, data jsonb not null );
create index if not exists backups_at_idx on public.backups (at desc);
alter table public.backups enable row level security;
revoke all on public.backups from anon, authenticated;
grant select on public.backups to authenticated;
drop policy if exists "backups: admins leen" on public.backups;
create policy "backups: admins leen" on public.backups for select using (public.is_admin());
create or replace function public.take_backup(p_kind text default 'auto') returns bigint language plpgsql security definer set search_path = public as $$ declare v_data jsonb; v_id bigint; begin if auth.uid() is not null and not public.is_admin() then raise exception 'solo dueno o admin'; end if; v_data := jsonb_build_object('version', 1, 'at', now(), 'projects', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.projects t), 'offerings', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.offerings t), 'clients', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.clients t), 'recurring', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.recurring t), 'orders', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.orders t), 'invoices', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.invoices t), 'expenses', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.expenses t), 'members', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.members t)); insert into public.backups (kind, size, data) values (case when p_kind = 'manual' then 'manual' else 'auto' end, length(v_data::text), v_data) returning id into v_id; delete from public.backups where at < now() - interval '35 days'; delete from public.audit where at < now() - interval '400 days'; return v_id; end; $$;
revoke all on function public.take_backup(text) from public;
grant execute on function public.take_backup(text) to authenticated;
-- Todos los dias a las 3:00 de Costa Rica (9:00 UTC). Requiere la extension pg_cron (Database -> Extensions), esta linea la activa.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('divine-circle-respaldo', '0 9 * * *', 'select public.take_backup(''auto'')');
select public.take_backup('auto');
