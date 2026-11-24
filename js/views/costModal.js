import { formatCopInput, parseCopInput } from '../domain/orden.js';
import { updateOrder } from '../services/ordenesService.js';
import { escapeHtml, formatCurrency, showToast } from '../utils.js';

const PRESET_PRICES = [30000, 50000, 80000, 100000, 120000, 150000];

/** Abre el modal táctil para asignar o actualizar el precio de reparación. */
export function openCostModal(order, onRefreshOrders) {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  const initialFormatted = formatCopInput(Math.round(Number(order.costo_estimado || 0)));

  modalRoot.className = 'fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-3 sm:p-4';
  modalRoot.innerHTML = `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 space-y-4">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-lg sm:text-xl font-black text-slate-900">Precio de Reparación #${escapeHtml(order.numero_orden)}</h3>
        <button id="close-cost-modal" type="button" class="touch-btn min-w-[44px] px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 font-black" aria-label="Cerrar">✕</button>
      </div>
      <p class="text-sm font-semibold text-slate-600">${escapeHtml(order.cliente_nombre)} — ${escapeHtml(order.tipo_equipo)}</p>
      <form id="cost-form" class="space-y-4">
        <div>
          <span class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Valores rápidos (1 toque)</span>
          <div class="grid grid-cols-3 gap-2">
            ${PRESET_PRICES.map(
              (p) => `
              <button type="button" data-preset-price="${p}" class="touch-chip px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-400 font-mono font-bold text-sm text-slate-800">
                ${escapeHtml(formatCurrency(p))}
              </button>`
            ).join('')}
          </div>
        </div>
        <div>
          <label for="cost-input" class="block text-sm font-black uppercase text-slate-700 mb-1">Precio de Reparación (COP)</label>
          <div class="relative flex items-center">
            <span class="absolute left-4 text-2xl font-black font-mono text-slate-400 pointer-events-none">$</span>
            <input
              id="cost-input"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              placeholder="0"
              value="${escapeHtml(initialFormatted)}"
              class="w-full pl-10 pr-4 py-3.5 text-2xl font-black font-mono rounded-xl border-2 border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button type="submit" class="touch-btn py-3.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-black text-base">Guardar Precio</button>
          <button id="save-and-repaired-btn" type="button" class="touch-btn py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base">Guardar y "Reparado"</button>
        </div>
        <button id="cancel-cost-modal" type="button" class="touch-btn w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm">Cancelar</button>
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
  modalRoot.addEventListener('click', onBackdropClick);

  const input = modalRoot.querySelector('#cost-input');
  input.focus();
  input.select();

  input.addEventListener('input', () => {
    input.value = formatCopInput(input.value);
  });

  modalRoot.querySelectorAll('[data-preset-price]').forEach((btn) =>
    btn.addEventListener('click', () => {
      input.value = formatCopInput(btn.dataset.presetPrice);
    })
  );

  modalRoot.querySelector('#close-cost-modal').addEventListener('click', closeModal);
  modalRoot.querySelector('#cancel-cost-modal').addEventListener('click', closeModal);

  async function saveCost(alsoSetRepaired) {
    const val = parseCopInput(input.value);
    const patch = { costo_estimado: val };
    if (alsoSetRepaired) patch.estado = 'Reparado';
    try {
      await updateOrder(order.id, patch);
      showToast(alsoSetRepaired ? 'Precio guardado y marcado "Reparado"' : 'Precio actualizado');
      closeModal();
      await onRefreshOrders?.();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  }

  modalRoot.querySelector('#cost-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveCost(false);
  });
  modalRoot.querySelector('#save-and-repaired-btn').addEventListener('click', () => saveCost(true));
}
