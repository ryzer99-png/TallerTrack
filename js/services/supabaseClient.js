import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { getConfig, isSupabaseConfigured } from '../config.js';
import { clearAuthToken, getStoredAuthToken, saveAuthToken } from './authStore.js';

let cachedClient = null;
let cachedKey = '';

export { AUTH_TOKEN_STORAGE_KEY, getStoredAuthToken } from './authStore.js';

/** Guarda el token de taller y reinicia el cliente Supabase cacheado. */
export function persistAuthToken(token) {
  saveAuthToken(token);
  resetSupabaseClient();
}

/** Borra el token de taller y reinicia el cliente Supabase cacheado. */
export function clearStoredAuthToken() {
  clearAuthToken();
  resetSupabaseClient();
}

/** Limpia la instancia cacheada del cliente Supabase. */
export function resetSupabaseClient() {
  cachedClient = null;
  cachedKey = '';
}

/** Retorna el cliente Supabase configurado con la cabecera `x-teleradio-key`. */
export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = getConfig();
  const token = getStoredAuthToken();
  const nextKey = `${SUPABASE_URL}|${SUPABASE_ANON_KEY}|${token}`;

  if (!cachedClient || cachedKey !== nextKey) {
    const options = { realtime: { params: { eventsPerSecond: 10 } } };
    if (token) {
      options.global = { headers: { 'x-teleradio-key': token } };
    }
    cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, options);
    cachedKey = nextKey;
  }
  return cachedClient;
}
