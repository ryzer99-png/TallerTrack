import { escapeHtml, getPublicOrderUrl, showToast } from '../utils.js';
import { buildReceiptWhatsAppUrl } from '../whatsapp.js';

/** Muestra el modal de confirmación tras crear una nueva orden. */
export function showOrderConfirmationModal(order, { onCreateAnother, onGoToActive }) {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  const waUrl = buildReceiptWhatsAppUrl(order);
  const publicUrl = getPublicOrderUrl(order);

  modalRoot.className = 'fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-3 sm:p-4';
  modalRoot.innerHTML = `
    <div class="relative bg-white rounded-3xl border-4 border-emerald-600 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
      <button id="close-confirm-modal-top" type="button" aria-label="Cerrar ventana" class="touch-btn absolute top-3 right-3 min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center">✕</button>
      <div class="text-center space-y-2 pt-1">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 text-3xl font-black">✓</div>
        <p class="text-sm font-black uppercase tracking-widest text-emerald-700">Orden Registrada</p>
        <div class="py-2 px-4 rounded-2xl bg-slate-900 text-white inline-block">
          <span class="text-xs uppercase font-bold tracking-widest text-slate-300 block">N° de Orden</span>
          <span class="text-4xl sm:text-5xl font-black font-mono tracking-tight">#${escapeHtml(order.numero_orden)}</span>
        </div>
        <p class="text-base font-bold text-slate-800 pt-1">${escapeHtml(order.cliente_nombre)} — ${escapeHtml(order.tipo_equipo)}</p>
        <p class="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded-lg px-3 py-1.5 inline-block">🖨️ Enviada a cola de impresión (impresa: false)</p>
      </div>

      <div class="space-y-3">
        <a href="${escapeHtml(waUrl)}" target="_blank" rel="noopener noreferrer" class="touch-btn w-full py-3.5 px-4 sm:px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base sm:text-lg text-center flex items-center justify-center gap-2 shadow-md border-2 border-emerald-800">
          <span>📲 Enviar Comprobante por WhatsApp</span>
        </a>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button id="copy-public-link-btn" type="button" class="touch-btn py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-sm border-2 border-slate-300">🔗 Copiar enlace cliente</button>
          <a href="${escapeHtml(publicUrl)}" target="_blank" rel="noopener noreferrer" class="touch-btn py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-sm border-2 border-slate-300 flex items-center justify-center">👁️ Ver ficha</a>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t-2 border-slate-200">
        <button id="modal-new-order-btn" type="button" class="touch-btn py-3.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-base">+ Otra Orden</button>
        <button id="modal-go-active-btn" type="button" class="touch-btn py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-base">Ver Tablero</button>
      </div>
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

  modalRoot.addEventListener('click', onBackdropClick);
  modalRoot.querySelector('#close-confirm-modal-top').addEventListener('click', closeModal);
  modalRoot.querySelector('#copy-public-link-btn').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      showToast('Enlace del cliente copiado');
    } catch {
      showToast(publicUrl, 'info');
    }
  });
  modalRoot.querySelector('#modal-new-order-btn').addEventListener('click', () => {
    closeModal();
    onCreateAnother?.();
  });
  modalRoot.querySelector('#modal-go-active-btn').addEventListener('click', () => {
    closeModal();
    onGoToActive?.();
  });
}
