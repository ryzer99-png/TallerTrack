-- ============================================================================
-- Teleradio Desk - Datos de Prueba Visual (28 órdenes variadas)
-- ============================================================================
-- Ejecutar en el SQL Editor de Supabase para probar:
--   - Paginación (3 páginas en Órdenes, 4 columnas en Pendientes, módulo Entregados)
--   - Semáforo de antigüedad (Hoy, 1 día, 3 días, 6 días, 9 días)
--   - Asignación a técnicos (Rogelio, Juan David, David Antonio, David Andres, Cristian + Sin Asignar)
--   - Prioridades (Normal y Urgente / Garantía)
--   - Notas de entrega destacadas en Entregados y Buscador General
--
-- Todas llevan "[Prueba visual]" en observaciones para poder borrarlas fácil después.
-- ============================================================================

with tech_list as (
  select id, row_number() over (order by created_at asc) as rn
  from public.tecnicos
  where activo = true
),
tech_count as (
  select count(*) as total from tech_list
),
seed_rows as (
  select *
  from (
    values
      -- 6 Recibidos
      (1,  0,  'Mateo Valencia',         '3104458821', 'TV LCD/LED 55"',           'Control remoto, Cable de poder', 'No da imagen / pantalla oscura',        'Revisar y cotizar antes de reparar [Prueba visual]',                             'Recibido',    0,      false, 'Normal',             null),
      (2,  0,  'Sandra Milena Gómez',    '3147829910', 'Equipo Sonido Sony',       'Sin accesorios',                 'Se apaga al subir volumen',             'Cliente pide avisar por WhatsApp [Prueba visual]',                               'Recibido',    0,      false, 'Urgente / Garantía', null),
      (3,  1,  'Jorge Eliécer Ruiz',     '3015543219', 'Microondas LG',            'Plato de vidrio',                'No calienta, magnetrón sospechoso',     'Revisar y cotizar antes de reparar [Prueba visual]',                             'Recibido',    0,      true,  'Normal',             null),
      (4,  3,  'Claudia Patricia Ortiz', '3186631204', 'Consola PS5',              'Control DualSense, Cable HDMI',  'Puerto HDMI suelto, sin señal',         'Revisar pines internos [Prueba visual]',                                         'Recibido',    0,      false, 'Normal',             null),
      (5,  6,  'Andrés Felipe Herrera',  '3129084451', 'Tarjeta Nevera Inverter',  'Sensores de temperatura',        'En corto en etapa de potencia',         'Urgente de taller aliado [Prueba visual]',                                       'Recibido',    0,      true,  'Urgente / Garantía', null),
      (6,  9,  'María Fernanda Castro',  '3007712398', 'Amplificador Peavey',      'Cable de poder',                 'Distorsión en canal derecho',           'Revisar y cotizar antes de reparar [Prueba visual]',                             'Recibido',    0,      false, 'Normal',             null),

      -- 6 En Revisión
      (7,  0,  'Hernán Darío Morales',   '3153329087', 'Air Fryer Oster',          'Canastilla',                     'No enciende, fusible térmico abierto',  'En banco de pruebas [Prueba visual]',                                            'En Revisión', 45000,  true,  'Normal',             null),
      (8,  1,  'Diana Carolina Rojas',   '3168894321', 'TV Smart Samsung 43"',     'Bases / Patas',                  'Backlight parpadea y oscurece',         'Verificando tiras LED [Prueba visual]',                                          'En Revisión', 140000, true,  'Normal',             null),
      (9,  2,  'Luis Eduardo Vargas',    '3112205543', 'Consola Xbox Series S',    'Cable de poder',                 'No enciende tras bajón de luz',         'Revisando fuente interna [Prueba visual]',                                       'En Revisión', 120000, false, 'Urgente / Garantía', null),
      (10, 4,  'Paola Andrea Jiménez',   '3046671190', 'TV LG OLED 55"',           'Control Magic',                  'Línea vertical en panel',               'Revisar y cotizar antes de reparar [Prueba visual]',                             'En Revisión', 0,      true,  'Normal',             null),
      (11, 7,  'Mateo Valencia',         '3104458821', 'Parlante JBL PartyBox',    'Cargador',                       'No carga batería',                      'Segundo equipo del cliente [Prueba visual]',                                     'En Revisión', 85000,  true,  'Normal',             null),
      (12, 0,  'Sandra Milena Gómez',    '3147829910', 'Licuadora Industrial',     'Vaso acero',                     'Chispea el motor y huele a quemado',    'Revisar escobillas y bobinado [Prueba visual]',                                  'En Revisión', 65000,  false, 'Normal',             null),

      -- 5 Por Aprobar
      (13, 1,  'Jorge Eliécer Ruiz',     '3015543219', 'TV Sony Bravia 50"',       'Control remoto',                 '6 parpadeos led rojo',                  'Cotización enviada por WhatsApp [Prueba visual]',                                'Por Aprobar', 180000, true,  'Normal',             null),
      (14, 3,  'Claudia Patricia Ortiz', '3186631204', 'Tarjeta Lavadora LG',      'Sin accesorios',                 'Error PE, no centrifuga',               'Esperando confirmación de repuesto [Prueba visual]',                             'Por Aprobar', 110000, true,  'Normal',             null),
      (15, 5,  'Andrés Felipe Herrera',  '3129084451', 'Estabilizador Forza',      'Cable de poder',                 'No regula voltaje en salida',           'Pendiente aprobación cliente [Prueba visual]',                                   'Por Aprobar', 55000,  true,  'Normal',             null),
      (16, 8,  'María Fernanda Castro',  '3007712398', 'Consola Nintendo Switch',  'Joy-Cons',                       'No lee cartuchos ni carga',             'Cambio de puerto USB-C y lector [Prueba visual]',                                'Por Aprobar', 160000, true,  'Urgente / Garantía', null),
      (17, 2,  'Hernán Darío Morales',   '3153329087', 'Teatro en Casa Samsung',   '5 parlantes, subwoofer',         'Sin sonido en salida subwoofer',        'Esperando aprobación [Prueba visual]',                                           'Por Aprobar', 95000,  true,  'Normal',             null),

      -- 5 Reparados (Listos para Entrega)
      (18, 0,  'Diana Carolina Rojas',   '3168894321', 'Microondas Haceb',         'Plato de vidrio',                'No gira plato ni calienta',             'Probado 20 min, listo para entrega [Prueba visual]',                             'Reparado',    75000,  true,  'Normal',             null),
      (19, 1,  'Luis Eduardo Vargas',    '3112205543', 'TV Kalley 32"',            'Control remoto',                 'Sin imagen pero con sonido',            'Cambio completo de regletas LED [Prueba visual]',                                'Reparado',    130000, true,  'Normal',             null),
      (20, 4,  'Paola Andrea Jiménez',   '3046671190', 'Amplificador QSC',         'Sin accesorios',                 'Se protege canal A',                    'Listo, probado a carga [Prueba visual]',                                         'Reparado',    220000, true,  'Urgente / Garantía', null),
      (21, 6,  'Mateo Valencia',         '3104458821', 'Cafetera Oster',           'Jarra vidrio',                   'Fuga y no calienta resistencia',        'Reparado y descalcificado [Prueba visual]',                                      'Reparado',    60000,  true,  'Normal',             null),
      (22, 2,  'Sandra Milena Gómez',    '3147829910', 'Consola PS4 Slim',         'Cable HDMI',                     'Se apaga a los 5 minutos por calor',    'Limpieza + pasta térmica lista [Prueba visual]',                                 'Reparado',    90000,  true,  'Normal',             null),

      -- 6 Entregados (con fecha_entrega y notas de entrega)
      (23, 2,  'Jorge Eliécer Ruiz',     '3015543219', 'TV Samsung 50"',           'Control remoto',                 'No enciende',                           'Revisar fuente [Prueba visual]' || E'\nEntrega: Se entregó a su esposa Sandra, probado en mesón 15 min', 'Entregado', 150000, true, 'Normal', interval '18 hours'),
      (24, 5,  'Claudia Patricia Ortiz', '3186631204', 'Equipo Sony Genezi',       'Control, antena',                'Sin sonido en parlante derecho',        'Cotizado y aprobado [Prueba visual]' || E'\nEntrega: Recogió el titular con cédula. Garantía 30 días',      'Entregado', 120000, true, 'Normal', interval '2 days'),
      (25, 7,  'Andrés Felipe Herrera',  '3129084451', 'Air Fryer Imusa',          'Canastilla',                     'No calienta',                           'Cambio de termostato [Prueba visual]' || E'\nEntrega: Se entrega con cable nuevo y probado',                 'Entregado', 65000,  true, 'Normal', interval '3 days'),
      (26, 9,  'María Fernanda Castro',  '3007712398', 'Tarjeta Nevera Samsung',   'Sin accesorios',                 'En corto',                              'Reparación de módulo [Prueba visual]' || E'\nEntrega: Canceló $85.000 por Nequi al retirar',                 'Entregado', 85000,  true, 'Urgente / Garantía', interval '5 days'),
      (27, 4,  'Hernán Darío Morales',   '3153329087', 'Microondas Whirlpool',     'Sin accesorios',                 'Teclado no responde',                   'Cambio de membrana [Prueba visual]' || E'\nEntrega: Entregado a domicilio por mensajero',                   'Entregado', 95000,  true, 'Normal', interval '1 day'),
      (28, 3,  'Diana Carolina Rojas',   '3168894321', 'Consola Xbox One',         'Fuente externa',                 'Fuente en luz naranja',                 'Reparación fuente [Prueba visual]' || E'\nEntrega: Entregado reparado sin novedad',                       'Entregado', 110000, true, 'Normal', interval '12 hours')
  ) as t(
    idx, days_ago, cliente_nombre, cliente_telefono, tipo_equipo, accesorios,
    falla_reportada, observaciones, estado, costo_estimado, impresa, prioridad, entrega_offset
  )
)
insert into public.ordenes (
  fecha_ingreso,
  fecha_entrega,
  cliente_nombre,
  cliente_telefono,
  tipo_equipo,
  accesorios,
  falla_reportada,
  observaciones,
  estado,
  costo_estimado,
  impresa,
  tecnico_id,
  prioridad
)
select
  now() - (s.days_ago * interval '1 day') - (s.idx * interval '17 minutes') as fecha_ingreso,
  case
    when s.estado = 'Entregado' then now() - coalesce(s.entrega_offset, interval '1 hour')
    else null
  end as fecha_entrega,
  s.cliente_nombre,
  s.cliente_telefono,
  s.tipo_equipo,
  s.accesorios,
  s.falla_reportada,
  s.observaciones,
  s.estado,
  s.costo_estimado,
  s.impresa,
  case
    when s.idx % 5 = 0 or (select total from tech_count) = 0 then null
    else (
      select tl.id
      from tech_list tl
      where tl.rn = ((s.idx - 1) % (select total from tech_count)) + 1
      limit 1
    )
  end as tecnico_id,
  s.prioridad
from seed_rows s;

-- ============================================================================
-- LIMPIEZA: Cuando termines tus pruebas visuales, ejecuta solo esta línea:
-- delete from public.ordenes where observaciones like '%[Prueba visual]%';
-- ============================================================================

