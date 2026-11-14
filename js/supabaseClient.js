import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { getConfig, isSupabaseConfigured } from './config.js';

let cachedClient = null;
let cachedKey = '';

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = getConfig();
  const nextKey = `${SUPABASE_URL}|${SUPABASE_ANON_KEY}`;
  if (!cachedClient || cachedKey !== nextKey) {
    cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    cachedKey = nextKey;
  }
  return cachedClient;
}

