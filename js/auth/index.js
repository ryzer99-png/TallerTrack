import {
  clearStoredAuthToken,
  getStoredAuthToken,
  persistAuthToken,
} from '../services/supabaseClient.js';
import {
  extractAuthParam,
  resolveAuthorization,
  validarCodigoTaller,
} from './authorization.js';
import {
  getAuthElements,
  hideAuthLockScreen,
  setAuthFormBusy,
  setAuthStatusMessage,
  showAuthLockScreen,
} from './lockView.js';

export { hideAuthLockScreen, showAuthLockScreen, validarCodigoTaller };

/** Extrae y limpia `?auth=` de la barra de direcciones si viene en la URL. */
export function extractAuthParamFromUrl() {
  const { code, cleanPath } = extractAuthParam(window.location.href);
  if (cleanPath !== null) {
    window.history.replaceState({}, '', cleanPath);
  }
  return code;
}

/** Valida la autorización al arranque (URL o localStorage) y desbloquea la app. */
export async function comprobarAutorizacion({ onAuthorized, onLockStateChange } = {}) {
  const urlCode = extractAuthParamFromUrl();
  const storedCode = getStoredAuthToken();

  if (urlCode || storedCode) {
    showAuthLockScreen({
      message: urlCode ? 'Validando enlace de autorización...' : 'Verificando dispositivo autorizado...',
      type: 'info',
      loading: true,
    });
    onLockStateChange?.(true);
  }

  const outcome = await resolveAuthorization({ urlCode, storedCode });
  if (outcome.status === 'authorized') {
    if (outcome.linkedByUrl) persistAuthToken(outcome.token);
    hideAuthLockScreen({ showWorkshop: true });
    onLockStateChange?.(false);
    await onAuthorized?.(outcome);
    return true;
  }

  if (outcome.clearStored) clearStoredAuthToken();
  showAuthLockScreen({
    message: outcome.message || '',
    type: outcome.message ? 'error' : 'info',
    loading: false,
  });
  onLockStateChange?.(true);
  return false;
}

/** Conecta el formulario de ingreso del código de taller. */
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
      setAuthStatusMessage('Ingresa el código de acceso del taller.', 'error');
      codeInput?.focus();
      return;
    }

    setAuthFormBusy(true);
    setAuthStatusMessage('Validando código del taller...', 'info');

    const result = await validarCodigoTaller(rawCode);
    if (!result.ok) {
      setAuthFormBusy(false);
      setAuthStatusMessage(result.message, 'error');
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

/** Desvincula el dispositivo borrando el token local y mostrando el bloqueo. */
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
