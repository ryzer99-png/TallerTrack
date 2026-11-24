/**
 * Presentación y manejo de DOM para la pantalla de bloqueo del dispositivo.
 */

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

export function setAuthStatusMessage(message = '', type = 'info') {
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

export function setAuthFormBusy(busy, label = 'Vincular Dispositivo') {
  const { submitBtn, codeInput } = getAuthElements();
  if (submitBtn) {
    submitBtn.disabled = busy;
    submitBtn.textContent = busy ? 'Validando...' : label;
  }
  if (codeInput) codeInput.disabled = busy;
}

export function showAuthLockScreen({ message = '', type = 'info', loading = false } = {}) {
  const { lockScreen, headerEl, appRoot } = getAuthElements();
  headerEl?.classList.add('hidden');
  appRoot?.classList.add('hidden');
  if (lockScreen) {
    lockScreen.classList.remove('hidden');
    lockScreen.classList.add('flex');
  }
  setAuthFormBusy(loading);
  setAuthStatusMessage(message, type);
}

export function hideAuthLockScreen({ showWorkshop = true } = {}) {
  const { lockScreen, headerEl, appRoot } = getAuthElements();
  if (lockScreen) {
    lockScreen.classList.add('hidden');
    lockScreen.classList.remove('flex');
  }
  if (showWorkshop) headerEl?.classList.remove('hidden');
  appRoot?.classList.remove('hidden');
  setAuthFormBusy(false);
  setAuthStatusMessage('');
}

export { getAuthElements };
