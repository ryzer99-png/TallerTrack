import { openDeliveryConfirmModal } from '../deliveryModal.js';
import { updateOrder } from '../ordersService.js';
import {
  escapeHtml,
  formatCurrency,
  formatDateTime,
  getPublicOrderUrl,
  paginateItems,
  renderPaginationBar,
  showToast,
  STATUS_META,
} from '../utils.js';
import { buildStatusWhatsAppUrl } from '../whatsapp.js';

const FILTER_OPTIONS = [
  { id: 'Activas', label: 'En Taller (Activas)' },
  { id: 'Recibido', label: 'Recibido' },
  { id: 'En Revisión', label: 'En Revisión' },
  { id: 'Por Aprobar', label: 'Por Aprobar' },
  { id: 'Reparado', label: 'Reparado' },
  { id: 'Sin Reparación', label: 'Sin Reparación' },
  { id: 'Sin Falla', label: 'Estaba Bueno' },
];

const QUICK_STATUS_BUTTONS = [
  { estado: 'En Revisión', label: 'En Revisión' },
  { estado: 'Por Aprobar', label: 'Avisar Cotización' },
  { estado: 'Reparado', label: 'Listo / Reparado' },
  { estado: 'Sin Reparación', label: 'Sin Reparación' },
  { estado: 'Sin Falla', label: 'Estaba Bueno' },
  { estado: 'Entregado', label: 'Entregado' },
];

