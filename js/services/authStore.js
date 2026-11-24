/**
 * Persistencia local del código de autorización del dispositivo.
 */

export const AUTH_TOKEN_STORAGE_KEY = 'teleradio_auth_token';

/** Lee el token del taller guardado en localStorage (vacío si no existe). */
export function getStoredAuthToken() {
  try {
    return String(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
}

/** Persiste el código de autorización del taller en localStorage. */
export function saveAuthToken(token) {
  try {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, String(token || '').trim());
  } catch {
    // localStorage no disponible
  }
}

/** Elimina el token guardado para desvincular el dispositivo. */
export function clearAuthToken() {
  try {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    // localStorage no disponible
  }
}

/** Exige token activo en localStorage antes de ejecutar operaciones protegidas. */
export function requireAuthToken(token = getStoredAuthToken()) {
  const clean = String(token || '').trim();
  if (!clean) {
    throw new Error('Dispositivo no autorizado. Ingresa el código del taller.');
  }
  return clean;
}
