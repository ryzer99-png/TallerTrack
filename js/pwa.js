/**
 * Registro de Service Worker y manejo del banner/botón "Instalar App" (PWA).
 */
export function initPwa({ installBtnId = 'install-pwa-btn', onInstalled } = {}) {
  // 1. Registrar Service Worker tras el evento load
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          console.warn('No se pudo registrar el Service Worker:', err);
        });
    });
  }

  // 2. Capturar beforeinstallprompt para mostrar botón sutil de instalación
  const installBtn = document.getElementById(installBtnId);
  if (!installBtn) return;

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  if (isStandalone) {
    installBtn.classList.add('hidden');
    return;
  }

  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installBtn.classList.remove('hidden');
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;

    installBtn.disabled = true;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        installBtn.classList.add('hidden');
        onInstalled?.();
      }
    } finally {
      deferredPrompt = null;
      installBtn.disabled = false;
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installBtn.classList.add('hidden');
    onInstalled?.();
  });
}