export function renderActiveOrdersView(container, state, { onRefreshOrders }) {
  const { orders, technicians = [], searchQuery, statusFilter, isLoading } = state;
  const techMap = new Map(technicians.map((t) => [String(t.id), t]));

  const filtered = orders.filter((order) => {
    // Los entregados pasan automáticamente al módulo "Entregados"
    if (order.estado === 'Entregado') {
      return false;
    }
    if (statusFilter !== 'Activas' && order.estado !== statusFilter) {
      return false;
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;

    const numStr = String(order.numero_orden || '');
    const phoneDigits = String(order.cliente_telefono || '').replace(/\D/g, '');
    const last4 = phoneDigits.slice(-4);
    const nameStr = String(order.cliente_nombre || '').toLowerCase();
    const equipStr = String(order.tipo_equipo || '').toLowerCase();

    return (
      numStr.includes(q) ||
      last4.includes(q) ||
      phoneDigits.includes(q) ||
      nameStr.includes(q) ||
      equipStr.includes(q)
    );
  });

  const pagination = paginateItems(filtered, state.activePage || 1, 10);
  state.activePage = pagination.page;

  container.innerHTML = `
    <section class="space-y-4">
      <!-- Barra de búsqueda y filtros -->
      <div class="bg-white rounded-2xl border border-slate-200/90 shadow-lg shadow-slate-300/30 p-3.5 sm:p-4 space-y-3">
        <div class="flex flex-col sm:flex-row gap-2.5">
          <div class="relative flex-1 flex items-center">
            <span class="absolute left-3.5 text-slate-400 pointer-events-none">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </span>
            <input
              id="orders-search-input"
              type="search"
              inputmode="search"
              value="${escapeHtml(searchQuery)}"
              placeholder="Buscar por N° orden (ej: 4063), últimos 4 dígitos del cel o nombre..."
              class="w-full min-h-[48px] pl-11 pr-4 py-2.5 text-base sm:text-lg font-semibold rounded-xl border border-slate-300 bg-slate-50/70 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none transition-all duration-150"
            />
          </div>
          <button
            id="refresh-orders-btn"
            type="button"
            class="touch-btn px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 font-bold text-slate-700 text-sm sm:text-base transition-colors"
          >
            ↻ Actualizar
          </button>
        </div>

        <!-- Filtros por estado -->
        <div id="status-filter-bar" class="flex flex-nowrap gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth snap-x snap-mandatory">
          ${FILTER_OPTIONS.map((opt) => {
    const active = statusFilter === opt.id;
    return `
              <button
                type="button"
                data-filter="${escapeHtml(opt.id)}"
                class="touch-chip snap-start shrink-0 px-4 py-2 rounded-xl border-2 font-extrabold text-sm ${active
        ? 'bg-slate-900 text-white border-slate-900'
        : 'bg-slate-50 text-slate-800 border-slate-300 hover:border-slate-500'
      }"
              >
                ${escapeHtml(opt.label)}
              </button>
            `;
  }).join('')}
        </div>
      </div>

      <!-- Listado de tarjetas -->
      ${isLoading
      ? `<div class="bg-white rounded-2xl border-2 border-slate-300 p-8 text-center font-bold text-slate-600 text-lg">Cargando órdenes del taller...</div>`
      : filtered.length === 0
        ? `<div class="bg-white rounded-2xl border-2 border-slate-300 p-8 text-center space-y-2">
                <p class="text-xl font-black text-slate-800">No hay órdenes que coincidan</p>
                <p class="text-sm font-medium text-slate-600">Prueba cambiando el filtro o limpiando el buscador.</p>
              </div>`
        : `<div id="orders-grid" class="grid grid-cols-1 gap-4">
                ${pagination.pageItems.map((o) => renderOrderCard(o, techMap)).join('')}
              </div>
              ${renderPaginationBar({ ...pagination, itemLabel: 'equipos' })}`
    }
    </section>
  `;

  // Eventos de búsqueda y filtros
  const searchInput = container.querySelector('#orders-search-input');
  searchInput?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    state.activePage = 1;
    renderActiveOrdersView(container, state, { onRefreshOrders });
    // Mantener foco y cursor al final
    const nextInput = container.querySelector('#orders-search-input');
    if (nextInput) {
      nextInput.focus();
      const len = nextInput.value.length;
      nextInput.setSelectionRange(len, len);
    }
  });

  container.querySelector('#refresh-orders-btn')?.addEventListener('click', () => {
    onRefreshOrders?.();
  });

  container.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.statusFilter = btn.dataset.filter;
      state.activePage = 1;
      renderActiveOrdersView(container, state, { onRefreshOrders });
    });
  });

  // Paginación móvil y escritorio
  container.querySelectorAll('[data-page-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dir = btn.dataset.pageAction;
      state.activePage = dir === 'prev' ? Math.max(1, pagination.page - 1) : Math.min(pagination.totalPages, pagination.page + 1);
      renderActiveOrdersView(container, state, { onRefreshOrders });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
  container.querySelectorAll('[data-page-num]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activePage = Number(btn.dataset.pageNum) || 1;
      renderActiveOrdersView(container, state, { onRefreshOrders });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Eventos de tarjetas: cambio rápido de estado (1 toque, excepto Entregado que pide confirmación)
  container.querySelectorAll('[data-action="set-status"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const nextEstado = btn.dataset.estado;

      if (nextEstado === 'Entregado') {
        const order = orders.find((o) => String(o.id) === String(id));
        if (order) {
          openDeliveryConfirmModal(order, { onConfirmed: onRefreshOrders });
        }
        return;
      }

      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = '...';
      try {
        await updateOrder(id, { estado: nextEstado });
        showToast(`Orden actualizada a "${nextEstado}"`);
        await onRefreshOrders?.();
      } catch (err) {
        console.error(err);
        showToast(`Error al actualizar: ${err.message}`, 'error');
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  });

  // Eventos de tarjetas: editar costo estimado
  container.querySelectorAll('[data-action="edit-cost"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const order = orders.find((o) => String(o.id) === String(btn.dataset.id));
      if (order) {
        openCostModal(order, onRefreshOrders);
      }
    });
  });

  // Eventos de tarjetas: copiar enlace público
  container.querySelectorAll('[data-action="copy-link"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const order = orders.find((o) => String(o.id) === String(btn.dataset.id));
      if (!order) return;
      const url = getPublicOrderUrl(order);
      try {
        await navigator.clipboard.writeText(url);
        showToast(`Enlace de orden #${order.numero_orden} copiado`);
      } catch {
        showToast(url, 'info');
      }
    });
  });
}

