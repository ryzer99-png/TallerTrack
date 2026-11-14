import { createOrder } from '../ordersService.js';
import { escapeHtml, getPublicOrderUrl, showToast } from '../utils.js';
import { buildReceiptWhatsAppUrl } from '../whatsapp.js';

const EQUIPMENT_OPTIONS = [
  { id: 'TV LCD/LED', label: '📺 TV LCD / LED' },
  { id: 'Equipo de Sonido', label: '🔊 Sonido' },
  { id: 'Tarjeta Electrónica', label: '🔌 Tarjeta' },
  { id: 'Microondas', label: '♨️ Microondas' },
  { id: 'Otro', label: '🛠️ Otro' },
];

const ACCESSORY_OPTIONS = [
  'Sin accesorios',
  'Control',
  'Cable de poder',
  'Cargador/Adaptador',
];

const FAULT_CHIPS = [
  'No enciende',
  'No da imagen / pantalla oscura',
  'Sin sonido',
  'En corto',
];

export function renderNewOrderView(container, { onOrderCreated, onGoToActive }) {
  let selectedEquipment = 'TV LCD/LED';
  let customEquipment = '';
  let selectedAccessories = new Set(['Sin accesorios']);
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
        <!-- 1. Tipo de Equipo -->
        <div>
          <label class="block text-sm sm:text-base font-black uppercase tracking-wide text-slate-800 mb-2.5">
            1. Tipo de Equipo
          </label>
          <div id="equipment-chips" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            ${EQUIPMENT_OPTIONS.map((opt) => `
              <button
                type="button"
                data-equipment="${escapeHtml(opt.id)}"
                class="touch-chip px-3 py-3 rounded-xl border-2 font-extrabold text-base sm:text-lg text-center flex items-center justify-center"
              >
                ${escapeHtml(opt.label)}
              </button>
            `).join('')}
          </div>
          <div id="custom-equipment-wrap" class="hidden mt-3">
            <input
              id="custom-equipment-input"
              type="text"
              placeholder="Especifica el equipo (ej: Licuadora, Amplificador, Consola...)"
              class="w-full px-4 py-3.5 text-lg font-semibold rounded-xl border-2 border-slate-400 focus:border-blue-600 focus:outline-none bg-white"
            />
          </div>
        </div>

        <!-- 2. Accesorios -->
        <div>
          <label class="block text-sm sm:text-base font-black uppercase tracking-wide text-slate-800 mb-2.5">
            2. Accesorios Recibidos
          </label>
          <div id="accessory-chips" class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            ${ACCESSORY_OPTIONS.map((acc) => `
              <button
                type="button"
                data-accessory="${escapeHtml(acc)}"
                class="touch-chip px-3 py-3 rounded-xl border-2 font-extrabold text-sm sm:text-base text-center flex items-center justify-center"
              >
                ${escapeHtml(acc)}
              </button>
            `).join('')}
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
  const eqButtons = container.querySelectorAll('[data-equipment]');
  const customEqWrap = container.querySelector('#custom-equipment-wrap');
  const customEqInput = container.querySelector('#custom-equipment-input');
  const accButtons = container.querySelectorAll('[data-accessory]');
  const faultButtons = container.querySelectorAll('[data-fault]');
  const faultInput = container.querySelector('#falla-reportada');
  const submitBtn = container.querySelector('#submit-order-btn');

  function syncEquipmentUI() {
    eqButtons.forEach((btn) => {
      const active = btn.dataset.equipment === selectedEquipment;
      btn.className = active
        ? 'touch-chip px-3 py-3 rounded-xl border-2 font-extrabold text-base sm:text-lg text-center flex items-center justify-center bg-blue-700 text-white border-blue-900 shadow-md'
        : 'touch-chip px-3 py-3 rounded-xl border-2 font-extrabold text-base sm:text-lg text-center flex items-center justify-center bg-slate-50 text-slate-900 border-slate-300 hover:border-slate-500';
    });
    customEqWrap.classList.toggle('hidden', selectedEquipment !== 'Otro');
  }

  function syncAccessoriesUI() {
    accButtons.forEach((btn) => {
      const active = selectedAccessories.has(btn.dataset.accessory);
      btn.className = active
        ? 'touch-chip px-3 py-3 rounded-xl border-2 font-extrabold text-sm sm:text-base text-center flex items-center justify-center bg-slate-900 text-white border-slate-900 shadow-sm'
        : 'touch-chip px-3 py-3 rounded-xl border-2 font-extrabold text-sm sm:text-base text-center flex items-center justify-center bg-slate-50 text-slate-800 border-slate-300 hover:border-slate-500';
    });
  }

  eqButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedEquipment = btn.dataset.equipment;
      syncEquipmentUI();
      if (selectedEquipment === 'Otro') {
        customEqInput.focus();
      }
    });
  });

  accButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const acc = btn.dataset.accessory;
      if (acc === 'Sin accesorios') {
        selectedAccessories = new Set(['Sin accesorios']);
      } else {
        selectedAccessories.delete('Sin accesorios');
        if (selectedAccessories.has(acc)) {
          selectedAccessories.delete(acc);
        } else {
          selectedAccessories.add(acc);
        }
        if (selectedAccessories.size === 0) {
          selectedAccessories.add('Sin accesorios');
        }
      }
      syncAccessoriesUI();
    });
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

    const clienteNombre = container.querySelector('#cliente-nombre').value.trim();
    const clienteTelefono = container.querySelector('#cliente-telefono').value.trim();
    const fallaReportada = faultInput.value.trim();
    const observaciones = container.querySelector('#observaciones').value.trim() || 'Revisar y cotizar antes de reparar';

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

    customEquipment = customEqInput.value.trim();
    const finalEquipment =
      selectedEquipment === 'Otro' && customEquipment ? customEquipment : selectedEquipment;

    const accesoriosText = selectedAccessories.has('Sin accesorios')
      ? 'Ninguno'
      : Array.from(selectedAccessories).join(', ');

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

      onOrderCreated?.(created);
      showOrderConfirmationModal(created, {
        onCreateAnother: () => {
          form.reset();
          selectedEquipment = 'TV LCD/LED';
          selectedAccessories = new Set(['Sin accesorios']);
          container.querySelector('#observaciones').value = 'Revisar y cotizar antes de reparar';
          syncEquipmentUI();
          syncAccessoriesUI();
          container.querySelector('#cliente-nombre').focus();
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

