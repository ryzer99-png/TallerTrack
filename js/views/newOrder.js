import { createOrder } from '../ordersService.js';
import { escapeHtml, getPublicOrderUrl, showToast } from '../utils.js';
import { buildReceiptWhatsAppUrl } from '../whatsapp.js';

const EQUIPMENT_SUGGESTIONS = [
  'TV LCD/LED',
  'Equipo Sonido',
  'Microondas',
  'Consola',
  'Tarjeta Electrónica',
  'Tarjeta Nevera',
  'Amplificador',
  'Pequeño Electrodoméstico',
];

const ACCESSORY_OPTIONS = [
  'Sin accesorios',
  'Cable de poder',
  'Control remoto',
  'Adaptador / Cargador',
  'Batería',
  'Bases / Patas',
];

const FAULT_CHIPS = [
  'No enciende',
  'No da imagen / pantalla oscura',
  'Sin sonido',
  'En corto',
];

function buildAccessoriesPayload(selectedTags, detailText) {
  const cleanDetail = detailText.trim();
  const activeTags = Array.from(selectedTags).filter((t) => t !== 'Sin accesorios');

  if (selectedTags.has('Sin accesorios') && !cleanDetail) {
    return 'Ninguno';
  }
  if (activeTags.length > 0 && cleanDetail) {
    return `${activeTags.join(', ')}. Detalle: ${cleanDetail}`;
  }
  if (activeTags.length > 0) {
    return activeTags.join(', ');
  }
  if (cleanDetail) {
    return `Detalle: ${cleanDetail}`;
  }
  return 'Ninguno';
}

