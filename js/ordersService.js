import { getStoredAuthToken, getSupabaseClient } from './supabaseClient.js';
import { isSupabaseConfigured } from './config.js';

const DEMO_STORAGE_KEY = 'teleradio_demo_orders_v1';
const DEMO_SEQ_KEY = 'teleradio_demo_seq_v1';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function seedDemoDataIfNeeded() {
  if (localStorage.getItem(DEMO_STORAGE_KEY)) return;

  const now = Date.now();
  const sampleOrders = [
    {
      id: '11111111-1111-4111-8111-111111114063',
      numero_orden: 4063,
      fecha_ingreso: new Date(now - 1000 * 60 * 95).toISOString(),
      cliente_nombre: 'Carlos Mendoza',
      cliente_telefono: '3004567890',
      tipo_equipo: 'TV LCD/LED',
      accesorios: 'Control, Cable de poder',
      falla_reportada: 'No da imagen / pantalla oscura',
      observaciones: 'Revisar y cotizar antes de reparar',
      estado: 'En Revisión',
      costo_estimado: 120000,
      impresa: true,
    },
    {
      id: '22222222-2222-4222-8222-222222224064',
      numero_orden: 4064,
      fecha_ingreso: new Date(now - 1000 * 60 * 20).toISOString(),
      cliente_nombre: 'Lucía Ramírez',
      cliente_telefono: '3159876543',
      tipo_equipo: 'Equipo de Sonido',
      accesorios: 'Sin accesorios',
      falla_reportada: 'No enciende',
      observaciones: 'Revisar y cotizar antes de reparar',
      estado: 'Recibido',
      costo_estimado: 0,
      impresa: false,
    },
  ];

  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(sampleOrders));
  localStorage.setItem(DEMO_SEQ_KEY, '4065');
}

function readDemoOrders() {
  seedDemoDataIfNeeded();
  try {
    const parsed = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.sort((a, b) => Number(b.numero_orden) - Number(a.numero_orden))
      : [];
  } catch {
    return [];
  }
}

function writeDemoOrders(orders) {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(orders));
}

function nextDemoOrderNumber() {
  seedDemoDataIfNeeded();
  const current = Number(localStorage.getItem(DEMO_SEQ_KEY) || '4065');
  localStorage.setItem(DEMO_SEQ_KEY, String(current + 1));
  return current;
}

function generateUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function listOrders() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return readDemoOrders();
  }

  const { data, error } = await supabase
    .from('ordenes')
    .select('*')
    .order('numero_orden', { ascending: false })
    .limit(500);

  if (error) throw error;
  return data || [];
}

const DEMO_TECHS_KEY = 'teleradio_demo_techs_v1';

const DEFAULT_DEMO_TECHNICIANS = [
  { id: 'tech-rogelio', nombre: 'Rogelio', color: '#1d4ed8', activo: true },
  { id: 'tech-juan-david', nombre: 'Juan David', color: '#0f766e', activo: true },
  { id: 'tech-david-antonio', nombre: 'David Antonio', color: '#7c3aed', activo: true },
  { id: 'tech-david-andres', nombre: 'David Andres', color: '#b45309', activo: true },
  { id: 'tech-cristian', nombre: 'Cristian', color: '#be185d', activo: true },
];

function readDemoTechnicians() {
  try {
    const raw = localStorage.getItem(DEMO_TECHS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Ignorar error de lectura
  }
  localStorage.setItem(DEMO_TECHS_KEY, JSON.stringify(DEFAULT_DEMO_TECHNICIANS));
  return DEFAULT_DEMO_TECHNICIANS;
}

export async function listTechnicians() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return readDemoTechnicians();
  }

  const { data, error } = await supabase
    .from('tecnicos')
    .select('id, nombre, color, activo')
    .eq('activo', true)
    .order('created_at', { ascending: true });

  if (error) {
    // Fallback silencioso si aún no se ejecutó migration_tecnicos_pendientes.sql
    return [];
  }
  return data || [];
}

