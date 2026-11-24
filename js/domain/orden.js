/**
 * Reglas puras del dominio de órdenes: validación, normalización y accesorios.
 */

const REQUIRED_FIELDS = [
  ['tipo_equipo', 'Indica el tipo de equipo'],
  ['cliente_nombre', 'Falta el nombre del cliente'],
  ['cliente_telefono', 'Falta el teléfono / WhatsApp del cliente'],
  ['falla_reportada', 'Indica la falla reportada'],
];

/** Valida los campos obligatorios de una orden antes de enviarla a Supabase. */
export function validateOrderPayload(payload) {
  const src = payload && typeof payload === 'object' ? payload : {};
  const errors = {};
  let firstField = null;

  for (const [field, message] of REQUIRED_FIELDS) {
    if (!String(src[field] ?? '').trim()) {
      errors[field] = message;
      if (!firstField) firstField = field;
    }
  }

  return { ok: firstField === null, errors, firstField };
}

/** Valida que el número de orden sea un entero positivo. */
export function isValidOrderNumber(value) {
  if (value === '' || value === null || value === undefined) return false;
  const num = Number(value);
  return Number.isInteger(num) && num > 0;
}

/** Normaliza los campos de entrada y aplica valores iniciales del taller. */
export function normalizeOrderPayload(payload = {}) {
  return {
    cliente_nombre: String(payload.cliente_nombre ?? '').trim(),
    cliente_telefono: String(payload.cliente_telefono ?? '').trim(),
    tipo_equipo: String(payload.tipo_equipo ?? '').trim(),
    accesorios: String(payload.accesorios || 'Ninguno').trim() || 'Ninguno',
    falla_reportada: String(payload.falla_reportada ?? '').trim(),
    observaciones: String(payload.observaciones || 'Revisar y cotizar antes de reparar').trim(),
    estado: 'Recibido',
    costo_estimado: Number(payload.costo_estimado || 0),
    impresa: false,
    tecnico_id: payload.tecnico_id || null,
    prioridad: payload.prioridad || 'Normal',
    tiempo_estimado_entrega: payload.tiempo_estimado_entrega || null,
  };
}

/** Combina los chips de accesorios seleccionados y el detalle libre. */
export function buildAccessoriesPayload(selectedTags, detailText = '') {
  const cleanDetail = String(detailText || '').trim();
  const activeTags = Array.from(selectedTags || []).filter((t) => t !== 'Sin accesorios');

  if (selectedTags?.has?.('Sin accesorios') && !cleanDetail) return 'Ninguno';
  if (activeTags.length > 0 && cleanDetail) return `${activeTags.join(', ')}. Detalle: ${cleanDetail}`;
  if (activeTags.length > 0) return activeTags.join(', ');
  if (cleanDetail) return `Detalle: ${cleanDetail}`;
  return 'Ninguno';
}

/** Formatea dígitos a pesos COP con separador de miles. */
export function formatCopInput(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? Number(digits).toLocaleString('es-CO') : '';
}

/** Convierte texto formateado COP a entero no negativo. */
export function parseCopInput(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}
