-- ============================================================================
-- Teleradio - Migración: Gestión de Técnicos y Control de Pendientes
-- ============================================================================
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
-- ============================================================================

-- 1. Tabla de Técnicos
create table if not exists public.tecnicos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  color text not null default '#1d4ed8',
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Columnas en `ordenes` para asignación, prioridad y entrega estimada
alter table public.ordenes
  add column if not exists tecnico_id uuid references public.tecnicos(id) on delete set null,
  add column if not exists prioridad text not null default 'Normal'
    check (prioridad in ('Normal', 'Urgente / Garantía')),
  add column if not exists tiempo_estimado_entrega timestamptz;

create index if not exists idx_ordenes_tecnico_id
  on public.ordenes (tecnico_id, estado);

create index if not exists idx_ordenes_prioridad
  on public.ordenes (prioridad);

-- 3. Técnicos iniciales de ejemplo (solo si la tabla está vacía)
insert into public.tecnicos (nombre, color, activo)
select nombre, color, activo
from (
  values
    ('Papá', '#1d4ed8', true),
    ('Técnico 2', '#0f766e', true),
    ('Técnico 3', '#7c3aed', true)
) as seed(nombre, color, activo)
where not exists (select 1 from public.tecnicos);

-- 4. Habilitar Realtime en `tecnicos`
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tecnicos'
  ) then
    alter publication supabase_realtime add table public.tecnicos;
  end if;
end $$;

-- 5. Políticas RLS para `tecnicos`
alter table public.tecnicos enable row level security;

drop policy if exists "Permitir lectura de tecnicos" on public.tecnicos;
create policy "Permitir lectura de tecnicos"
  on public.tecnicos for select to anon, authenticated using (true);

drop policy if exists "Permitir crear tecnicos" on public.tecnicos;
create policy "Permitir crear tecnicos"
  on public.tecnicos for insert to anon, authenticated with check (true);

drop policy if exists "Permitir actualizar tecnicos" on public.tecnicos;
create policy "Permitir actualizar tecnicos"
  on public.tecnicos for update to anon, authenticated using (true) with check (true);
