import { normalizeOrderPayload, validateOrderPayload } from '../domain/orden.js';
import { getStoredAuthToken, requireAuthToken } from './authStore.js';
import {
  generateUuid,
  nextDemoOrderNumber,
  readDemoOrders,
  writeDemoOrders,
} from './demoStore.js';
import { withRetry } from './network.js';
import { getSupabaseClient } from './supabaseClient.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Crea el servicio de órdenes con dependencias inyectables para pruebas unitarias. */
export function createOrdenesService({
  getClient = getSupabaseClient,
  getToken = getStoredAuthToken,
  sleep,
} = {}) {
  async function listOrders() {
    const supabase = getClient();
    if (!supabase) return readDemoOrders();

    return withRetry(
      async () => {
        const { data, error } = await supabase
          .from('ordenes')
          .select('*')
          .order('numero_orden', { ascending: false })
          .limit(500);
        if (error) throw error;
        return data || [];
      },
      { sleep }
    );
  }

  async function createOrder(payload) {
    const validation = validateOrderPayload(payload);
    if (!validation.ok) {
      throw new Error(validation.errors[validation.firstField]);
    }
    const cleanPayload = normalizeOrderPayload(payload);

    const supabase = getClient();
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

    requireAuthToken(getToken());

    const { data, error } = await supabase
      .from('ordenes')
      .insert([cleanPayload])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function updateOrder(id, patch) {
    const nextPatch = { ...patch };
    if (nextPatch.estado === 'Entregado' && nextPatch.fecha_entrega === undefined) {
      nextPatch.fecha_entrega = new Date().toISOString();
    } else if (nextPatch.estado && nextPatch.estado !== 'Entregado' && nextPatch.fecha_entrega === undefined) {
      nextPatch.fecha_entrega = null;
    }

    const supabase = getClient();
    if (!supabase) {
      const orders = readDemoOrders();
      const idx = orders.findIndex((o) => String(o.id) === String(id));
      if (idx === -1) throw new Error('Orden no encontrada en modo demo.');
      orders[idx] = { ...orders[idx], ...nextPatch };
      writeDemoOrders(orders);
      return orders[idx];
    }

    requireAuthToken(getToken());

    const { data, error } = await supabase
      .from('ordenes')
      .update(nextPatch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function getOrderByIdOrNumber(idOrNumber) {
    const raw = String(idOrNumber || '').trim();
    if (!raw) return null;

    const supabase = getClient();
    if (!supabase) {
      return readDemoOrders().find((o) => String(o.id) === raw || String(o.numero_orden) === raw) || null;
    }

    if (!getToken()) {
      if (!UUID_REGEX.test(raw)) return null;
      return withRetry(
        async () => {
          const { data, error } = await supabase.rpc('obtener_orden_publica', { p_id: raw });
          if (error) throw error;
          return data || null;
        },
        { sleep }
      );
    }

    if (UUID_REGEX.test(raw)) {
      return withRetry(
        async () => {
          const { data, error } = await supabase.from('ordenes').select('*').eq('id', raw).maybeSingle();
          if (error) throw error;
          return data;
        },
        { sleep }
      );
    }

    if (/^\d+$/.test(raw)) {
      return withRetry(
        async () => {
          const { data, error } = await supabase.from('ordenes').select('*').eq('numero_orden', Number(raw)).maybeSingle();
          if (error) throw error;
          return data;
        },
        { sleep }
      );
    }

    return null;
  }

  return { listOrders, createOrder, updateOrder, getOrderByIdOrNumber };
}

const defaultService = createOrdenesService();

export const { listOrders, createOrder, updateOrder, getOrderByIdOrNumber } = defaultService;
