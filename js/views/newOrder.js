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
    <section class="bg-white rounded-2xl border-2 border-slate-300 shadow-sm p-4 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-2 pb-4 mb-5 border-b-2 border-slate-200">
        <div>
          <h2 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Nueva Orden de Ingreso</h2>
          <p class="text-sm sm:text-base text-slate-600 font-medium">Toque rápido para recepción en mesón</p>
        </div>
        <span class="px-3 py-1 rounded-lg bg-slate-100 border border-slate-300 text-xs font-extrabold uppercase tracking-wider text-slate-700">
          Impresión automática al guardar
        </span>
      </div>

      <form id="new-order-form" class="space-y-6" novalidate>
        <!-- 1. Tipo de Equipo (Input inteligente + botón Rápidos al lado) -->
        <div id="equipment-field-wrap" class="relative">
          <label for="tipo-equipo-input" class="block text-sm sm:text-base font-black uppercase tracking-wide text-slate-800 mb-2">
            1. Tipo de Equipo *
          </label>

          <!-- Sugerencias rápidas compactas encima del input (horizontal en móvil, wrap en tablet/PC) -->
          <div
            id="equipment-suggestions-tray"
            class="hidden mb-2.5 p-2.5 sm:p-3 rounded-2xl border-2 border-blue-300 bg-slate-50 shadow-sm space-y-2"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-black uppercase tracking-wider text-blue-900">
                Toca para elegir o desliza →
              </span>
              <button
                id="close-equipment-tray-btn"
                type="button"
                class="text-xs font-black text-slate-700 hover:text-slate-900 px-2.5 py-1 rounded-lg bg-slate-200"
              >
                Ocultar
              </button>
            </div>
            <div id="equipment-suggestions-list" class="flex flex-nowrap overflow-x-auto no-scrollbar gap-2 pb-1 sm:flex-wrap sm:overflow-visible"></div>
          </div>

          <div class="flex items-stretch gap-2">
            <div class="relative flex-1 flex items-center">
              <input
                id="tipo-equipo-input"
                name="tipo_equipo"
                type="text"
                required
                autocomplete="off"
                placeholder="Ej: TV LCD/LED, Air Fryer Oster, Consola PS4..."
                class="w-full pl-4 pr-11 py-3.5 text-base sm:text-lg font-bold rounded-xl border-2 border-slate-400 focus:border-blue-600 focus:outline-none bg-white"
              />
              <button
                id="clear-equipment-btn"
                type="button"
                aria-label="Limpiar tipo de equipo"
                class="hidden absolute right-2 w-9 h-9 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-black text-base flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <button
              id="toggle-equipment-tray-btn"
              type="button"
              aria-expanded="false"
              class="touch-btn shrink-0 px-3.5 sm:px-4 py-3.5 rounded-xl border-2 border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-900 font-extrabold text-sm sm:text-base flex items-center justify-center gap-1"
            >
              <span>⚡ Rápidos</span>
            </button>
          </div>
        </div>

        <!-- 2. Accesorios Recibidos (Multi-tag acumulable + detalle libre) -->
        <div class="space-y-3">
          <label class="block text-sm sm:text-base font-black uppercase tracking-wide text-slate-800">
            2. Accesorios Recibidos
          </label>
          <div id="accessory-chips" class="flex flex-wrap gap-2.5">
            ${ACCESSORY_OPTIONS.map((acc) => `
              <button
                type="button"
                data-accessory="${escapeHtml(acc)}"
                class="touch-chip px-4 py-2.5 rounded-xl border-2 font-extrabold text-sm sm:text-base text-center flex items-center justify-center gap-1.5"
              >
                ${escapeHtml(acc)}
              </button>
            `).join('')}
          </div>
          <div>
            <label for="accesorios-detalle-input" class="block text-xs sm:text-sm font-extrabold uppercase tracking-wide text-slate-700 mb-1.5">
              Otros accesorios o detalles:
            </label>
            <input
              id="accesorios-detalle-input"
              name="accesorios_detalle"
              type="text"
              autocomplete="off"
              placeholder="Ej: incluye estuche, cable HDMI, adaptador 12V..."
              class="w-full px-4 py-3 text-base sm:text-lg font-semibold rounded-xl border-2 border-slate-300 focus:border-blue-600 focus:outline-none bg-slate-50 focus:bg-white"
            />
          </div>
        </div>

        <!-- 3. Datos del Cliente -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="cliente-nombre" class="block text-sm sm:text-base font-black uppercase tracking-wide text-slate-800 mb-1.5">
              3. Nombre del Cliente *
            </label>
            <input
              id="cliente-nombre"
              name="cliente_nombre"
              type="text"
              required
              autocomplete="name"
              placeholder="Ej: Juan Pérez"
              class="w-full px-4 py-3.5 text-lg font-bold rounded-xl border-2 border-slate-400 focus:border-blue-600 focus:outline-none bg-white"
            />
          </div>

          <div>
            <label for="cliente-telefono" class="block text-sm sm:text-base font-black uppercase tracking-wide text-slate-800 mb-1.5">
              4. WhatsApp / Teléfono *
            </label>
            <input
              id="cliente-telefono"
              name="cliente_telefono"
              type="tel"
              inputmode="tel"
              required
              autocomplete="tel"
              placeholder="Ej: 3001234567"
              class="w-full px-4 py-3.5 text-lg font-bold rounded-xl border-2 border-slate-400 focus:border-blue-600 focus:outline-none bg-white"
            />
          </div>
        </div>

        <!-- 4. Falla Reportada -->
        <div>
          <label for="falla-reportada" class="block text-sm sm:text-base font-black uppercase tracking-wide text-slate-800 mb-2">
            5. Falla Reportada *
          </label>
          <div id="fault-chips" class="flex flex-wrap gap-2 mb-3">
            ${FAULT_CHIPS.map((fault) => `
              <button
                type="button"
                data-fault="${escapeHtml(fault)}"
                class="touch-chip px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-slate-50 hover:bg-blue-50 hover:border-blue-500 text-slate-900 font-bold text-sm sm:text-base"
              >
                + ${escapeHtml(fault)}
              </button>
            `).join('')}
          </div>
          <textarea
            id="falla-reportada"
            name="falla_reportada"
            rows="2"
            required
            placeholder="Describe la falla o toca los botones de arriba..."
            class="w-full px-4 py-3 text-lg font-semibold rounded-xl border-2 border-slate-400 focus:border-blue-600 focus:outline-none bg-white"
          ></textarea>
        </div>

        <!-- 5. Observaciones -->
        <div>
          <label for="observaciones" class="block text-sm sm:text-base font-black uppercase tracking-wide text-slate-800 mb-1.5">
            6. Observaciones
          </label>
          <input
            id="observaciones"
            name="observaciones"
            type="text"
            value="Revisar y cotizar antes de reparar"
            class="w-full px-4 py-3.5 text-base sm:text-lg font-semibold rounded-xl border-2 border-slate-300 focus:border-blue-600 focus:outline-none bg-slate-50 focus:bg-white"
          />
        </div>

        <!-- Botón Principal -->
        <div class="pt-2">
          <button
            id="submit-order-btn"
            type="submit"
            class="touch-btn w-full py-4 sm:py-5 px-6 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xl sm:text-2xl tracking-wide shadow-lg border-2 border-emerald-900 flex items-center justify-center gap-3"
          >
            <span>✅ REGISTRAR ORDEN</span>
          </button>
        </div>
      </form>
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
      ? 'touch-btn shrink-0 px-3.5 sm:px-4 py-3.5 rounded-xl border-2 border-blue-700 bg-blue-700 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-1'
      : 'touch-btn shrink-0 px-3.5 sm:px-4 py-3.5 rounded-xl border-2 border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-900 font-extrabold text-sm sm:text-base flex items-center justify-center gap-1';

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
            class="touch-chip shrink-0 px-3.5 py-2 rounded-xl border-2 font-extrabold text-sm sm:text-base transition-colors ${
              isExact
                ? 'bg-blue-700 text-white border-blue-900 shadow-sm'
                : 'bg-white text-slate-900 border-slate-300 hover:border-blue-600 hover:bg-blue-50'
            }"
          >
            ${escapeHtml(item)}
          </button>
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
    accButtons.forEach((btn) => {
      const acc = btn.dataset.accessory;
      const active = selectedAccessories.has(acc);
      const isNone = acc === 'Sin accesorios';
      btn.className = active
        ? isNone
          ? 'touch-chip px-4 py-2.5 rounded-xl border-2 font-extrabold text-sm sm:text-base text-center flex items-center justify-center gap-1.5 bg-slate-900 text-white border-slate-900 shadow-sm'
          : 'touch-chip px-4 py-2.5 rounded-xl border-2 font-extrabold text-sm sm:text-base text-center flex items-center justify-center gap-1.5 bg-blue-700 text-white border-blue-900 shadow-sm'
        : 'touch-chip px-4 py-2.5 rounded-xl border-2 font-extrabold text-sm sm:text-base text-center flex items-center justify-center gap-1.5 bg-slate-50 text-slate-800 border-slate-300 hover:border-slate-500';
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
        faultInput.value = `${current}, ${text}`;
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
      showToast(`Error al guardar: ${err.message || 'Verifica Supabase'}`, 'error');
    } finally {
      isSubmitting = false;
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>✅ REGISTRAR ORDEN</span>';
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
    <div class="bg-white rounded-3xl border-4 border-emerald-600 shadow-2xl max-w-lg w-full p-5 sm:p-7 space-y-5">
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
    </div>
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