function renderOrderCard(order, techMap) {
  const meta = STATUS_META[order.estado] || STATUS_META['Recibido'];
  const waUrl = buildStatusWhatsAppUrl(order);
  const publicUrl = getPublicOrderUrl(order);
  const isPrinted = Boolean(order.impresa);
  const costo = Number(order.costo_estimado || 0);
  const tech = order.tecnico_id ? techMap.get(String(order.tecnico_id)) : null;

  return `
    <article class="bg-white rounded-2xl border border-slate-200/90 shadow-lg shadow-slate-300/30 p-4 sm:p-5 space-y-4">
      <!-- Encabezado de tarjeta: N° Orden grande + Estado + Técnico + Impresión -->
      <div class="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div class="flex items-center gap-3 min-w-0">
          <div class="px-3.5 py-2 rounded-xl bg-slate-900 text-white font-mono font-black text-2xl sm:text-3xl tracking-tight shadow-sm shrink-0">
            #${escapeHtml(order.numero_orden)}
          </div>
          <div class="min-w-0">
            <h3 class="text-lg sm:text-xl font-black text-slate-900 leading-tight truncate">
              ${escapeHtml(order.cliente_nombre)}
            </h3>
            <p class="text-xs sm:text-sm font-bold text-slate-600 break-words">
              📞 ${escapeHtml(order.cliente_telefono)} · ${escapeHtml(formatDateTime(order.fecha_ingreso))}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          ${
            tech
              ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-300 text-xs font-extrabold text-slate-800">
                  <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${escapeHtml(tech.color || '#1d4ed8')}"></span>
                  ${escapeHtml(tech.nombre)}
                </span>`
              : `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-500">
                  Sin asignar
                </span>`
          }
          <span class="px-3 py-1.5 rounded-xl border-2 text-xs sm:text-sm font-black ${meta.badgeClass}">
            ${escapeHtml(meta.label)}
          </span>
          <span class="px-3 py-1.5 rounded-xl border-2 text-xs font-extrabold ${isPrinted
      ? 'bg-emerald-50 text-emerald-900 border-emerald-400'
      : 'bg-amber-50 text-amber-900 border-amber-400'
    }">
            ${isPrinted ? '🖨️ Impreso' : '⏳ Pendiente de imprimir'}
          </span>
        </div>
      </div>

      <!-- Datos del equipo y falla -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm sm:text-base">
        <div class="bg-slate-50 rounded-xl p-3 border border-slate-200">
          <span class="block text-xs font-black uppercase tracking-wider text-slate-500">Equipo y Accesorios</span>
          <p class="font-extrabold text-slate-900 text-base sm:text-lg">${escapeHtml(order.tipo_equipo)}</p>
          <p class="text-slate-700 font-semibold text-sm">Acc: ${escapeHtml(order.accesorios || 'Ninguno')}</p>
        </div>

        <div class="bg-slate-50 rounded-xl p-3 border border-slate-200 md:col-span-2">
          <span class="block text-xs font-black uppercase tracking-wider text-slate-500">Falla Reportada y Observaciones</span>
          <p class="font-extrabold text-slate-900 text-base sm:text-lg">${escapeHtml(order.falla_reportada)}</p>
          <p class="text-slate-600 font-medium text-sm">${escapeHtml(order.observaciones || '')}</p>
        </div>
      </div>

      <!-- Selector rápido de estado de 1 toque -->
      <div>
        <span class="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
          Cambiar estado (1 toque):
        </span>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          ${QUICK_STATUS_BUTTONS.map((btn) => {
      const isCurrent = order.estado === btn.estado;
      return `
              <button
                type="button"
                data-action="set-status"
                data-id="${escapeHtml(order.id)}"
                data-estado="${escapeHtml(btn.estado)}"
                class="touch-chip px-3 py-2.5 rounded-xl border-2 font-extrabold text-sm sm:text-base text-center ${isCurrent
          ? 'bg-blue-700 text-white border-blue-900 shadow'
          : 'bg-white text-slate-900 border-slate-300 hover:border-blue-600 hover:bg-blue-50'
        }"
              >
                ${escapeHtml(btn.label)}
              </button>
            `;
    }).join('')}
        </div>
      </div>

      <!-- Acciones rápidas: Costo + WhatsApp + Enlace Público -->
      <div class="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t-2 border-slate-200">
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-action="edit-cost"
            data-id="${escapeHtml(order.id)}"
            class="touch-btn px-4 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border-2 border-amber-400 font-extrabold text-sm sm:text-base"
          >
            💰 Precio Reparación: ${costo > 0 ? escapeHtml(formatCurrency(costo)) : 'Asignar'}
          </button>

          <button
            type="button"
            data-action="copy-link"
            data-id="${escapeHtml(order.id)}"
            class="touch-btn px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold text-sm"
          >
            🔗 Link QR
          </button>

          <a
            href="${escapeHtml(publicUrl)}"
            target="_blank"
            rel="noopener noreferrer"
            class="touch-btn px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold text-sm flex items-center"
          >
            👁️ Ficha
          </a>
        </div>

        <a
          href="${escapeHtml(waUrl)}"
          target="_blank"
          rel="noopener noreferrer"
          class="touch-btn w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-emerald-800 font-black text-base flex items-center justify-center gap-2 shadow-sm"
        >
          <span>📲 Avisar por WhatsApp</span>
        </a>
      </div>
    </article>
  `;
}

function formatCopInput(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  const num = Number(digits);
  if (!Number.isFinite(num) || num <= 0) return '';
  return new Intl.NumberFormat('es-CO').format(num);
}

function parseCopInput(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  const num = Number(digits || 0);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

function openCostModal(order, onRefreshOrders) {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  const PRESET_PRICES = [30000, 50000, 80000, 100000, 120000, 150000];
  const initialFormatted = formatCopInput(Math.round(Number(order.costo_estimado || 0)));

  modalRoot.className = 'fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-3 sm:p-4';
  modalRoot.innerHTML = `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 space-y-4">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-lg sm:text-xl font-black text-slate-900">Precio de Reparación #${escapeHtml(order.numero_orden)}</h3>
        <button id="close-cost-modal" type="button" class="touch-btn min-w-[44px] px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 font-black" aria-label="Cerrar">✕</button>
      </div>
      <p class="text-sm font-semibold text-slate-600">
        ${escapeHtml(order.cliente_nombre)} — ${escapeHtml(order.tipo_equipo)}
      </p>
      <form id="cost-form" class="space-y-4">
        <div>
          <span class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Valores rápidos (1 toque)
          </span>
          <div class="grid grid-cols-3 gap-2">
            ${PRESET_PRICES.map((p) => `
              <button
                type="button"
                data-preset-price="${p}"
                class="touch-chip px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-400 font-mono font-bold text-sm text-slate-800"
              >
                ${escapeHtml(formatCurrency(p))}
              </button>
            `).join('')}
          </div>
        </div>
        <div>
          <label for="cost-input" class="block text-sm font-black uppercase text-slate-700 mb-1">
            Precio de Reparación (COP)
          </label>
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
          <button
            type="submit"
            class="touch-btn py-3.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-black text-base"
          >
            Guardar Precio
          </button>
          <button
            id="save-and-repaired-btn"
            type="button"
            class="touch-btn py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base"
          >
            Guardar y "Reparado"
          </button>
        </div>
        <button
          id="cancel-cost-modal"
          type="button"
          class="touch-btn w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm"
        >
          Cancelar
        </button>
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

  const costInput = modalRoot.querySelector('#cost-input');
  costInput.focus();
  costInput.select();

  costInput.addEventListener('input', () => {
    costInput.value = formatCopInput(costInput.value);
  });

  modalRoot.querySelectorAll('[data-preset-price]').forEach((btn) => {
    btn.addEventListener('click', () => {
      costInput.value = formatCopInput(btn.dataset.presetPrice);
    });
  });

  modalRoot.querySelector('#close-cost-modal').addEventListener('click', closeModal);
  modalRoot.querySelector('#cancel-cost-modal').addEventListener('click', closeModal);

    async function saveCost(alsoSetRepaired) {
      const val = parseCopInput(costInput.value);
      const patch = { costo_estimado: val };
        if (alsoSetRepaired) {
          patch.estado = 'Reparado';
        }
        try {
          await updateOrder(order.id, patch);
          showToast(
        alsoSetRepaired
              ? 'Precio guardado y marcado "Reparado"'
              : 'Precio de reparación actualizado'
          );
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

        modalRoot.querySelector('#save-and-repaired-btn').addEventListener('click', () => {
          saveCost(true);
        });
      }

