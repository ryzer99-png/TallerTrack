/** Catálogo de equipos frecuentes: agrupa variantes bajo categorías cortas. */

export const DEFAULT_EQUIPMENT_SUGGESTIONS = [
  'Linterna',
  'TV',
  'Tarjeta Electrónica',
  'Inversor',
  'Batería',
  'Cabina de Sonido',
  'Parlante',
  'Equipo de Sonido',
  'Amplificador',
  'Consola',
  'Regulador',
  'Ventilador',
];

export function normalizeEquipmentKey(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const EQUIPMENT_CATEGORY_RULES = [
  [/\b(tv|televisor|smart\s*tv)\b/, 'TV'],
  [/\blinterna\b/, 'Linterna'],
  [/\binversor\b/, 'Inversor'],
  [/\btarjeta\b/, 'Tarjeta Electrónica'],
  [/\bcabina\b/, 'Cabina de Sonido'],
  [/\bparlante\b/, 'Parlante'],
  [/\bequipo(\s+de)?\s+sonido\b/, 'Equipo de Sonido'],
  [/\bamplificador\b/, 'Amplificador'],
  [/\bcontrol\b/, 'Control'],
  [/\b(consola|xbox|playstation|ps[345]|nintendo)\b/, 'Consola'],
  [/\bbateria\b/, 'Batería'],
  [/\bregulador\b/, 'Regulador'],
  [/\bventilador\b/, 'Ventilador'],
  [/\bradio\b/, 'Radio'],
  [/\bplancha\b/, 'Plancha'],
  [/\bbascula\b/, 'Báscula'],
  [/\bproyector\b/, 'Proyector'],
  [/\benchapadora\b/, 'Enchapadora'],
  [/\bsoldad/, 'Soldador'],
  [/\bmicroondas\b/, 'Microondas'],
];

export function canonicalizeEquipmentLabel(raw) {
  const clean = String(raw || '').trim().replace(/\s+/g, ' ');
  const key = normalizeEquipmentKey(clean);
  if (!key) return '';

  for (const [pattern, label] of EQUIPMENT_CATEGORY_RULES) {
    if (pattern.test(key)) return label;
  }

  // Para equipos distintos a las reglas base, solo conservar nombres cortos genéricos (máx. 2 palabras y sin dígitos/tallas)
  const words = clean.split(' ');
  if (words.length <= 2 && clean.length <= 22 && !/\d/.test(clean)) {
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return '';
}

export function buildEquipmentCatalog(orders = []) {
  const byKey = new Map();

  for (const order of orders) {
    const label = canonicalizeEquipmentLabel(order?.tipo_equipo);
    const key = normalizeEquipmentKey(label);
    if (!key) continue;

    let entry = byKey.get(key);
    if (!entry) {
      entry = { key, label, count: 0, latestMs: 0 };
      byKey.set(key, entry);
    }

    entry.count += 1;
    const ms = Date.parse(order?.fecha_ingreso) || 0;
    if (ms > entry.latestMs) entry.latestMs = ms;
  }

  const saved = Array.from(byKey.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (b.latestMs !== a.latestMs) return b.latestMs - a.latestMs;
    return a.label.localeCompare(b.label, 'es');
  });

  const result = saved.map(({ key, label, count }) => ({ key, label, count }));
  const seenKeys = new Set(result.map((r) => r.key));

  for (const fallback of DEFAULT_EQUIPMENT_SUGGESTIONS) {
    const key = normalizeEquipmentKey(fallback);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      result.push({ key, label: fallback, count: 0 });
    }
  }

  return result;
}
