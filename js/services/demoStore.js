/** Almacén local (localStorage) usado cuando Supabase no está configurado. */

export const DEMO_STORAGE_KEY = 'teleradio_demo_orders_v1';
const DEMO_SEQ_KEY = 'teleradio_demo_seq_v1';


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

export function readDemoOrders() {
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

export function writeDemoOrders(orders) {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(orders));
}

export function nextDemoOrderNumber() {
  seedDemoDataIfNeeded();
  const current = Number(localStorage.getItem(DEMO_SEQ_KEY) || '4065');
  localStorage.setItem(DEMO_SEQ_KEY, String(current + 1));
  return current;
}

export function generateUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const DEMO_TECHS_KEY = 'teleradio_demo_techs_v1';

const DEFAULT_DEMO_TECHNICIANS = [
  { id: 'tech-rogelio', nombre: 'Rogelio', color: '#1d4ed8', activo: true },
  { id: 'tech-juan-david', nombre: 'Juan David', color: '#0f766e', activo: true },
  { id: 'tech-david-antonio', nombre: 'David Antonio', color: '#7c3aed', activo: true },
  { id: 'tech-david-andres', nombre: 'David Andres', color: '#b45309', activo: true },
  { id: 'tech-cristian', nombre: 'Cristian', color: '#be185d', activo: true },
];

export function readDemoTechnicians() {
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
