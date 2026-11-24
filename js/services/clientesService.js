import { readDemoOrders } from './demoStore.js';
import { getSupabaseClient } from './supabaseClient.js';

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
  const safeName = q.replace(/[,().*%\\]/g, ' ').replace(/\s+/g, ' ').trim();
  const orParts = [];
  if (digits.length >= 3) {
    orParts.push(`telefono_normalizado.ilike.%${digits}%`);
  }
  if (safeName.length >= 3) {
    orParts.push(`nombre.ilike.%${safeName}%`);
  }
  if (orParts.length === 0) return [];

  const { data, error } = await supabase
    .from('clientes')
    .select('id, nombre, telefono, equipos(tipo_equipo), ordenes(id)')
    .or(orParts.join(','))
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

