-- ============================================================================
-- Teleradio - Migración de Seguridad: Autorización por Código de Taller
-- ============================================================================
-- Ejecutar este script una sola vez en Supabase -> SQL Editor.
-- Es idempotente y reemplaza las políticas abiertas por validación de cabecera
-- `x-teleradio-key`.
--
-- NOTA IMPORTANTE ANTES DE EJECUTAR:
-- Cambia 'TELERADIO-2026' abajo por tu código secreto real antes de ejecutar.
-- Para rotar la clave en el futuro:
--   update public.configuracion_taller set activo = false;
--   insert into public.configuracion_taller (etiqueta, clave_acceso, activo)
--   values ('Nueva clave taller', extensions.crypt('TU-NUEVA-CLAVE', extensions.gen_salt('bf')), true);
-- ============================================================================

create extension if not exists pgcrypto;

-- 1. Tabla de claves de autorización del taller (no expuesta a consultas directas)
create table if not exists public.configuracion_taller (
  id uuid primary key default gen_random_uuid(),
  etiqueta text not null default 'Clave principal del taller',
  clave_acceso text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.configuracion_taller enable row level security;

drop policy if exists "Bloquear acceso directo a configuracion_taller" on public.configuracion_taller;
-- Sin políticas para anon/authenticated: PostgREST rechaza cualquier SELECT/INSERT/UPDATE/DELETE directo.

-- Semilla inicial (solo si la tabla está vacía)
insert into public.configuracion_taller (etiqueta, clave_acceso, activo)
select
  'Clave principal del taller',
  extensions.crypt('TELERADIO-2026', extensions.gen_salt('bf')),
  true
where not exists (select 1 from public.configuracion_taller);

-- 2. Tabla privada para control de intentos fallidos por IP (inaccesible vía PostgREST)
create table if not exists public.auth_intentos (
  id bigint generated always as identity primary key,
  ip text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_intentos_ip_created
  on public.auth_intentos (ip, created_at desc);

alter table public.auth_intentos enable row level security;

-- 3. RPC para validar el código de acceso ingresado desde un dispositivo (con rate limit por IP)
create or replace function public.validar_codigo_taller(codigo_ingresado text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_code text;
  v_headers json;
  v_ip text;
  v_attempts integer;
  v_valid boolean;
begin
  v_code := trim(coalesce(codigo_ingresado, ''));
  if v_code = '' then
    return false;
  end if;

  v_headers := nullif(current_setting('request.headers', true), '')::json;
  v_ip := coalesce(
    nullif(trim(coalesce(v_headers ->> 'cf-connecting-ip', '')), ''),
    nullif(trim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)), ''),
    'unknown'
  );

  select count(*) into v_attempts
  from public.auth_intentos
  where ip = v_ip
    and created_at > now() - interval '15 minutes';

  if v_attempts >= 10 then
    raise exception 'Demasiados intentos fallidos. Espera 15 minutos e intenta nuevamente.'
      using errcode = 'P0001';
  end if;

  select exists (
    select 1
    from public.configuracion_taller
    where activo = true
      and case
        when clave_acceso like '$2%' then clave_acceso = crypt(v_code, clave_acceso)
        else clave_acceso = v_code
      end
  ) into v_valid;

  if v_valid then
    delete from public.auth_intentos where ip = v_ip;
    return true;
  end if;

  insert into public.auth_intentos (ip) values (v_ip);
  delete from public.auth_intentos where created_at < now() - interval '24 hours';

  return false;
end;
$$;

revoke all on function public.validar_codigo_taller(text) from public;
grant execute on function public.validar_codigo_taller(text) to anon, authenticated;

-- 4. Función auxiliar STABLE (solo lectura) usada por RLS para validar la cabecera `x-teleradio-key`
create or replace function public.es_dispositivo_autorizado()
returns boolean
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_headers json;
  v_key text;
begin
  v_headers := nullif(current_setting('request.headers', true), '')::json;
  if v_headers is null then
    return false;
  end if;

  v_key := trim(coalesce(v_headers ->> 'x-teleradio-key', ''));
  if v_key = '' then
    return false;
  end if;

  return exists (
    select 1
    from public.configuracion_taller
    where activo = true
      and case
        when clave_acceso like '$2%' then clave_acceso = crypt(v_key, clave_acceso)
        else clave_acceso = v_key
      end
  );
end;
$$;

revoke all on function public.es_dispositivo_autorizado() from public;
grant execute on function public.es_dispositivo_autorizado() to anon, authenticated;

-- 5. RPC segura para vista pública de seguimiento por UUID (#/orden?id=...)
-- Solo devuelve campos públicos necesarios; omite teléfono e IDs internos.
create or replace function public.obtener_orden_publica(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', o.id,
    'numero_orden', o.numero_orden,
    'fecha_ingreso', o.fecha_ingreso,
    'fecha_entrega', to_jsonb(o) -> 'fecha_entrega',
    'cliente_nombre', o.cliente_nombre,
    'tipo_equipo', o.tipo_equipo,
    'accesorios', o.accesorios,
    'falla_reportada', o.falla_reportada,
    'observaciones', o.observaciones,
    'estado', o.estado,
    'costo_estimado', o.costo_estimado
  )
  from public.ordenes o
  where o.id = p_id
  limit 1;
$$;

revoke all on function public.obtener_orden_publica(uuid) from public;
grant execute on function public.obtener_orden_publica(uuid) to anon, authenticated;

-- 5. Endurecer políticas RLS en `public.ordenes`
drop policy if exists "Permitir lectura de ordenes" on public.ordenes;
create policy "Permitir lectura de ordenes"
  on public.ordenes
  for select
  to anon, authenticated
  using (public.es_dispositivo_autorizado());

drop policy if exists "Permitir crear ordenes" on public.ordenes;
create policy "Permitir crear ordenes"
  on public.ordenes
  for insert
  to anon, authenticated
  with check (public.es_dispositivo_autorizado());

drop policy if exists "Permitir actualizar ordenes" on public.ordenes;
create policy "Permitir actualizar ordenes"
  on public.ordenes
  for update
  to anon, authenticated
  using (public.es_dispositivo_autorizado())
  with check (public.es_dispositivo_autorizado());

-- 6. Endurecer políticas RLS en tablas auxiliares si existen (`tecnicos`, `clientes`, `equipos`)
do $$
begin
  if to_regclass('public.tecnicos') is not null then
    execute 'drop policy if exists "Permitir lectura de tecnicos" on public.tecnicos';
    execute 'create policy "Permitir lectura de tecnicos" on public.tecnicos for select to anon, authenticated using (public.es_dispositivo_autorizado())';

    execute 'drop policy if exists "Permitir crear tecnicos" on public.tecnicos';
    execute 'create policy "Permitir crear tecnicos" on public.tecnicos for insert to anon, authenticated with check (public.es_dispositivo_autorizado())';

    execute 'drop policy if exists "Permitir actualizar tecnicos" on public.tecnicos';
    execute 'create policy "Permitir actualizar tecnicos" on public.tecnicos for update to anon, authenticated using (public.es_dispositivo_autorizado()) with check (public.es_dispositivo_autorizado())';
  end if;

  if to_regclass('public.clientes') is not null then
    execute 'drop policy if exists "Permitir lectura de clientes" on public.clientes';
    execute 'create policy "Permitir lectura de clientes" on public.clientes for select to anon, authenticated using (public.es_dispositivo_autorizado())';

    execute 'drop policy if exists "Permitir crear clientes" on public.clientes';
    execute 'create policy "Permitir crear clientes" on public.clientes for insert to anon, authenticated with check (public.es_dispositivo_autorizado())';

    execute 'drop policy if exists "Permitir actualizar clientes" on public.clientes';
    execute 'create policy "Permitir actualizar clientes" on public.clientes for update to anon, authenticated using (public.es_dispositivo_autorizado()) with check (public.es_dispositivo_autorizado())';
  end if;

  if to_regclass('public.equipos') is not null then
    execute 'drop policy if exists "Permitir lectura de equipos" on public.equipos';
    execute 'create policy "Permitir lectura de equipos" on public.equipos for select to anon, authenticated using (public.es_dispositivo_autorizado())';

    execute 'drop policy if exists "Permitir crear equipos" on public.equipos';
    execute 'create policy "Permitir crear equipos" on public.equipos for insert to anon, authenticated with check (public.es_dispositivo_autorizado())';
  end if;
end $$;
