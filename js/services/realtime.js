import { isSupabaseConfigured } from '../config.js';
import { DEMO_STORAGE_KEY } from './demoStore.js';
import { getSupabaseClient } from './supabaseClient.js';

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
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tecnicos' },
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

  // Respaldo periódico cada 15s y al volver a enfocar la pestaña (Realtime no envía cabeceras RLS personalizadas)
  const pollIntervalId = window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      onDataChange?.();
    }
  }, 15000);

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      onDataChange?.();
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    window.clearInterval(pollIntervalId);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    supabase.removeChannel(channel);
  };
}