export async function createTechnician({ nombre, color }) {
  const cleanName = String(nombre || '').trim();
  const cleanColor = String(color || '#1d4ed8').trim();
  if (!cleanName) throw new Error('Ingresa el nombre del técnico.');

  const supabase = getSupabaseClient();
  if (!supabase) {
    const list = readDemoTechnicians();
    const created = {
      id: generateUuid(),
      nombre: cleanName,
      color: cleanColor,
      activo: true,
    };
    list.push(created);
    localStorage.setItem(DEMO_TECHS_KEY, JSON.stringify(list));
    return created;
  }

  const { data, error } = await supabase
    .from('tecnicos')
    .insert([{ nombre: cleanName, color: cleanColor, activo: true }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createOrder(payload) {
  const cleanPayload = {
    cliente_nombre: payload.cliente_nombre.trim(),
    cliente_telefono: payload.cliente_telefono.trim(),
    tipo_equipo: payload.tipo_equipo.trim(),
    accesorios: (payload.accesorios || 'Ninguno').trim() || 'Ninguno',
    falla_reportada: payload.falla_reportada.trim(),
    observaciones: (payload.observaciones || 'Revisar y cotizar antes de reparar').trim(),
    estado: 'Recibido',
    costo_estimado: Number(payload.costo_estimado || 0),
    impresa: false,
    tecnico_id: payload.tecnico_id || null,
    prioridad: payload.prioridad || 'Normal',
    tiempo_estimado_entrega: payload.tiempo_estimado_entrega || null,
  };

  const supabase = getSupabaseClient();
  if (!supabase) {
    const orders = readDemoOrders();
    const created = {
      id: generateUuid(),
      numero_orden: nextDemoOrderNumber(),
      fecha_ingreso: new Date().toISOString(),
      ...cleanPayload,
    };
    orders.unshift(created);
    writeDemoOrders(orders);
    return created;
  }

  if (!getStoredAuthToken()) {
    throw new Error('Dispositivo no autorizado. Vincula el equipo con el código del taller.');
  }

  const { data, error } = await supabase
    .from('ordenes')
    .insert([cleanPayload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrder(id, patch) {
  const nextPatch = { ...patch };
  if (nextPatch.estado === 'Entregado' && nextPatch.fecha_entrega === undefined) {
    nextPatch.fecha_entrega = new Date().toISOString();
  } else if (nextPatch.estado && nextPatch.estado !== 'Entregado' && nextPatch.fecha_entrega === undefined) {
    nextPatch.fecha_entrega = null;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    const orders = readDemoOrders();
    const idx = orders.findIndex((o) => String(o.id) === String(id));
    if (idx === -1) throw new Error('Orden no encontrada en modo demo.');
    orders[idx] = { ...orders[idx], ...nextPatch };
    writeDemoOrders(orders);
    return orders[idx];
  }

  const { data, error } = await supabase
    .from('ordenes')
    .update(nextPatch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    // Fallback si aún no se ejecutó migration_fecha_entrega.sql
    if (
      String(error.message || '').includes('fecha_entrega') &&
      Object.prototype.hasOwnProperty.call(nextPatch, 'fecha_entrega')
    ) {
      const { fecha_entrega: _ignored, ...restPatch } = nextPatch;
      const retry = await supabase
        .from('ordenes')
        .update(restPatch)
        .eq('id', id)
        .select()
        .single();
      if (retry.error) throw retry.error;
      return retry.data;
    }
    throw error;
  }
  return data;
}

export async function getOrderByIdOrNumber(idOrNumber) {
  const raw = String(idOrNumber || '').trim();
  if (!raw) return null;

  const supabase = getSupabaseClient();
  if (!supabase) {
    const orders = readDemoOrders();
    return (
      orders.find(
        (o) => String(o.id) === raw || String(o.numero_orden) === raw
      ) || null
    );
  }

  // Consulta pública sin token de taller: usar únicamente RPC segura por UUID
  if (!getStoredAuthToken()) {
    if (!UUID_REGEX.test(raw)) {
      return null;
    }
    const { data, error } = await supabase.rpc('obtener_orden_publica', { p_id: raw });
    if (error) throw error;
    return data || null;
  }

  if (UUID_REGEX.test(raw)) {
    const { data, error } = await supabase
      .from('ordenes')
      .select('*')
      .eq('id', raw)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  if (/^\d+$/.test(raw)) {
    const { data, error } = await supabase
      .from('ordenes')
      .select('*')
      .eq('numero_orden', Number(raw))
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  return null;
}

export function subscribeToOrders({ onDataChange, onStatusChange }) {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) {
    onStatusChange?.('demo');
    const onStorage = (e) => {
      if (e.key === DEMO_STORAGE_KEY) {
        onDataChange?.();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }

  onStatusChange?.('connecting');
  const channel = supabase
    .channel('teleradio-ordenes-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ordenes' },
      () => {
        onDataChange?.();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tecnicos' },
      () => {
        onDataChange?.();
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        onStatusChange?.('connected');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onStatusChange?.('error');
      }
    });

  // Respaldo periódico cada 15s y al volver a enfocar la pestaña (Realtime no envía cabeceras RLS personalizadas)
  const pollIntervalId = window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      onDataChange?.();
    }
  }, 15000);

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      onDataChange?.();
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    window.clearInterval(pollIntervalId);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    supabase.removeChannel(channel);
  };
}

function aggregateClientsFromOrders(orders, qLower, digits) {
  const map = new Map();
  for (const o of orders) {
    const telNorm = String(o.cliente_telefono || '').replace(/\D/g, '').slice(-10);
    const nameLower = String(o.cliente_nombre || '').toLowerCase();
    const matches =
      (digits.length >= 3 && telNorm.includes(digits)) ||
      (qLower.length >= 3 && nameLower.includes(qLower));
    if (!matches) continue;

    const key = telNorm || nameLower;
    if (!map.has(key)) {
      map.set(key, {
        nombre: o.cliente_nombre,
        telefono: o.cliente_telefono,
        equipos: new Set(),
        totalOrdenes: 0,
      });
    }
    const entry = map.get(key);
    entry.totalOrdenes += 1;
    if (o.tipo_equipo) entry.equipos.add(o.tipo_equipo);
  }

  return Array.from(map.values())
    .slice(0, 4)
    .map((c) => ({
      nombre: c.nombre,
      telefono: c.telefono,
      equipos: Array.from(c.equipos),
      totalOrdenes: c.totalOrdenes,
    }));
}

export async function findReturningClients(rawQuery) {
  const q = String(rawQuery || '').trim();
  const qLower = q.toLowerCase();
  const digits = q.replace(/\D/g, '');
  if (qLower.length < 3 && digits.length < 3) return [];

  const supabase = getSupabaseClient();
  if (!supabase) {
    return aggregateClientsFromOrders(readDemoOrders(), qLower, digits);
  }

  // Intentar consultar la tabla normalizada `clientes` (con `equipos` y conteo de `ordenes`)
  const filterExpr =
    digits.length >= 3
      ? `telefono_normalizado.ilike.%${digits}%,nombre.ilike.%${q}%`
      : `nombre.ilike.%${q}%`;

  const { data, error } = await supabase
    .from('clientes')
    .select('id, nombre, telefono, equipos(tipo_equipo), ordenes(id)')
    .or(filterExpr)
    .order('updated_at', { ascending: false })
    .limit(4);

  if (!error && Array.isArray(data)) {
    return data.map((c) => ({
      nombre: c.nombre,
      telefono: c.telefono,
      equipos: (c.equipos || []).map((e) => e.tipo_equipo).filter(Boolean),
      totalOrdenes: Array.isArray(c.ordenes) ? c.ordenes.length : 0,
    }));
  }

  // Fallback si aún no se ejecutó migration_clientes_equipos.sql
  const { data: fallbackOrders } = await supabase
    .from('ordenes')
    .select('cliente_nombre, cliente_telefono, tipo_equipo')
    .order('fecha_ingreso', { ascending: false })
    .limit(100);

  return aggregateClientsFromOrders(fallbackOrders || [], qLower, digits);
}

