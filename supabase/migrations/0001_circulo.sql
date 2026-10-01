-- Divine Circle · esquema inicial ("el círculo")
--
-- Núcleo (Divine Circle) + anillos de proyectos (aliados como Take Off y Branes,
-- vecinos y emprendimientos aledaños). Cada proyecto tiene ofertas (productos,
-- experiencias, servicios) que la gente pide o reserva desde la web o desde el hub.
--
-- Seguridad:
--   * El equipo (tabla members) lee y escribe todo desde el hub.
--   * El público (anon) solo ve proyectos activos y ofertas públicas, y puede
--     crear pedidos únicamente a través de place_web_order(), que valida códigos
--     y calcula precios en el servidor.

-- ---------------------------------------------------------------- equipo
create table public.members (
  user_id    uuid primary key references auth.users on delete cascade,
  name       text not null default '',
  role       text not null default 'staff' check (role in ('owner', 'admin', 'staff')),
  created_at timestamptz not null default now()
);

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid());
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid() and role in ('owner', 'admin'));
$$;

-- ---------------------------------------------------------------- proyectos del círculo
create table public.projects (
  id         text primary key,
  slug       text not null unique,
  name       text not null,
  ring       text not null check (ring in ('nucleo', 'aliado', 'vecino')),
  branes     boolean not null default false,
  tagline    text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- ofertas
create table public.offerings (
  id         text primary key,
  project_id text not null references public.projects on delete restrict,
  kind       text not null check (kind in ('producto', 'experiencia', 'servicio')),
  code       text not null unique check (code = upper(code) and code <> ''),
  name       text not null,
  price      integer not null default 0 check (price >= 0),
  active     boolean not null default true,
  public     boolean not null default false,
  pillar     text check (pillar in ('essence', 'wisdom', 'imagination', 'movement', 'nature', 'family', 'food')),
  category   text,
  image      text,
  description text,
  unit       text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- clientes
-- billing: contado (paga en cada pedido) o mensual (se factura a fin de mes).
-- discounts: descuento negociado por oferta, {"pan-bb": 0.32, "pan-c": 0.30}.
create table public.clients (
  id         text primary key,
  name       text not null,
  aliases    text[] not null default '{}',
  contact    text,
  phone      text,
  address    text,
  billing    text not null default 'contado' check (billing in ('contado', 'mensual')),
  discounts  jsonb not null default '{}'::jsonb,
  note       text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- pedidos y reservas
-- items es una foto de lo pedido (código, nombre, cantidad, precio unitario) para
-- que cambiar un precio en el catálogo no altere pedidos pasados.
create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  client          text not null,
  client_id       text references public.clients on delete set null,
  invoice_id      uuid,
  phone           text,
  date            date not null,
  items           jsonb not null default '[]'::jsonb,
  amount_override integer check (amount_override >= 0),
  status          text not null default 'pendiente' check (status in ('pendiente', 'horneando', 'listo', 'entregado', 'cancelado')),
  -- marca de pago de Divine: paid ✓ · pending ✕ (no pagó) · credit + (crédito a favor)
  pay             text not null default 'pending' check (pay in ('paid', 'pending', 'credit')),
  note            text,
  source          text not null default 'hub' check (source in ('hub', 'web')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index orders_date_idx on public.orders (date);
create index orders_client_idx on public.orders (client_id, date);

-- ---------------------------------------------------------------- facturas mensuales
create table public.invoices (
  id          uuid primary key,
  number      text not null unique,
  client_id   text not null references public.clients,
  client      text not null,
  period      text not null,
  date        date not null,
  lines       jsonb not null default '[]'::jsonb,
  adjustments jsonb not null default '[]'::jsonb,
  order_ids   uuid[] not null default '{}',
  status      text not null default 'abierta' check (status in ('abierta', 'pagada')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- salidas
create table public.expenses (
  id         uuid primary key,
  date       date not null,
  type       text not null,
  amount     integer not null check (amount >= 0),
  note       text,
  method     text,
  created_at timestamptz not null default now()
);
create index expenses_date_idx on public.expenses (date);

-- ---------------------------------------------------------------- RLS
alter table public.members   enable row level security;
alter table public.projects  enable row level security;
alter table public.offerings enable row level security;
alter table public.orders    enable row level security;
alter table public.clients   enable row level security;
alter table public.invoices  enable row level security;
alter table public.expenses  enable row level security;

create policy "members: cada quien se ve" on public.members
  for select using (user_id = auth.uid() or public.is_member());
create policy "members: admins gestionan" on public.members
  for all using (public.is_admin()) with check (public.is_admin());

create policy "projects: público ve activos" on public.projects
  for select using (active or public.is_member());
create policy "projects: equipo gestiona" on public.projects
  for all using (public.is_member()) with check (public.is_member());

create policy "offerings: público ve publicadas" on public.offerings
  for select using ((active and public) or public.is_member());
create policy "offerings: equipo gestiona" on public.offerings
  for all using (public.is_member()) with check (public.is_member());

create policy "orders: solo equipo" on public.orders
  for all using (public.is_member()) with check (public.is_member());
create policy "clients: solo equipo" on public.clients
  for all using (public.is_member()) with check (public.is_member());
create policy "invoices: solo equipo" on public.invoices
  for all using (public.is_member()) with check (public.is_member());
create policy "expenses: solo equipo" on public.expenses
  for all using (public.is_member()) with check (public.is_member());

-- ---------------------------------------------------------------- pedidos desde la web
-- lines: [{"code": "C", "qty": 2}, ...]
create or replace function public.place_web_order(
  p_client text, p_phone text, p_date date, p_lines jsonb, p_note text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_items jsonb := '[]'::jsonb;
  v_line  jsonb;
  v_off   public.offerings;
  v_qty   integer;
  v_id    uuid;
begin
  if coalesce(trim(p_client), '') = '' then raise exception 'falta el nombre'; end if;
  if p_date < current_date then raise exception 'fecha en el pasado'; end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'pedido vacío';
  end if;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_qty := (v_line ->> 'qty')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 50 then raise exception 'cantidad inválida'; end if;
    select * into v_off from public.offerings
      where code = upper(v_line ->> 'code') and active and public;
    if not found then raise exception 'código no disponible: %', v_line ->> 'code'; end if;
    v_items := v_items || jsonb_build_object(
      'offeringId', v_off.id, 'code', v_off.code, 'name', v_off.name,
      'qty', v_qty, 'unitPrice', v_off.price);
  end loop;

  insert into public.orders (client, phone, date, items, note, source)
  values (left(trim(p_client), 120), left(p_phone, 40), p_date, v_items, left(p_note, 500), 'web')
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.place_web_order(text, text, date, jsonb, text) from public;
grant execute on function public.place_web_order(text, text, date, jsonb, text) to anon, authenticated;

-- ---------------------------------------------------------------- semilla
insert into public.projects (id, slug, name, ring, branes, tagline) values
  ('divine-circle', 'divine-circle', 'Divine Circle', 'nucleo', true, 'Pan de masa madre y experiencias humanas'),
  ('take-off', 'take-off', 'Take Off Surf School', 'aliado', true, 'Clases de surf'),
  ('branes', 'branes', 'Branes', 'aliado', true, 'Coworking y comunidad');

insert into public.offerings (id, project_id, kind, code, name, price, public, pillar, category) values
  ('pan-c',   'divine-circle', 'producto', 'C',   'Campesino',     4000, true, 'food', 'pan'),
  ('pan-ms',  'divine-circle', 'producto', 'MS',  'Multiseeds',    5000, true, 'food', 'pan'),
  ('pan-cu',  'divine-circle', 'producto', 'CU',  'Cuadrado',      4000, true, 'food', 'pan'),
  ('pan-bag', 'divine-circle', 'producto', 'BAG', 'Baguette',      1000, true, 'food', 'pan'),
  ('pan-cr',  'divine-circle', 'producto', 'CR',  'Cinnamon Roll', 1500, true, 'food', 'pan'),
  ('pan-bb',  'divine-circle', 'producto', 'BB',  'Burger Bun',     700, true, 'food', 'pan'),
  ('pan-cia', 'divine-circle', 'producto', 'CIA', 'Ciabatta',      1000, true, 'food', 'pan'),
  ('pan-pz',  'divine-circle', 'producto', 'PZ',  'Pizza',         4000, true, 'food', 'pan'),
  ('pan-pzf', 'divine-circle', 'producto', 'PZF', 'Pizza Frozen',  3000, true, 'food', 'pan');

insert into public.clients (id, name, aliases, contact, address, billing, discounts) values
  ('mantarraya', 'Mantarraya Café', '{mantarraya,manta}', 'Pilo Mora', 'Playa Hermosa', 'mensual', '{"pan-bb": 0.32, "pan-c": 0.30}'),
  ('chez-coco', 'Chez Coco', '{}', 'Nico', null, 'contado', '{}'),
  ('batik', 'Batik', '{}', 'Sammy', null, 'contado', '{}'),
  ('take-off', 'Take Off', '{}', 'Jesus Zabala', null, 'contado', '{}'),
  ('traveland', 'Traveland', '{}', 'Erick Vega', null, 'contado', '{}'),
  ('villas-argan', 'Villas Argan', '{}', 'Azzurra Daga', null, 'contado', '{}');
