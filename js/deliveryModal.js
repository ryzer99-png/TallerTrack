import { updateOrder } from './ordersService.js';
import { escapeHtml, showToast } from './utils.js';

/**
 * Abre un modal de confirmación antes de marcar una orden como "Entregado".
 * Protege contra clics accidentales y permite agregar o editar observaciones de entrega.
 */
export function openDeliveryConfirmModal(order, { onConfirmed } = {}) {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  modalRoot.className = 'fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4';
  modalRoot.innerHTML = `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 mb-1.5">
            Confirmar Entrega
          </span>
          <h3 class="text-lg font-extrabold text-slate-900">
            ¿Marcar orden #${escapeHtml(order.numero_orden)} como Entregada?
          </h3>
          <p class="text-sm text-slate-600 mt-0.5">
            ${escapeHtml(order.cliente_nombre)} — ${escapeHtml(order.tipo_equipo)}
          </p>
        </div>
        <button
          type="button"
          data-action="close-delivery-modal"
          class="text-slate-400 hover:text-slate-700 font-bold text-lg px-2 leading-none"
          aria-label="Cerrar"
        >✕</button>
      </div>

      <p class="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
        Esta acción registrará la fecha de entrega y moverá la orden al historial de <strong>Entregados</strong>.
      </p>

      <form id="delivery-confirm-form" class="space-y-4">
        <div>
          <label for="delivery-observaciones" class="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5">
            Anotaciones / Observaciones de entrega
          </label>
          <textarea
            id="delivery-observaciones"
            rows="3"
            placeholder="Ej: Se entrega probado, garantía 30 días, sin control remoto..."
            class="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none"
          >${escapeHtml(order.observaciones || '')}</textarea>
        </div>

        <div class="flex gap-2 justify-end pt-1">
          <button
            type="button"
            data-action="close-delivery-modal"
            class="min-h-[44px] px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            id="btn-confirm-delivery"
            class="min-h-[44px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-colors"
          >
            Confirmar Entrega
          </button>
        </div>
      </form>
    </div>
  `;

  const closeModal = () => {
    modalRoot.className = 'fixed inset-0 z-50 hidden';
    modalRoot.innerHTML = '';
  };

  modalRoot.querySelectorAll('[data-action="close-delivery-modal"]').forEach((btn) => {
    btn.addEventListener('click', closeModal);
  });
  modalRoot.addEventListener('click', (e) => {
    if (e.target === modalRoot) closeModal();
  });

  const textarea = document.getElementById('delivery-observaciones');
  textarea?.focus();

  const form = document.getElementById('delivery-confirm-form');
  const submitBtn = document.getElementById('btn-confirm-delivery');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const observaciones = textarea?.value.trim() || null;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Entregando...';
    }
    try {
      await updateOrder(order.id, { estado: 'Entregado', observaciones });
      closeModal();
      showToast(`Orden #${order.numero_orden} marcada como Entregada`);
      await onConfirmed?.();
    } catch (err) {
      console.error(err);
      showToast(`Error al entregar: ${err.message}`, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirmar Entrega';
      }
    }
  });
}
