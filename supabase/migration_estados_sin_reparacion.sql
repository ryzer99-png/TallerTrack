-- ============================================================================
-- Teleradio - Agregar estados "Sin Reparación" y "Sin Falla"
-- ============================================================================
-- Ejecutar este script una sola vez en Supabase -> SQL Editor.
-- ============================================================================

alter table public.ordenes
  drop constraint if exists ordenes_estado_check;

alter table public.ordenes
  add constraint ordenes_estado_check
  check (
    estado in (
      'Recibido',
      'En Revisión',
      'Por Aprobar',
      'Reparado',
      'Sin Reparación',
      'Sin Falla',
      'Entregado'
    )
  );
