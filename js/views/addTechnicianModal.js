import { createTechnician } from '../services/tecnicosService.js';
import { showToast } from '../utils.js';

const TECH_COLORS = ['#1d4ed8', '#0f766e', '#7c3aed', '#b45309', '#be185d', '#0369a1'];

/** Modal para agregar un nuevo técnico con su color identificador. */
export function openAddTechnicianModal(onRefreshOrders) {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  let selectedColor = TECH_COLORS[0];

  modalRoot.className = 'fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-3 sm:p-4';
  modalRoot.innerHTML = `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto p-5 space-y-4">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-lg font-black text-slate-900">Agregar Técnico</h3>
        <button id="close-tech-modal" type="button" class="touch-btn min-w-[44px] px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 font-black" aria-label="Cerrar">✕</button>
      </div>
      <form id="add-tech-form" class="space-y-4">
        <div>
          <label for="tech-name-input" class="block text-xs font-black uppercase text-slate-700 mb-1">Nombre del Técnico</label>
          <input
            id="tech-name-input"
            type="text"
            required
            placeholder="Ej: Carlos"
            class="w-full min-h-[44px] px-3.5 py-2.5 text-base font-bold rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          />
        </div>
        <div>
          <span class="block text-xs font-black uppercase text-slate-700 mb-2">Color identificador</span>
          <div class="flex flex-wrap gap-2.5">
            ${TECH_COLORS.map(
              (c, idx) => `
              <button
                type="button"
                data-tech-color-pick="${c}"
                class="w-10 h-10 rounded-full border-2 transition-transform ${idx === 0 ? 'border-slate-900 scale-110' : 'border-white shadow'}"
                style="background-color: ${c}"
              ></button>`
            ).join('')}
          </div>
        </div>
        <div class="flex gap-2 pt-1">
          <button id="cancel-tech-modal" type="button" class="touch-btn px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm">Cancelar</button>
          <button type="submit" class="touch-btn flex-1 py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-black text-base">Guardar Técnico</button>
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
  modalRoot.addEventListener('click', onBackdropClick);

  const nameInput = modalRoot.querySelector('#tech-name-input');
  nameInput.focus();
  modalRoot.querySelector('#close-tech-modal').addEventListener('click', closeModal);
  modalRoot.querySelector('#cancel-tech-modal').addEventListener('click', closeModal);

  modalRoot.querySelectorAll('[data-tech-color-pick]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedColor = btn.dataset.techColorPick;
      modalRoot.querySelectorAll('[data-tech-color-pick]').forEach((b) => {
        const active = b.dataset.techColorPick === selectedColor;
        b.className = `w-10 h-10 rounded-full border-2 transition-transform ${active ? 'border-slate-900 scale-110' : 'border-white shadow'}`;
      });
    });
  });

  modalRoot.querySelector('#add-tech-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = nameInput.value.trim();
    if (!nombre) return;
    try {
      await createTechnician({ nombre, color: selectedColor });
      showToast(`Técnico "${nombre}" agregado`);
      closeModal();
      await onRefreshOrders?.();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  });
}