export function renderNewOrderView(container, { onOrderCreated, onGoToActive }) {
  let selectedAccessories = new Set(['Sin accesorios']);
  let isEquipmentTrayOpen = false;
  let isSubmitting = false;

  container.innerHTML = `
    <section class="bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-300/40 overflow-hidden">
      <!-- Barra de acento superior estilo consola de precisión -->
      <div class="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500"></div>

      <div class="p-4 sm:p-6 space-y-6">
        <!-- Encabezado de Consola -->
        <div class="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-200/80">
          <div>
            <h2 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Nueva Orden de Ingreso</h2>
            <p class="text-sm text-slate-500 font-medium mt-0.5">Recepción rápida de equipos en mesón</p>
          </div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-dashed border-emerald-300">
            <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
            <span>Impresión automática al guardar</span>
          </span>
        </div>

        <form id="new-order-form" class="space-y-5" novalidate>
          <!-- ZONA 1: IDENTIFICACIÓN DEL EQUIPO -->
          <div class="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5 space-y-5">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono text-[11px] font-bold">01</span>
              <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-600">Identificación del Equipo</h3>
            </div>

            <!-- 1. Tipo de Equipo (Input inteligente + sugerencias encima + píldora Rápidos integrada) -->
            <div id="equipment-field-wrap" class="relative">
              <label for="tipo-equipo-input" class="block text-sm font-bold text-slate-800 mb-2">
                Tipo de Equipo <span class="text-red-600">*</span>
              </label>

              <!-- Sugerencias rápidas compactas encima del input -->
              <div
                id="equipment-suggestions-tray"
                class="hidden mb-2.5 p-2.5 sm:p-3 rounded-xl border border-blue-200 bg-white shadow-md shadow-slate-200/60 space-y-2"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                    Toca para elegir o desliza →
                  </span>
                  <button
                    id="close-equipment-tray-btn"
                    type="button"
                    class="text-xs font-bold text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    Ocultar
                  </button>
                </div>
                <div id="equipment-suggestions-list" class="flex flex-nowrap overflow-x-auto no-scrollbar gap-2 pb-1 sm:flex-wrap sm:overflow-visible"></div>
              </div>

              <!-- Contenedor unificado de input + píldora Rápidos -->
              <div class="flex items-center rounded-xl border border-slate-300 bg-slate-50/70 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600 transition-all duration-150 pr-1.5">
                <div class="pl-3.5 text-slate-400 pointer-events-none shrink-0">
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
                </div>
                <input
                  id="tipo-equipo-input"
                  name="tipo_equipo"
                  type="text"
                  required
                  autocomplete="off"
                  placeholder="Ej: TV LCD/LED, Air Fryer Oster, Consola PS4..."
                  class="w-full min-h-[48px] px-3 py-2.5 text-base sm:text-lg font-semibold text-slate-900 bg-transparent focus:outline-none"
                />
                <button
                  id="clear-equipment-btn"
                  type="button"
                  aria-label="Limpiar tipo de equipo"
                  class="hidden shrink-0 w-8 h-8 mr-1 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-bold text-sm flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
                <button
                  id="toggle-equipment-tray-btn"
                  type="button"
                  aria-expanded="false"
                  class="shrink-0 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs sm:text-sm flex items-center gap-1 transition-colors duration-150"
                >
                  <span>⚡ Rápidos</span>
                </button>
              </div>
            </div>

            <!-- 2. Accesorios Recibidos (Multi-tag acumulable + detalle libre) -->
            <div class="space-y-3">
              <label class="block text-sm font-bold text-slate-800">
                Accesorios Recibidos
              </label>
              <div id="accessory-chips" class="flex flex-wrap gap-2">
                ${ACCESSORY_OPTIONS.map((acc) => `
                  <button
                    type="button"
                    data-accessory="${escapeHtml(acc)}"
                    class="touch-chip px-3.5 py-2 rounded-xl border font-semibold text-sm text-center inline-flex items-center justify-center gap-1.5"
                  >
                    ${escapeHtml(acc)}
                  </button>
                `).join('')}
              </div>
              <div>
                <label for="accesorios-detalle-input" class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Otros accesorios o detalles:
                </label>
                <input
                  id="accesorios-detalle-input"
                  name="accesorios_detalle"
                  type="text"
                  autocomplete="off"
                  placeholder="Ej: incluye estuche, cable HDMI, adaptador 12V..."
                  class="w-full min-h-[46px] px-3.5 py-2.5 text-base font-medium rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none transition-all duration-150"
                />
              </div>
            </div>
          </div>

          <!-- ZONA 2: CLIENTE Y CONTACTO -->
          <div class="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5 space-y-4">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono text-[11px] font-bold">02</span>
              <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-600">Cliente y Contacto</h3>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="cliente-nombre" class="block text-sm font-bold text-slate-800 mb-1.5">
                  Nombre del Cliente <span class="text-red-600">*</span>
                </label>
                <div class="relative flex items-center">
                  <span class="absolute left-3.5 text-slate-400 pointer-events-none">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </span>
                  <input
                    id="cliente-nombre"
                    name="cliente_nombre"
                    type="text"
                    required
                    autocomplete="name"
                    placeholder="Ej: Juan Pérez"
                    class="w-full min-h-[48px] pl-10 pr-4 py-2.5 text-base sm:text-lg font-semibold rounded-xl border border-slate-300 bg-slate-50/70 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none transition-all duration-150"
                  />
                </div>
              </div>

              <div>
                <label for="cliente-telefono" class="block text-sm font-bold text-slate-800 mb-1.5">
                  WhatsApp / Teléfono <span class="text-red-600">*</span>
                </label>
                <div class="relative flex items-center">
                  <span class="absolute left-3.5 text-slate-400 pointer-events-none">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </span>
                  <input
                    id="cliente-telefono"
                    name="cliente_telefono"
                    type="tel"
                    inputmode="tel"
                    required
                    autocomplete="tel"
                    placeholder="Ej: 3001234567"
                    class="w-full min-h-[48px] pl-10 pr-4 py-2.5 text-base sm:text-lg font-semibold font-mono rounded-xl border border-slate-300 bg-slate-50/70 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none transition-all duration-150"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- ZONA 3: DIAGNÓSTICO INICIAL -->
          <div class="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5 space-y-4">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono text-[11px] font-bold">03</span>
              <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-600">Diagnóstico Inicial</h3>
            </div>

            <div>
              <label for="falla-reportada" class="block text-sm font-bold text-slate-800 mb-2">
                Falla Reportada <span class="text-red-600">*</span>
              </label>
              <div id="fault-chips" class="flex flex-wrap gap-2 mb-2.5">
                ${FAULT_CHIPS.map((fault) => `
                  <button
                    type="button"
                    data-fault="${escapeHtml(fault)}"
                    class="touch-chip px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-700 font-semibold text-sm transition-colors duration-150"
                  >
                    + ${escapeHtml(fault)}
                  </button>
                `).join('')}
              </div>
              <div class="relative">
                <span class="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none">
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                </span>
                <textarea
                  id="falla-reportada"
                  name="falla_reportada"
                  rows="2"
                  required
                  placeholder="Describe la falla o toca los chips de arriba..."
                  class="w-full pl-10 pr-4 py-3 text-base sm:text-lg font-medium rounded-xl border border-slate-300 bg-slate-50/70 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none transition-all duration-150"
                ></textarea>
              </div>
            </div>

            <div>
              <label for="observaciones" class="block text-sm font-bold text-slate-800 mb-1.5">
                Observaciones
              </label>
              <div class="relative flex items-center">
                <span class="absolute left-3.5 text-slate-400 pointer-events-none">
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </span>
                <input
                  id="observaciones"
                  name="observaciones"
                  type="text"
                  value="Revisar y cotizar antes de reparar"
                  class="w-full min-h-[48px] pl-10 pr-4 py-2.5 text-base font-medium rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none transition-all duration-150"
                />
              </div>
            </div>
          </div>

          <!-- Switch Principal de la Consola -->
          <div class="pt-1">
            <button
              id="submit-order-btn"
              type="submit"
              class="min-h-[54px] w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-lg tracking-wider uppercase shadow-lg shadow-emerald-600/25 active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2.5"
            >
              <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
              <span>Registrar Orden</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  `;

  const form = container.querySelector('#new-order-form');
  const eqFieldWrap = container.querySelector('#equipment-field-wrap');
  const eqInput = container.querySelector('#tipo-equipo-input');
  const toggleEqTrayBtn = container.querySelector('#toggle-equipment-tray-btn');
  const clearEqBtn = container.querySelector('#clear-equipment-btn');
  const eqTray = container.querySelector('#equipment-suggestions-tray');
  const eqSuggestionsList = container.querySelector('#equipment-suggestions-list');
  const closeEqTrayBtn = container.querySelector('#close-equipment-tray-btn');
  const accButtons = container.querySelectorAll('[data-accessory]');
  const accDetailInput = container.querySelector('#accesorios-detalle-input');
  const faultButtons = container.querySelectorAll('[data-fault]');
  const faultInput = container.querySelector('#falla-reportada');
  const submitBtn = container.querySelector('#submit-order-btn');

  function syncEquipmentUI() {
    const query = eqInput.value.trim();
    clearEqBtn.classList.toggle('hidden', query.length === 0);
    eqTray.classList.toggle('hidden', !isEquipmentTrayOpen);
    toggleEqTrayBtn.setAttribute('aria-expanded', isEquipmentTrayOpen ? 'true' : 'false');
    toggleEqTrayBtn.className = isEquipmentTrayOpen
      ?'shrink-0 px-3 py-2 rounded-lg border border-blue-700 bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1 transition-colors duration-150 shadow-sm'
      : 'shrink-0 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs sm:text-sm flex items-center gap-1 transition-colors duration-150';

    if (!isEquipmentTrayOpen) return;

    const qLower = query.toLowerCase();
    const matches = qLower
      ? EQUIPMENT_SUGGESTIONS.filter((item) => item.toLowerCase().includes(qLower))
      : EQUIPMENT_SUGGESTIONS;
    const listToRender = matches.length > 0 ? matches : EQUIPMENT_SUGGESTIONS;

    eqSuggestionsList.innerHTML = listToRender
      .map((item) => {
        const isExact = item.toLowerCase() === qLower;
        return `
          <button
            type="button"
            data-eq-suggestion="${escapeHtml(item)}"
              isExact
            ? 'bg-blue-700 text-white border-blue-800 shadow-sm'
            : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-blue-400 hover:bg-blue-50'
      }"
      >
      ${ escapeHtml(item) }
          </button >
        `;
      })
      .join('');

    // Usar click (y no pointerdown) evita selecciones accidentales al hacer scroll en móvil
    eqSuggestionsList.querySelectorAll('[data-eq-suggestion]').forEach((btn) => {
      btn.addEventListener('click', () => {
        eqInput.value = btn.dataset.eqSuggestion;
        isEquipmentTrayOpen = false;
        syncEquipmentUI();
      });
    });
  }

  function syncAccessoriesUI() {
    const checkIcon = '<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    accButtons.forEach((btn) => {
      const acc = btn.dataset.accessory;
      const active = selectedAccessories.has(acc);
      const isNone = acc === 'Sin accesorios';
      btn.className = active
        ? isNone
          ? 'touch-chip px-3.5 py-2 rounded-xl border font-semibold text-sm text-center inline-flex items-center justify-center gap-1.5 bg-slate-900 text-white border-slate-900 shadow-sm'
          : 'touch-chip px-3.5 py-2 rounded-xl border font-semibold text-sm text-center inline-flex items-center justify-center gap-1.5 bg-indigo-700 text-white border-indigo-800 shadow-sm'
        : 'touch-chip px-3.5 py-2 rounded-xl border font-semibold text-sm text-center inline-flex items-center justify-center gap-1.5 bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50';
      btn.innerHTML = active ? `${ checkIcon } < span > ${ escapeHtml(acc) }</span > ` : ` < span > ${ escapeHtml(acc) }</span > `;
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function resetFormState() {
    form.reset();
    eqInput.value = '';
    accDetailInput.value = '';
    isEquipmentTrayOpen = false;
    selectedAccessories = new Set(['Sin accesorios']);
    container.querySelector('#observaciones').value = 'Revisar y cotizar antes de reparar';
    syncEquipmentUI();
    syncAccessoriesUI();
  }

  toggleEqTrayBtn.addEventListener('click', () => {
    isEquipmentTrayOpen = !isEquipmentTrayOpen;
    syncEquipmentUI();
  });

  eqInput.addEventListener('input', () => {
    const qLower = eqInput.value.trim().toLowerCase();
    const hasMatches =
      qLower.length > 0 &&
      EQUIPMENT_SUGGESTIONS.some((item) => item.toLowerCase().includes(qLower));
    isEquipmentTrayOpen = hasMatches;
    syncEquipmentUI();
  });

  clearEqBtn.addEventListener('click', () => {
    eqInput.value = '';
    isEquipmentTrayOpen = false;
    syncEquipmentUI();
    eqInput.focus();
  });

  closeEqTrayBtn.addEventListener('click', () => {
    isEquipmentTrayOpen = false;
    syncEquipmentUI();
  });

  const onOutsidePointerDown = (e) => {
    if (!document.body.contains(eqFieldWrap)) {
      document.removeEventListener('pointerdown', onOutsidePointerDown);
      return;
    }
    if (isEquipmentTrayOpen && !eqFieldWrap.contains(e.target)) {
      isEquipmentTrayOpen = false;
      syncEquipmentUI();
    }
  };
  document.addEventListener('pointerdown', onOutsidePointerDown);

  accButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const acc = btn.dataset.accessory;
      if (acc === 'Sin accesorios') {
        selectedAccessories = new Set(['Sin accesorios']);
        accDetailInput.value = '';
      } else {
        selectedAccessories.delete('Sin accesorios');
        if (selectedAccessories.has(acc)) {
          selectedAccessories.delete(acc);
        } else {
          selectedAccessories.add(acc);
        }
        if (selectedAccessories.size === 0 && !accDetailInput.value.trim()) {
          selectedAccessories.add('Sin accesorios');
        }
      }
      syncAccessoriesUI();
    });
  });

  accDetailInput.addEventListener('input', () => {
    if (accDetailInput.value.trim()) {
      selectedAccessories.delete('Sin accesorios');
    } else if (selectedAccessories.size === 0) {
      selectedAccessories.add('Sin accesorios');
    }
    syncAccessoriesUI();
  });

  faultButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.fault;
      const current = faultInput.value.trim();
      if (!current) {
        faultInput.value = text;
      } else if (!current.toLowerCase().includes(text.toLowerCase())) {
        faultInput.value = `${ current }, ${ text }`;
      }
      faultInput.focus();
    });
  });

  syncEquipmentUI();
  syncAccessoriesUI();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const finalEquipment = eqInput.value.trim();
    const clienteNombre = container.querySelector('#cliente-nombre').value.trim();
    const clienteTelefono = container.querySelector('#cliente-telefono').value.trim();
    const fallaReportada = faultInput.value.trim();
    const observaciones = container.querySelector('#observaciones').value.trim() || 'Revisar y cotizar antes de reparar';

    if (!finalEquipment) {
      showToast('Indica el tipo de equipo', 'error');
      eqInput.focus();
      return;
    }
    if (!clienteNombre) {
      showToast('Falta el nombre del cliente', 'error');
      container.querySelector('#cliente-nombre').focus();
      return;
    }
    if (!clienteTelefono) {
      showToast('Falta el teléfono / WhatsApp del cliente', 'error');
      container.querySelector('#cliente-telefono').focus();
      return;
    }
    if (!fallaReportada) {
      showToast('Indica la falla reportada', 'error');
      faultInput.focus();
      return;
    }

    const accesoriosText = buildAccessoriesPayload(selectedAccessories, accDetailInput.value);

    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Guardando orden...</span>';

    try {
      const created = await createOrder({
        cliente_nombre: clienteNombre,
        cliente_telefono: clienteTelefono,
        tipo_equipo: finalEquipment,
        accesorios: accesoriosText,
        falla_reportada: fallaReportada,
        observaciones,
      });

      resetFormState();
      onOrderCreated?.(created);
      showOrderConfirmationModal(created, {
        onCreateAnother: () => {
          eqInput.focus();
        },
        onGoToActive,
      });
    } catch (err) {
      console.error('Error al registrar orden:', err);
      showToast(`Error al guardar: ${ err.message || 'Verifica Supabase' }`, 'error');
    } finally {
      isSubmitting = false;
      submitBtn.disabled = false;
      submitBtn.innerHTML =
        '<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg><span>Registrar Orden</span>';
    }
  });
}

