/**
 * Utilidades de resiliencia de red y reintentos con backoff exponencial.
 */

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Determina si un error corresponde a un fallo transitorio de red o 5xx. */
export function isNetworkError(err) {
  if (!err) return false;
  if (err instanceof TypeError) return true;
  const status = Number(err.status || 0);
  if (status >= 500) return true;
  const msg = String(err.message || '');
  return /failed to fetch|networkerror|load failed|network request failed/i.test(msg);
}

/** Ejecuta una operación de lectura con reintentos ante fallos transitorios de red. */
export async function withRetry(fn, { retries = 2, baseDelayMs = 200, sleep = defaultSleep } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt >= retries || !isNetworkError(err)) {
        throw err;
      }
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
  throw lastError;
}
