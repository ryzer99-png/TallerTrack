import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { getConfig, isSupabaseConfigured } from './config.js';

export const AUTH_TOKEN_STORAGE_KEY = 'teleradio_auth_token';

let cachedClient = null;
let cachedKey = '';

export function getStoredAuthToken() {
  try {
    return String(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function resetSupabaseClient() {
  cachedClient = null;
  cachedKey = '';
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = getConfig();
  const token = getStoredAuthToken();
  const nextKey = `${SUPABASE_URL}|${SUPABASE_ANON_KEY}|${token}`;

  if (!cachedClient || cachedKey !== nextKey) {
    const options = {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    };
    if (token) {
      options.global = {
        headers: {
          'x-teleradio-key': token,
        },
      };
    }
    cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, options);
    cachedKey = nextKey;
  }
  return cachedClient;
}
