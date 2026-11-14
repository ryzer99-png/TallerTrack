const LOCAL_ENV_KEY = 'teleradio_env_override_v1';

export function getConfig() {
  const base = window.__TELERADIO_ENV__ || {};
  let override = {};
  try {
    const raw = localStorage.getItem(LOCAL_ENV_KEY);
    if (raw) override = JSON.parse(raw);
  } catch {
    // Ignorar errores de almacenamiento
  }

  return {
    SUPABASE_URL: (override.SUPABASE_URL ?? base.SUPABASE_URL ?? '').trim(),
    SUPABASE_ANON_KEY: (override.SUPABASE_ANON_KEY ?? base.SUPABASE_ANON_KEY ?? '').trim(),
    TELERADIO_WHATSAPP: (override.TELERADIO_WHATSAPP ?? base.TELERADIO_WHATSAPP ?? '').trim(),
    TELERADIO_DIRECCION: (override.TELERADIO_DIRECCION ?? base.TELERADIO_DIRECCION ?? 'Taller de Electrónica Teleradio').trim(),
    DEFAULT_COUNTRY_CODE: (override.DEFAULT_COUNTRY_CODE ?? base.DEFAULT_COUNTRY_CODE ?? '57').trim(),
  };
}

export function isSupabaseConfigured() {
  const cfg = getConfig();
  return Boolean(
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes('tu-proyecto') &&
    !cfg.SUPABASE_ANON_KEY.includes('tu-supabase')
  );
}

export function saveLocalEnvOverrides(values) {
  localStorage.setItem(LOCAL_ENV_KEY, JSON.stringify(values));
}

export function clearLocalEnvOverrides() {
  localStorage.removeItem(LOCAL_ENV_KEY);
}

