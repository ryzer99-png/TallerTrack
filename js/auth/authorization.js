import { isSupabaseConfigured } from '../config.js';
import { getSupabaseClient } from '../services/supabaseClient.js';

/** Valida el código de taller contra la RPC `validar_codigo_taller` en Supabase. */
export async function validarCodigoTaller(
  codigo,
  { getClient = getSupabaseClient, isConfigured = isSupabaseConfigured } = {}
) {
  const cleanCode = String(codigo || '').trim();
  if (!cleanCode) {
    return { ok: false, reason: 'empty', message: 'Ingresa el código de acceso del taller.' };
  }

  const supabase = getClient();
  if (!isConfigured() || !supabase) {
    return { ok: true, mode: 'demo' };
  }

  try {
    const { data, error } = await supabase.rpc('validar_codigo_taller', {
      codigo_ingresado: cleanCode,
    });

    if (error) {
      const msg = String(error.message || '').toLowerCase();
      if (error.code === 'P0001' || msg.includes('demasiados intentos')) {
        return {
          ok: false,
          reason: 'rate_limited',
          message: error.message || 'Demasiados intentos fallidos. Espera 15 minutos e intenta nuevamente.',
        };
      }
      if (error.code === 'PGRST202' || error.code === '42883' || msg.includes('validar_codigo_taller')) {
        return {
          ok: false,
          reason: 'missing_rpc',
          message: 'Falta ejecutar migration_seguridad_codigo_taller.sql en Supabase.',
        };
      }
      return {
        ok: false,
        reason: 'network',
        message: 'No se pudo conectar con el servidor para validar el código.',
      };
    }

    if (data === true) return { ok: true };
    return { ok: false, reason: 'invalid', message: 'Código incorrecto o desactivado. Verifica con el administrador.' };
  } catch {
    return {
      ok: false,
      reason: 'network',
      message: 'No se pudo conectar con el servidor para validar el código.',
    };
  }
}

/** Extrae el parámetro `?auth=` de la URL y devuelve la ruta limpia sin exponerlo. */
export function extractAuthParam(href) {
  const url = new URL(href);
  let rawAuth = url.searchParams.get('auth');

  if (rawAuth !== null) {
    url.searchParams.delete('auth');
    const nextSearch = url.searchParams.toString();
    return {
      code: String(rawAuth).trim(),
      cleanPath: `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`,
    };
  }

  if (url.hash.includes('?')) {
    const [hashBase, hashQuery] = url.hash.split('?');
    const hashParams = new URLSearchParams(hashQuery);
    rawAuth = hashParams.get('auth');
    if (rawAuth !== null) {
      hashParams.delete('auth');
      const nextHashQuery = hashParams.toString();
      const nextHash = `${hashBase}${nextHashQuery ? `?${nextHashQuery}` : ''}`;
      return {
        code: String(rawAuth).trim(),
        cleanPath: `${url.pathname}${url.search}${nextHash}`,
      };
    }
  }

  return { code: '', cleanPath: null };
}

/** Resuelve el estado de autorización inicial según URL y token en localStorage. */
export async function resolveAuthorization({ urlCode, storedCode, validate = validarCodigoTaller }) {
  if (urlCode) {
    const result = await validate(urlCode);
    if (result.ok) {
      return { status: 'authorized', token: urlCode, linkedByUrl: true };
    }
    return {
      status: 'locked',
      message: result.reason === 'invalid' ? 'El enlace de autorización no es válido o venció.' : result.message,
    };
  }

  if (storedCode) {
    const result = await validate(storedCode);
    if (result.ok) {
      return { status: 'authorized', token: storedCode, linkedByUrl: false };
    }
    if (result.reason === 'network') {
      return { status: 'authorized', token: storedCode, offlineBypass: true };
    }
    if (result.reason === 'rate_limited') {
      return { status: 'locked', message: result.message };
    }
    return {
      status: 'locked',
      clearStored: true,
      message:
        result.reason === 'invalid'
          ? 'El código guardado ya no es válido. Ingresa el código actualizado del taller.'
          : result.message,
    };
  }

  return { status: 'locked' };
}
