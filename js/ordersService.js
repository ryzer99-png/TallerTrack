import { getSupabaseClient } from './supabaseClient.js';
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
    .limit(200);

  if (error) throw error;
  return data || [];
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

  const { data, error } = await supabase
    .from('ordenes')
    .insert([cleanPayload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrder(id, patch) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    const orders = readDemoOrders();
    const idx = orders.findIndex((o) => String(o.id) === String(id));
    if (idx === -1) throw new Error('Orden no encontrada en modo demo.');
    orders[idx] = { ...orders[idx], ...patch };
    writeDemoOrders(orders);
    return orders[idx];
  }

  const { data, error } = await supabase
    .from('ordenes')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
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
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        onStatusChange?.('connected');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onStatusChange?.('error');
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

