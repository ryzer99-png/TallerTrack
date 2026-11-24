import { buildEquipmentCatalog, normalizeEquipmentKey } from '../domain/equipos.js';
import { buildAccessoriesPayload, validateOrderPayload } from '../domain/orden.js';
import { createOrder } from '../services/ordenesService.js';
import { escapeHtml, showToast } from '../utils.js';
import { showOrderConfirmationModal } from './newOrderConfirmModal.js';
import { renderNewOrderTemplate } from './newOrderTemplate.js';
import { bindReturningClientLookup } from './returningClientBox.js';

/** Renderiza y conecta el formulario de recepción de nueva orden. */
export function renderNewOrderView(container, { technicians = [], getOrders = () => [], onOrderCreated, onGoToActive }) {
  let selectedAccessories = new Set(['Sin accesorios']);
  let selectedTechnicianId = null;
  let isUrgent = false;
  let isEquipmentTrayOpen = false;
  let isSubmitting = false;

  container.innerHTML = renderNewOrderTemplate(technicians);

  const form = container.querySelector('#new-order-form');
  const eqWrap = container.querySelector('#equipment-field-wrap');
  const eqInput = container.querySelector('#tipo-equipo-input');
  const eqTray = container.querySelector('#equipment-suggestions-tray');
  const eqSuggestionsList = container.querySelector('#equipment-suggestions-list');
  const clearEqBtn = container.querySelector('#clear-equipment-btn');
  const toggleEqTrayBtn = container.querySelector('#toggle-equipment-tray-btn');
  const closeEqTrayBtn = container.querySelector('#close-equipment-tray-btn');
  const accButtons = container.querySelectorAll('[data-accessory]');
  const accDetailInput = container.querySelector('#accesorios-detalle-input');
  const faultButtons = container.querySelectorAll('[data-fault]');
  const faultInput = container.querySelector('#falla-reportada');
  const techButtons = container.querySelectorAll('[data-tech-id]');
  const priorityButtons = container.querySelectorAll('[data-priority]');
  const priorityHint = container.querySelector('#priority-hint');
  const submitBtn = container.querySelector('#submit-order-btn');

  function syncEquipmentUI() {
    const query = eqInput.value.trim();
    clearEqBtn.classList.toggle('hidden', query.length === 0);
    eqTray.classList.toggle('hidden', !isEquipmentTrayOpen);
    toggleEqTrayBtn.setAttribute('aria-expanded', isEquipmentTrayOpen ? 'true' : 'false');
    toggleEqTrayBtn.className = isEquipmentTrayOpen
      ? 'shrink-0 min-h-[44px] px-3 py-2 rounded-lg border border-blue-700 bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1 transition-colors duration-150 shadow-sm'
      : 'shrink-0 min-h-[44px] px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs sm:text-sm flex items-center gap-1 transition-colors duration-150';

    if (!isEquipmentTrayOpen) return;

    const catalog = buildEquipmentCatalog(getOrders());
    const qKey = normalizeEquipmentKey(query);
    const matches = qKey ? catalog.filter((item) => item.key.includes(qKey)) : catalog;
    const listToRender = (matches.length > 0 ? matches : catalog).slice(0, 12);

    eqSuggestionsList.innerHTML = listToRender
      .map((item) => {
        const isExact = item.key === qKey;
        return `
          <button
            type="button"
            data-eq-suggestion="${escapeHtml(item.label)}"
            class="touch-chip w-full min-h-[42px] px-2.5 py-2 rounded-xl border font-semibold text-xs sm:text-sm text-center flex items-center justify-center leading-tight transition-colors duration-150 ${
              isExact ? 'bg-blue-700 text-white border-blue-800 shadow-sm' : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-blue-400 hover:bg-blue-50'
            }"
          >${escapeHtml(item.label)}</button>`;
      })
      .join('');

    eqSuggestionsList.querySelectorAll('[data-eq-suggestion]').forEach((btn) =>
      btn.addEventListener('click', () => {
        eqInput.value = btn.dataset.eqSuggestion;
        isEquipmentTrayOpen = false;
        syncEquipmentUI();
      })
    );
  }

  function syncAccessoriesUI() {
    const checkIcon = '<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    accButtons.forEach((btn) => {
      const acc = btn.dataset.accessory;
      const active = selectedAccessories.has(acc);
      const isNone = acc === 'Sin accesorios';
      btn.className = active
        ? isNone
          ? 'touch-chip w-full px-2.5 sm:px-3 py-2 rounded-xl border font-semibold text-xs sm:text-sm text-center leading-tight flex items-center justify-center gap-1.5 bg-slate-900 text-white border-slate-900 shadow-sm'
          : 'touch-chip w-full px-2.5 sm:px-3 py-2 rounded-xl border font-semibold text-xs sm:text-sm text-center leading-tight flex items-center justify-center gap-1.5 bg-indigo-700 text-white border-indigo-800 shadow-sm'
        : 'touch-chip w-full px-2.5 sm:px-3 py-2 rounded-xl border font-semibold text-xs sm:text-sm text-center leading-tight flex items-center justify-center gap-1.5 bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50';
      btn.innerHTML = active ? `${checkIcon}${escapeHtml(acc)}` : escapeHtml(acc);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function syncAssignmentUI() {
    const checkIcon = '<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    techButtons.forEach((btn) => {
      const active = (btn.dataset.techId || null) === selectedTechnicianId;
      btn.className = active
        ? 'touch-chip py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/10'
        : 'touch-chip py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700';
      const dotHtml = btn.dataset.techColor
        ? `<span class="w-2.5 h-2.5 rounded-full shrink-0 ${active ? 'ring-1 ring-white/60' : ''}" style="background-color: ${escapeHtml(btn.dataset.techColor)}"></span>`
        : '';
      btn.innerHTML = `${active ? checkIcon : dotHtml}<span class="truncate">${escapeHtml(btn.dataset.techName || '')}</span>`;
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    priorityButtons.forEach((btn) => {
      const isUrgentBtn = btn.dataset.priority === 'Urgente / Garantía';
      const active = isUrgentBtn ? isUrgent : !isUrgent;
      btn.className = active && isUrgentBtn
        ? 'touch-chip py-2 px-2.5 rounded-lg border text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1 bg-amber-50 border-amber-300 text-amber-800 shadow-sm'
        : active
          ? 'touch-chip py-2 px-2.5 rounded-lg border text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1 bg-slate-900 border-slate-900 text-white shadow-sm'
          : 'touch-chip py-2 px-2.5 rounded-lg border border-transparent text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1 text-slate-600 hover:bg-slate-50';
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    if (priorityHint) {
      priorityHint.textContent = isUrgent ? 'Atención prioritaria en mesa y taller' : 'Orden regular de ingreso en taller';
      priorityHint.className = isUrgent ? 'text-[11px] font-semibold text-amber-700' : 'text-[11px] font-medium text-slate-500';
    }
  }

  const clientNameInput = container.querySelector('#cliente-nombre');
  const clientPhoneInput = container.querySelector('#cliente-telefono');
  const returningClient = bindReturningClientLookup({
    container,
    clientNameInput,
    clientPhoneInput,
    eqInput,
    onEquipmentPicked: syncEquipmentUI,
  });

  function resetFormState() {
    form.reset();
    eqInput.value = '';
    accDetailInput.value = '';
    isEquipmentTrayOpen = false;
    selectedAccessories = new Set(['Sin accesorios']);
    selectedTechnicianId = null;
    isUrgent = false;
    container.querySelector('#observaciones').value = 'Revisar y cotizar antes de reparar';
    returningClient.clearBox();
    syncEquipmentUI();
    syncAccessoriesUI();
    syncAssignmentUI();
  }

  techButtons.forEach((btn) => btn.addEventListener('click', () => { selectedTechnicianId = btn.dataset.techId || null; syncAssignmentUI(); }));
  priorityButtons.forEach((btn) => btn.addEventListener('click', () => { isUrgent = btn.dataset.priority === 'Urgente / Garantía'; syncAssignmentUI(); }));
  toggleEqTrayBtn.addEventListener('click', () => { isEquipmentTrayOpen = !isEquipmentTrayOpen; syncEquipmentUI(); });
  eqInput.addEventListener('input', () => {
    const qKey = normalizeEquipmentKey(eqInput.value);
    isEquipmentTrayOpen = qKey.length > 0 && buildEquipmentCatalog(getOrders()).some((item) => item.key.includes(qKey));
    syncEquipmentUI();
  });
  clearEqBtn.addEventListener('click', () => { eqInput.value = ''; isEquipmentTrayOpen = false; syncEquipmentUI(); eqInput.focus(); });
  closeEqTrayBtn.addEventListener('click', () => { isEquipmentTrayOpen = false; syncEquipmentUI(); });
  document.addEventListener('pointerdown', (e) => {
    if (!eqWrap.isConnected) return;
    if (isEquipmentTrayOpen && !eqWrap.contains(e.target)) { isEquipmentTrayOpen = false; syncEquipmentUI(); }
  });

  accButtons.forEach((btn) => btn.addEventListener('click', () => {
    const acc = btn.dataset.accessory;
    if (acc === 'Sin accesorios') { selectedAccessories = new Set(['Sin accesorios']); accDetailInput.value = ''; }
    else {
      selectedAccessories.delete('Sin accesorios');
      selectedAccessories.has(acc) ? selectedAccessories.delete(acc) : selectedAccessories.add(acc);
      if (selectedAccessories.size === 0 && !accDetailInput.value.trim()) selectedAccessories.add('Sin accesorios');
    }
    syncAccessoriesUI();
  }));
  accDetailInput.addEventListener('input', () => {
    accDetailInput.value.trim() ? selectedAccessories.delete('Sin accesorios') : selectedAccessories.size === 0 && selectedAccessories.add('Sin accesorios');
    syncAccessoriesUI();
  });
  faultButtons.forEach((btn) => btn.addEventListener('click', () => {
    const text = btn.dataset.fault;
    const current = faultInput.value.trim();
    if (!current) faultInput.value = text;
    else if (!current.toLowerCase().includes(text.toLowerCase())) faultInput.value = `${current}, ${text} `;
    faultInput.focus();
  }));

  const FIELD_SELECTORS = { tipo_equipo: eqInput, cliente_nombre: clientNameInput, cliente_telefono: clientPhoneInput, falla_reportada: faultInput };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const payload = {
      tipo_equipo: eqInput.value.trim(),
      accesorios: buildAccessoriesPayload(selectedAccessories, accDetailInput.value),
      cliente_nombre: clientNameInput.value.trim(),
      cliente_telefono: clientPhoneInput.value.trim(),
      falla_reportada: faultInput.value.trim(),
      observaciones: container.querySelector('#observaciones').value.trim(),
      tecnico_id: selectedTechnicianId,
      prioridad: isUrgent ? 'Urgente / Garantía' : 'Normal',
    };

    const validation = validateOrderPayload(payload);
    if (!validation.ok) {
      showToast(validation.errors[validation.firstField], 'error');
      FIELD_SELECTORS[validation.firstField]?.focus();
      return;
    }

    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Guardando orden...</span>';
    try {
      const created = await createOrder(payload);
      onOrderCreated?.(created);
      showOrderConfirmationModal(created, {
        onCreateAnother: () => { resetFormState(); eqInput.focus(); },
        onGoToActive: () => onGoToActive?.(),
      });
      resetFormState();
    } catch (err) {
      showToast(`Error al guardar: ${err.message}`, 'error');
    } finally {
      isSubmitting = false;
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg><span>REGISTRAR ORDEN</span>';
    }
  });

  syncEquipmentUI();
  syncAccessoriesUI();
  syncAssignmentUI();
}
