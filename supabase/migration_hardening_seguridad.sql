-- ============================================================================
-- Teleradio - Migración: Hardening de Seguridad (Rate-Limit + Mínimos Datos)
-- ============================================================================
-- Ejecutar en Supabase -> SQL Editor. Es idempotente.
-- ============================================================================

-- 1. Tabla privada para control de intentos fallidos por IP (inaccesible vía PostgREST)
create table if not exists public.auth_intentos (
  id bigint generated always as identity primary key,
  ip text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_intentos_ip_created
  on public.auth_intentos (ip, created_at desc);

alter table public.auth_intentos enable row level security;
-- Sin políticas para anon/authenticated: inaccesible directamente desde la API.

-- 2. `es_dispositivo_autorizado()` debe ser estrictamente STABLE (solo lectura)
-- porque PostgREST ejecuta peticiones GET/SELECT dentro de transacciones read-only.
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

-- 3. `validar_codigo_taller(codigo_ingresado text)` con rate limiting (10 intentos / 15 min por IP)
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

-- 4. Minimizar campos devueltos por `obtener_orden_publica(p_id uuid)`
-- Omite cliente_telefono, cliente_id, equipo_id, tecnico_id, impresa, prioridad y tiempo_estimado_entrega.
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
