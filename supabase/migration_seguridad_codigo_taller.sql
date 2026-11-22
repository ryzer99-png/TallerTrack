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

-- 2. RPC para validar el código de acceso ingresado desde un dispositivo
create or replace function public.validar_codigo_taller(codigo_ingresado text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_code text;
begin
  v_code := trim(coalesce(codigo_ingresado, ''));
  if v_code = '' then
    return false;
  end if;

  return exists (
    select 1
    from public.configuracion_taller
    where activo = true
      and case
        when clave_acceso like '$2%' then clave_acceso = crypt(v_code, clave_acceso)
        else clave_acceso = v_code
      end
  );
end;
$$;

revoke all on function public.validar_codigo_taller(text) from public;
grant execute on function public.validar_codigo_taller(text) to anon, authenticated;

-- 3. Función auxiliar usada por RLS para validar la cabecera `x-teleradio-key`
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

  return public.validar_codigo_taller(v_key);
end;
$$;

revoke all on function public.es_dispositivo_autorizado() from public;
grant execute on function public.es_dispositivo_autorizado() to anon, authenticated;

-- 4. RPC segura para vista pública de seguimiento por UUID (#/orden?id=...)
-- Omite `cliente_telefono` y nunca expone el listado completo de órdenes.
create or replace function public.obtener_orden_publica(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select (to_jsonb(o) - 'cliente_telefono')
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