function showOrderConfirmationModal(order, { onCreateAnother, onGoToActive }) {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  const waUrl = buildReceiptWhatsAppUrl(order);
  const publicUrl = getPublicOrderUrl(order);

  modalRoot.className = 'fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4';
  modalRoot.innerHTML = `
      < div class= "bg-white rounded-3xl border-4 border-emerald-600 shadow-2xl max-w-lg w-full p-5 sm:p-7 space-y-5" >
      <div class="text-center space-y-2">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 text-3xl font-black">
          ✓
        </div>
        <p class="text-sm font-black uppercase tracking-widest text-emerald-700">Orden Registrada</p>
        <div class="py-2 px-4 rounded-2xl bg-slate-900 text-white inline-block">
          <span class="text-xs uppercase font-bold tracking-widest text-slate-300 block">N° de Orden</span>
          <span class="text-4xl sm:text-5xl font-black font-mono tracking-tight">#${escapeHtml(order.numero_orden)}</span>
        </div>
        <p class="text-base font-bold text-slate-800 pt-1">
          ${escapeHtml(order.cliente_nombre)} — ${escapeHtml(order.tipo_equipo)}
        </p>
        <p class="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded-lg px-3 py-1.5 inline-block">
          🖨️ Enviada a cola de impresión (impresa: false)
        </p>
      </div>

      <div class="space-y-3">
        <a
          href="${escapeHtml(waUrl)}"
          target="_blank"
          rel="noopener noreferrer"
          class="touch-btn w-full py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg text-center flex items-center justify-center gap-2 shadow-md border-2 border-emerald-800"
        >
          <span>📲 Enviar Comprobante por WhatsApp</span>
        </a>

        <div class="flex gap-2">
          <button
            id="copy-public-link-btn"
            type="button"
            class="touch-btn flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-sm border-2 border-slate-300"
          >
            🔗 Copiar enlace cliente
          </button>
          <a
            href="${escapeHtml(publicUrl)}"
            target="_blank"
            rel="noopener noreferrer"
            class="touch-btn py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-sm border-2 border-slate-300 flex items-center"
          >
            👁️ Ver ficha
          </a>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 pt-2 border-t-2 border-slate-200">
        <button
          id="modal-new-order-btn"
          type="button"
          class="touch-btn py-3.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-base"
        >
          + Otra Orden
        </button>
        <button
          id="modal-go-active-btn"
          type="button"
          class="touch-btn py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-base"
        >
          Ver Tablero
        </button>
      </div>
    </div >
        `;

  const closeModal = () => {
    modalRoot.className = 'fixed inset-0 z-50 hidden';
    modalRoot.innerHTML = '';
  };

  modalRoot.querySelector('#copy-public-link-btn').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      showToast('Enlace copiado al portapapeles');
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

