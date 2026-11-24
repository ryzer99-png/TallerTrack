import { clearLocalEnvOverrides, getConfig, saveLocalEnvOverrides } from './config.js';
import { escapeHtml, showToast } from './utils.js';

/** Abre el modal para configurar credenciales locales de Supabase en modo demo. */
export function openSupabaseConfigModal({ onSaved }) {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;
  const cfg = getConfig();

  modalRoot.className = 'fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-3 sm:p-4';
  modalRoot.innerHTML = `
    <div class="bg-white rounded-2xl border-4 border-slate-900 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-xl font-black text-slate-900">Configurar Supabase</h3>
        <button id="close-cfg-modal" type="button" class="touch-btn min-w-[44px] px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 font-black" aria-label="Cerrar">✕</button>
      </div>
      <p class="text-sm text-slate-600 font-medium">
        En producción se recomienda usar variables de entorno (<code>SUPABASE_URL</code> y <code>SUPABASE_ANON_KEY</code>). Para pruebas rápidas puedes guardarlas aquí:
      </p>
      <form id="cfg-form" class="space-y-3">
        <div>
          <label class="block text-xs font-black uppercase text-slate-700 mb-1">SUPABASE_URL</label>
          <input id="cfg-url" type="url" required placeholder="https://xxxx.supabase.co" value="${escapeHtml(cfg.SUPABASE_URL)}" class="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border-2 border-slate-400 font-semibold text-base" />
        </div>
        <div>
          <label class="block text-xs font-black uppercase text-slate-700 mb-1">SUPABASE_ANON_KEY</label>
          <input id="cfg-key" type="text" required placeholder="eyJhbGciOi..." value="${escapeHtml(cfg.SUPABASE_ANON_KEY)}" class="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border-2 border-slate-400 font-semibold text-base" />
        </div>
        <div>
          <label class="block text-xs font-black uppercase text-slate-700 mb-1">WhatsApp del Taller (opcional)</label>
          <input id="cfg-wa" type="tel" placeholder="573001234567" value="${escapeHtml(cfg.TELERADIO_WHATSAPP)}" class="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border-2 border-slate-400 font-semibold text-base" />
        </div>
        <div class="flex flex-wrap gap-2 pt-2">
          <button id="cancel-cfg-btn" type="button" class="touch-btn px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm">Cancelar</button>
          <button id="clear-cfg-btn" type="button" class="touch-btn px-4 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm">Limpiar</button>
          <button type="submit" class="touch-btn flex-1 min-w-[160px] py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-black">Guardar y Conectar</button>
        </div>
      </form>
    </div>
  `;

  const closeModal = () => {
    modalRoot.removeEventListener('click', onBackdropClick);
    modalRoot.className = 'fixed inset-0 z-50 hidden';
    modalRoot.innerHTML = '';
  };

  const onBackdropClick = (e) => {
    if (e.target === modalRoot) closeModal();
  };

  modalRoot.querySelector('#close-cfg-modal').addEventListener('click', closeModal);
  modalRoot.querySelector('#cancel-cfg-btn').addEventListener('click', closeModal);
  modalRoot.addEventListener('click', onBackdropClick);
  modalRoot.querySelector('#clear-cfg-btn').addEventListener('click', () => {
    clearLocalEnvOverrides();
    closeModal();
    onSaved?.();
    showToast('Configuración local eliminada');
  });

  modalRoot.querySelector('#cfg-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveLocalEnvOverrides({
      SUPABASE_URL: modalRoot.querySelector('#cfg-url').value.trim(),
      SUPABASE_ANON_KEY: modalRoot.querySelector('#cfg-key').value.trim(),
      TELERADIO_WHATSAPP: modalRoot.querySelector('#cfg-wa').value.trim(),
    });
    closeModal();
    onSaved?.();
    showToast('Credenciales guardadas');
  });
}
