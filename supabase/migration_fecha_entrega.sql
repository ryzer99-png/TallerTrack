-- ============================================================================
-- Teleradio - Migración: Registro automático de Fecha de Entrega
-- ============================================================================
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
-- ============================================================================

alter table public.ordenes
  add column if not exists fecha_entrega timestamptz;

create index if not exists idx_ordenes_fecha_entrega
  on public.ordenes (fecha_entrega desc)
  where estado = 'Entregado';

-- Trigger automático: registra `fecha_entrega` al pasar a 'Entregado'
-- y la limpia si reingresa al taller por garantía.
create or replace function public.registrar_fecha_entrega()
returns trigger
language plpgsql
as $$
begin
  if new.estado = 'Entregado' and (old.estado is distinct from 'Entregado') then
    new.fecha_entrega := coalesce(new.fecha_entrega, now());
  elsif new.estado <> 'Entregado' and old.estado = 'Entregado' then
    new.fecha_entrega := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_registrar_fecha_entrega on public.ordenes;
create trigger trg_registrar_fecha_entrega
  before update on public.ordenes
  for each row
  execute function public.registrar_fecha_entrega();

-- Backfill para órdenes ya entregadas previamente
update public.ordenes
set fecha_entrega = coalesce(fecha_entrega, fecha_ingreso)
where estado = 'Entregado'
  and fecha_entrega is null;

