-- ============================================================================
-- Teleradio - Migración: Clientes y Equipos por Cliente (1:N)
-- ============================================================================
-- Ejecutar en el SQL Editor de Supabase sobre una base de datos existente.
-- Es idempotente: puedes ejecutarlo sin perder órdenes actuales.
-- ============================================================================

-- 1. Tabla de Clientes (identificados por teléfono normalizado)
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text not null,
  telefono_normalizado text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clientes_nombre
  on public.clientes using gin (to_tsvector('spanish', nombre));

create index if not exists idx_clientes_telefono_norm
  on public.clientes (telefono_normalizado);

-- 2. Tabla de Equipos por Cliente (un cliente puede tener varios aparatos)
create table if not exists public.equipos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  tipo_equipo text not null,
  created_at timestamptz not null default now(),
  unique (cliente_id, tipo_equipo)
);

create index if not exists idx_equipos_cliente_id
  on public.equipos (cliente_id);

-- 3. Vincular `ordenes` con `clientes` y `equipos`
-- Se mantienen `cliente_nombre`, `cliente_telefono` y `tipo_equipo` en `ordenes`
-- como respaldo histórico del ticket impreso.
alter table public.ordenes
  add column if not exists cliente_id uuid references public.clientes(id) on delete set null,
  add column if not exists equipo_id uuid references public.equipos(id) on delete set null;

create index if not exists idx_ordenes_cliente_id
  on public.ordenes (cliente_id, fecha_ingreso desc);

create index if not exists idx_ordenes_equipo_id
  on public.ordenes (equipo_id, fecha_ingreso desc);

-- 4. Función auxiliar para normalizar teléfono (solo dígitos)
create or replace function public.normalizar_telefono(raw_phone text)
returns text
language sql
immutable
as $$
  select right(regexp_replace(coalesce(raw_phone, ''), '\D', '', 'g'), 10);
$$;

-- 5. Trigger automático al crear una orden:
-- Busca o crea el cliente por teléfono y registra el equipo en su historial.
create or replace function public.vincular_cliente_y_equipo_en_orden()
returns trigger
language plpgsql
as $$
declare
  v_tel_norm text;
  v_cliente_id uuid;
  v_equipo_id uuid;
begin
  v_tel_norm := public.normalizar_telefono(new.cliente_telefono);

  if new.cliente_id is null and v_tel_norm <> '' then
    insert into public.clientes (nombre, telefono, telefono_normalizado)
    values (trim(new.cliente_nombre), trim(new.cliente_telefono), v_tel_norm)
    on conflict (telefono_normalizado) do update
      set nombre = excluded.nombre,
          telefono = excluded.telefono,
          updated_at = now()
    returning id into v_cliente_id;

    new.cliente_id := v_cliente_id;
  end if;

  if new.equipo_id is null and new.cliente_id is not null and coalesce(trim(new.tipo_equipo), '') <> '' then
    insert into public.equipos (cliente_id, tipo_equipo)
    values (new.cliente_id, trim(new.tipo_equipo))
    on conflict (cliente_id, tipo_equipo) do nothing;

    select id into v_equipo_id
    from public.equipos
    where cliente_id = new.cliente_id
      and tipo_equipo = trim(new.tipo_equipo)
    limit 1;

    new.equipo_id := v_equipo_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_vincular_cliente_equipo on public.ordenes;
create trigger trg_vincular_cliente_equipo
  before insert on public.ordenes
  for each row
  execute function public.vincular_cliente_y_equipo_en_orden();

-- 6. Migrar órdenes existentes para poblar `clientes` y `equipos`
do $$
declare
  r record;
  v_tel_norm text;
  v_cid uuid;
  v_eid uuid;
begin
  for r in
    select id, cliente_nombre, cliente_telefono, tipo_equipo
    from public.ordenes
    where cliente_id is null or equipo_id is null
    order by fecha_ingreso asc
  loop
    v_tel_norm := public.normalizar_telefono(r.cliente_telefono);
    if v_tel_norm <> '' then
      insert into public.clientes (nombre, telefono, telefono_normalizado)
      values (trim(r.cliente_nombre), trim(r.cliente_telefono), v_tel_norm)
      on conflict (telefono_normalizado) do update
        set nombre = excluded.nombre,
            telefono = excluded.telefono,
            updated_at = now()
      returning id into v_cid;

      insert into public.equipos (cliente_id, tipo_equipo)
      values (v_cid, trim(r.tipo_equipo))
      on conflict (cliente_id, tipo_equipo) do nothing;

      select id into v_eid
      from public.equipos
      where cliente_id = v_cid
        and tipo_equipo = trim(r.tipo_equipo)
      limit 1;

      update public.ordenes
      set cliente_id = coalesce(cliente_id, v_cid),
          equipo_id = coalesce(equipo_id, v_eid)
      where id = r.id;
    end if;
  end loop;
end $$;

-- 7. Políticas RLS para `clientes` y `equipos`
alter table public.clientes enable row level security;
alter table public.equipos enable row level security;

drop policy if exists "Permitir lectura de clientes" on public.clientes;
create policy "Permitir lectura de clientes"
  on public.clientes for select to anon, authenticated using (true);

drop policy if exists "Permitir crear clientes" on public.clientes;
create policy "Permitir crear clientes"
  on public.clientes for insert to anon, authenticated with check (true);

drop policy if exists "Permitir actualizar clientes" on public.clientes;
create policy "Permitir actualizar clientes"
  on public.clientes for update to anon, authenticated using (true) with check (true);

drop policy if exists "Permitir lectura de equipos" on public.equipos;
create policy "Permitir lectura de equipos"
  on public.equipos for select to anon, authenticated using (true);

drop policy if exists "Permitir crear equipos" on public.equipos;
create policy "Permitir crear equipos"
  on public.equipos for insert to anon, authenticated with check (true);

