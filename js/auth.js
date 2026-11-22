import { isSupabaseConfigured } from './config.js';
import {
  AUTH_TOKEN_STORAGE_KEY,
  getStoredAuthToken,
  getSupabaseClient,
  resetSupabaseClient,
} from './supabaseClient.js';

export { AUTH_TOKEN_STORAGE_KEY, getStoredAuthToken };

function getAuthElements() {
  return {
    lockScreen: document.getElementById('auth-lock-screen'),
    headerEl: document.getElementById('workshop-header'),
    appRoot: document.getElementById('app-root'),
    form: document.getElementById('auth-lock-form'),
    codeInput: document.getElementById('auth-code-input'),
    toggleBtn: document.getElementById('auth-toggle-visibility'),
    submitBtn: document.getElementById('auth-submit-btn'),
    statusMsg: document.getElementById('auth-status-msg'),
  };
}

function setStatusMessage(message = '', type = 'info') {
  const { statusMsg } = getAuthElements();
  if (!statusMsg) return;

  if (!message) {
    statusMsg.textContent = '';
    statusMsg.className = 'hidden text-xs font-bold rounded-xl px-3.5 py-2.5 border';
    return;
  }

  const variantClass =
    type === 'error'
      ? 'bg-rose-50 text-rose-800 border-rose-200'
      : type === 'success'
        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
        : 'bg-blue-50 text-blue-800 border-blue-200';

  statusMsg.textContent = message;
  statusMsg.className = `text-xs font-bold rounded-xl px-3.5 py-2.5 border ${variantClass}`;
}

function setFormBusy(busy, label = 'Vincular Dispositivo') {
  const { submitBtn, codeInput } = getAuthElements();
  if (submitBtn) {
    submitBtn.disabled = busy;
    submitBtn.textContent = busy ? 'Validando...' : label;
  }
  if (codeInput) {
    codeInput.disabled = busy;
  }
}

export function showAuthLockScreen({ message = '', type = 'info', loading = false } = {}) {
  const { lockScreen, headerEl, appRoot } = getAuthElements();
  if (headerEl) headerEl.classList.add('hidden');
  if (appRoot) appRoot.classList.add('hidden');
  if (lockScreen) {
    lockScreen.classList.remove('hidden');
    lockScreen.classList.add('flex');
  }
  setFormBusy(loading);
  setStatusMessage(message, type);
}

export function hideAuthLockScreen({ showWorkshop = true } = {}) {
  const { lockScreen, headerEl, appRoot } = getAuthElements();
  if (lockScreen) {
    lockScreen.classList.add('hidden');
    lockScreen.classList.remove('flex');
  }
  if (showWorkshop && headerEl) {
    headerEl.classList.remove('hidden');
  }
  if (appRoot) {
    appRoot.classList.remove('hidden');
  }
  setFormBusy(false);
  setStatusMessage('');
}

function persistAuthToken(token) {
  try {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } catch {
    // Ignorar error si almacenamiento está restringido
  }
  resetSupabaseClient();
}

function clearStoredAuthToken() {
  try {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    // Ignorar error si almacenamiento está restringido
  }
  resetSupabaseClient();
}

export async function validarCodigoTaller(codigo) {
  const cleanCode = String(codigo || '').trim();
  if (!cleanCode) {
    return {
      ok: false,
      reason: 'empty',
      message: 'Ingresa el código de acceso del taller.',
    };
  }

  const supabase = getSupabaseClient();
  if (!isSupabaseConfigured() || !supabase) {
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
          message:
            error.message || 'Demasiados intentos fallidos. Espera 15 minutos e intenta nuevamente.',
        };
      }
      if (
        error.code === 'PGRST202' ||
        error.code === '42883' ||
        msg.includes('validar_codigo_taller')
      ) {
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

    if (data === true) {
      return { ok: true };
    }

    return {
      ok: false,
      reason: 'invalid',
      message: 'Código incorrecto o desactivado. Verifica con el administrador.',
    };
  } catch {
    return {
      ok: false,
      reason: 'network',
      message: 'No se pudo conectar con el servidor para validar el código.',
    };
  }
}

export function extractAuthParamFromUrl() {
  const url = new URL(window.location.href);
  let rawAuth = url.searchParams.get('auth');

  if (rawAuth !== null) {
    url.searchParams.delete('auth');
    const nextSearch = url.searchParams.toString();
    const cleanUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;
    window.history.replaceState({}, '', cleanUrl);
    return String(rawAuth).trim();
  }

  // Soporte secundario si llegó dentro del hash (#/ruta?auth=...)
  if (url.hash.includes('?')) {
    const [hashBase, hashQuery] = url.hash.split('?');
    const hashParams = new URLSearchParams(hashQuery);
    rawAuth = hashParams.get('auth');
    if (rawAuth !== null) {
      hashParams.delete('auth');
      const nextHashQuery = hashParams.toString();
      const nextHash = `${hashBase}${nextHashQuery ? `?${nextHashQuery}` : ''}`;
      const cleanUrl = `${url.pathname}${url.search}${nextHash}`;
      window.history.replaceState({}, '', cleanUrl);
      return String(rawAuth).trim();
    }
  }

  return '';
}

export async function comprobarAutorizacion({ onAuthorized, onLockStateChange } = {}) {
  const urlCode = extractAuthParamFromUrl();
  const storedCode = getStoredAuthToken();

  if (urlCode) {
    showAuthLockScreen({
      message: 'Validando enlace de autorización...',
      type: 'info',
      loading: true,
    });
    onLockStateChange?.(true);

    const result = await validarCodigoTaller(urlCode);
    if (result.ok) {
      persistAuthToken(urlCode);
      hideAuthLockScreen({ showWorkshop: true });
      onLockStateChange?.(false);
      await onAuthorized?.({ linkedByUrl: true });
      return true;
    }

    showAuthLockScreen({
      message:
        result.reason === 'invalid'
          ? 'El enlace de autorización no es válido o venció.'
          : result.message,
      type: 'error',
      loading: false,
    });
    return false;
  }

  if (storedCode) {
    showAuthLockScreen({
      message: 'Verificando dispositivo autorizado...',
      type: 'info',
      loading: true,
    });
    onLockStateChange?.(true);

    const result = await validarCodigoTaller(storedCode);
    if (result.ok) {
      hideAuthLockScreen({ showWorkshop: true });
      onLockStateChange?.(false);
      await onAuthorized?.({ linkedByUrl: false });
      return true;
    }

    if (result.reason === 'network') {
      // Mantener sesión local si el móvil está momentáneamente sin conexión
      hideAuthLockScreen({ showWorkshop: true });
      onLockStateChange?.(false);
      await onAuthorized?.({ offlineBypass: true });
      return true;
    }

    if (result.reason === 'rate_limited') {
      // Conservar token guardado mientras expire la pausa por intentos desde la misma IP
      showAuthLockScreen({
        message: result.message,
        type: 'error',
        loading: false,
      });
      return false;
    }

    clearStoredAuthToken();
    showAuthLockScreen({
      message:
        result.reason === 'invalid'
          ? 'El código guardado ya no es válido. Ingresa el código actualizado del taller.'
          : result.message,
      type: 'error',
      loading: false,
    });
    return false;
  }

  showAuthLockScreen();
  onLockStateChange?.(true);
  return false;
}

export function bindAuthLockForm({ onAuthorized } = {}) {
  const { form, codeInput, toggleBtn } = getAuthElements();
  if (!form || form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';

  toggleBtn?.addEventListener('click', () => {
    if (!codeInput) return;
    const isHidden = codeInput.type === 'password';
    codeInput.type = isHidden ? 'text' : 'password';
    toggleBtn.setAttribute('aria-pressed', String(isHidden));
    toggleBtn.textContent = isHidden ? 'Ocultar' : 'Ver';
    codeInput.focus();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawCode = String(codeInput?.value || '').trim();
    if (!rawCode) {
      setStatusMessage('Ingresa el código de acceso del taller.', 'error');
      codeInput?.focus();
      return;
    }

    setFormBusy(true);
    setStatusMessage('Validando código del taller...', 'info');

    const result = await validarCodigoTaller(rawCode);
    if (!result.ok) {
      setFormBusy(false);
      setStatusMessage(result.message, 'error');
      codeInput?.select();
      return;
    }

    persistAuthToken(rawCode);
    if (codeInput) {
      codeInput.value = '';
      codeInput.type = 'password';
    }
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-pressed', 'false');
      toggleBtn.textContent = 'Ver';
    }

    hideAuthLockScreen({ showWorkshop: true });
    await onAuthorized?.({ linkedManually: true });
  });
}

export function cerrarAccesoDispositivo({ onLocked } = {}) {
  clearStoredAuthToken();
  onLocked?.();
  const { codeInput } = getAuthElements();
  showAuthLockScreen();
  if (codeInput) {
    codeInput.value = '';
    codeInput.focus();
  }
}
