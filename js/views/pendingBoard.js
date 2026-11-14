import { openDeliveryConfirmModal } from '../deliveryModal.js';
import { createTechnician, updateOrder } from '../ordersService.js';
import { escapeHtml, getAgeMeta, showToast } from '../utils.js';
import { buildStatusWhatsAppUrl } from '../whatsapp.js';

const BOARD_COLUMNS = [
  {
    estado: 'Recibido',
    title: 'Recibidos / Por Revisar',
    accentClass: 'border-t-slate-600',
    nextEstado: 'En Revisión',
    nextLabel: '→ En Revisión',
  },
  {
    estado: 'En Revisión',
    title: 'En Reparación',
    accentClass: 'border-t-blue-600',
    nextEstado: 'Reparado',
    nextLabel: '→ Listo',
  },
  {
    estado: 'Por Aprobar',
    title: 'Esperando Repuesto / Aprob.',
    accentClass: 'border-t-amber-500',
    nextEstado: 'Reparado',
    nextLabel: '→ Listo',
  },
  {
    estado: 'Reparado',
    title: 'Listo para Entrega',
    accentClass: 'border-t-emerald-600',
    nextEstado: 'Entregado',
    nextLabel: '→ Entregado',
  },
];

export function renderPendingBoardView(container, state, { onRefreshOrders }) {
  const { orders, technicians, selectedTechnicianFilter, isLoading } = state;
  const searchQuery = String(state.pendingSearchQuery || '');

  // Solo aparatos activos en el taller (excluye Entregado)
  const activeOrders = orders.filter((o) => o.estado !== 'Entregado');
  const techMap = new Map(technicians.map((t) => [String(t.id), t]));

  const countForFilter = (techIdOrNull) =>
    activeOrders.filter((o) =>
      techIdOrNull === null ? !o.tecnico_id : String(o.tecnico_id) === String(techIdOrNull)
    ).length;

  const qLower = searchQuery.trim().toLowerCase();
  const filteredOrders = activeOrders.filter((o) => {
    if (selectedTechnicianFilter === 'unassigned' && o.tecnico_id) return false;
    if (
      selectedTechnicianFilter !== 'all' &&
      selectedTechnicianFilter !== 'unassigned' &&
      String(o.tecnico_id) !== String(selectedTechnicianFilter)
    ) {
      return false;
    }
    if (!qLower) return true;
    return (
      String(o.numero_orden || '').includes(qLower) ||
      String(o.cliente_nombre || '').toLowerCase().includes(qLower) ||
      String(o.tipo_equipo || '').toLowerCase().includes(qLower) ||
      String(o.falla_reportada || '').toLowerCase().includes(qLower)
    );
  });

  const kpis = [
    { label: 'Total en Taller', value: filteredOrders.length, tone: 'text-slate-900 bg-white border-slate-200' },
    { label: 'Por Diagnosticar', value: filteredOrders.filter((o) => o.estado === 'Recibido').length, tone: 'text-slate-800 bg-slate-50 border-slate-200' },
    {
      label: 'En Reparación / Espera',
      value: filteredOrders.filter((o) => o.estado === 'En Revisión' || o.estado === 'Por Aprobar').length,
      tone: 'text-blue-900 bg-blue-50/70 border-blue-200',
    },
    { label: 'Listos para Entrega', value: filteredOrders.filter((o) => o.estado === 'Reparado').length, tone: 'text-emerald-900 bg-emerald-50/70 border-emerald-200' },
  ];

  container.innerHTML = `
    <section class="space-y-4">
      <!-- A. Filtro rápido por Técnico + Buscador para alto volumen -->
      <div class="bg-white rounded-2xl border border-slate-200/90 shadow-lg shadow-slate-300/30 p-3 sm:p-4 space-y-3">
        <div class="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth snap-x snap-mandatory">
          <button
            type="button"
            data-tech-filter="all"
            class="touch-chip snap-start shrink-0 px-3.5 py-2 rounded-xl border font-bold text-sm inline-flex items-center gap-2 transition-colors ${
              selectedTechnicianFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
            }"
          >
            <span>Todos</span>
            <span class="px-1.5 py-0.5 rounded-md text-xs font-mono ${
              selectedTechnicianFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
            }">${activeOrders.length}</span>
          </button>

          <button
            type="button"
            data-tech-filter="unassigned"
            class="touch-chip snap-start shrink-0 px-3.5 py-2 rounded-xl border font-bold text-sm inline-flex items-center gap-2 transition-colors ${
              selectedTechnicianFilter === 'unassigned'
                ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
            }"
          >
            <span>Sin Asignar</span>
            <span class="px-1.5 py-0.5 rounded-md text-xs font-mono ${
              selectedTechnicianFilter === 'unassigned' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
            }">${countForFilter(null)}</span>
          </button>

          ${technicians
            .map((t) => {
              const active = String(selectedTechnicianFilter) === String(t.id);
              const count = countForFilter(t.id);
              return `
                <button
                  type="button"
                  data-tech-filter="${escapeHtml(t.id)}"
                  class="touch-chip snap-start shrink-0 px-3.5 py-2 rounded-xl border font-bold text-sm inline-flex items-center gap-2 transition-colors ${
                    active
                      ? 'bg-blue-700 text-white border-blue-800 shadow-sm'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                  }"
                >
                  <span class="w-3 h-3 rounded-full shrink-0 border border-white/60" style="background-color: ${escapeHtml(t.color || '#1d4ed8')}"></span>
                  <span>${escapeHtml(t.nombre)}</span>
                  <span class="px-1.5 py-0.5 rounded-md text-xs font-mono ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }">${count}</span>
                </button>
              `;
            })
            .join('')}

          <button
            id="add-technician-btn"
            type="button"
            class="touch-chip snap-start shrink-0 px-3.5 py-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm inline-flex items-center gap-1 transition-colors"
          >
            <span>+ Técnico</span>
          </button>
        </div>

        <div class="relative flex items-center">
          <span class="absolute left-3.5 text-slate-400 pointer-events-none">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input
            id="pending-search-input"
            type="search"
            inputmode="search"
            value="${escapeHtml(searchQuery)}"
            placeholder="Filtrar pendientes por N° orden, cliente, equipo o falla..."
            class="w-full min-h-[44px] pl-10 pr-4 py-2 text-base font-semibold rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none transition-all duration-150"
          />
        </div>
      </div>

      <!-- B. Tarjetas de Resumen Rápido (KPIs) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        ${kpis
          .map(
            (k) => `
          <div class="rounded-xl border p-3.5 shadow-sm ${k.tone}">
            <span class="block text-[11px] font-extrabold uppercase tracking-wider opacity-75">${escapeHtml(k.label)}</span>
            <span class="text-2xl sm:text-3xl font-black font-mono mt-0.5 block">${k.value}</span>
          </div>
        `
          )
          .join('')}
      </div>

      <!-- C. Tablero de Estados (4 columnas) -->
      ${
        isLoading
          ? '<div class="bg-white rounded-2xl border border-slate-200 p-8 text-center font-bold text-slate-600">Cargando tablero del taller...</div>'
          : `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
              ${BOARD_COLUMNS.map((col) => {
                const colOrders = filteredOrders.filter((o) => o.estado === col.estado);
                return `
                  <div class="bg-white/80 rounded-2xl border border-slate-200/90 border-t-4 ${col.accentClass} shadow-sm p-3 space-y-3">
                    <div class="flex items-center justify-between gap-2 px-1">
                      <h3 class="text-xs font-black uppercase tracking-wider text-slate-700">${escapeHtml(col.title)}</h3>
                      <span class="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-mono text-xs font-extrabold">${colOrders.length}</span>
                    </div>

                    ${
                      colOrders.length === 0
                        ? '<p class="text-xs font-semibold text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-xl">Sin equipos</p>'
                        : `<div class="space-y-2.5 xl:max-h-[68vh] xl:overflow-y-auto pr-0.5">
                            ${colOrders.map((o) => renderWorkCard(o, col, technicians, techMap)).join('')}
                          </div>`
                    }
                  </div>
                `;
              }).join('')}
            </div>`
      }
    </section>
  `;

  const pendingSearchInput = container.querySelector('#pending-search-input');
  pendingSearchInput?.addEventListener('input', (e) => {
    state.pendingSearchQuery = e.target.value;
    renderPendingBoardView(container, state, { onRefreshOrders });
    const nextInput = container.querySelector('#pending-search-input');
    if (nextInput) {
      nextInput.focus();
      const len = nextInput.value.length;
      nextInput.setSelectionRange(len, len);
    }
  });

  container.querySelector('#add-technician-btn')?.addEventListener('click', () => {
    openAddTechnicianModal(onRefreshOrders);
  });

  // Filtro por técnico
  container.querySelectorAll('[data-tech-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selectedTechnicianFilter = btn.dataset.techFilter;
      renderPendingBoardView(container, state, { onRefreshOrders });
    });
  });

  // Reasignación rápida de técnico en 1 toque
  container.querySelectorAll('[data-action="reassign-tech"]').forEach((select) => {
    select.addEventListener('change', async () => {
      const orderId = select.dataset.id;
      const nextTechId = select.value || null;
      select.disabled = true;
      try {
        await updateOrder(orderId, { tecnico_id: nextTechId });
        showToast('Técnico actualizado');
        await onRefreshOrders?.();
      } catch (err) {
        showToast(`Error al reasignar: ${err.message}`, 'error');
        select.disabled = false;
      }
    });
  });

  // Avanzar estado en 1 toque (excepto Entregado que pide confirmación y observaciones)
  container.querySelectorAll('[data-action="advance-status"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const orderId = btn.dataset.id;
      const nextEstado = btn.dataset.nextEstado;

      if (nextEstado === 'Entregado') {
        const order = activeOrders.find((o) => String(o.id) === String(orderId));
        if (order) {
          openDeliveryConfirmModal(order, { onConfirmed: onRefreshOrders });
        }
        return;
      }

      btn.disabled = true;
      btn.textContent = '...';
      try {
        await updateOrder(orderId, { estado: nextEstado });
        showToast(`Orden movida a "${nextEstado}"`);
        await onRefreshOrders?.();
      } catch (err) {
        showToast(`Error al actualizar: ${err.message}`, 'error');
        btn.disabled = false;
      }
    });
  });
}

function renderWorkCard(order, col, technicians, techMap) {
  const age = getAgeMeta(order.fecha_ingreso);
  const tech = order.tecnico_id ? techMap.get(String(order.tecnico_id)) : null;
  const isUrgent = order.prioridad === 'Urgente / Garantía';
  const waUrl = buildStatusWhatsAppUrl(order);

  return `
    <article class="bg-white rounded-xl border ${isUrgent ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'} shadow-sm p-3 space-y-2.5">
      <!-- N° Orden + Urgente + Semáforo antigüedad -->
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5">
          <span class="px-2 py-0.5 rounded-lg bg-slate-900 text-white font-mono font-black text-base tracking-tight">
            #${escapeHtml(order.numero_orden)}
          </span>
          ${
            isUrgent
              ? '<span class="px-1.5 py-0.5 rounded-md bg-red-100 text-red-800 border border-red-300 text-[10px] font-black uppercase">⚡ Urgente</span>'
              : ''
          }
        </div>
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${age.badgeClass}">
          <span class="w-1.5 h-1.5 rounded-full ${age.dotClass}"></span>
          ${escapeHtml(age.label)}
        </span>
      </div>

      <!-- Equipo, falla y cliente -->
      <div class="space-y-0.5">
        <p class="font-extrabold text-sm text-slate-900 leading-snug">${escapeHtml(order.tipo_equipo)}</p>
        <p class="text-xs font-semibold text-slate-600 line-clamp-2">${escapeHtml(order.falla_reportada)}</p>
        <p class="text-xs font-bold text-slate-500 pt-0.5">👤 ${escapeHtml(order.cliente_nombre)}</p>
      </div>

      <!-- Reasignación de técnico en 1 toque -->
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${escapeHtml(tech?.color || '#94a3b8')}"></span>
        <select
          data-action="reassign-tech"
          data-id="${escapeHtml(order.id)}"
          aria-label="Asignar técnico"
          class="w-full min-h-[44px] px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm font-bold text-slate-800 focus:border-blue-600 focus:outline-none"
        >
          <option value="" ${!order.tecnico_id ? 'selected' : ''}>Sin Asignar</option>
          ${technicians
            .map(
              (t) => `<option value="${escapeHtml(t.id)}" ${String(order.tecnico_id) === String(t.id) ? 'selected' : ''}>${escapeHtml(t.nombre)}</option>`
            )
            .join('')}
        </select>
      </div>

      <!-- Acciones directas -->
      <div class="flex items-center gap-1.5 pt-1">
        <button
          type="button"
          data-action="advance-status"
          data-id="${escapeHtml(order.id)}"
          data-next-estado="${escapeHtml(col.nextEstado)}"
          class="touch-btn min-h-[44px] flex-1 py-2 px-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm text-center transition-colors"
        >
          ${escapeHtml(col.nextLabel)}
        </button>
        <a
          href="${escapeHtml(waUrl)}"
          target="_blank"
          rel="noopener noreferrer"
          title="Avisar por WhatsApp"
          aria-label="Avisar por WhatsApp"
          class="touch-btn min-h-[44px] min-w-[44px] py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center transition-colors"
        >
          📲
        </a>
      </div>
    </article>
  `;
}

function openAddTechnicianModal(onRefreshOrders) {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  const COLORS = ['#1d4ed8', '#0f766e', '#7c3aed', '#b45309', '#be185d', '#0369a1'];
  let selectedColor = COLORS[0];

  modalRoot.className = 'fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-3 sm:p-4';
  modalRoot.innerHTML = `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto p-5 space-y-4">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-lg font-black text-slate-900">Agregar Técnico</h3>
        <button id="close-tech-modal" type="button" class="touch-btn min-w-[44px] px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 font-black" aria-label="Cerrar">✕</button>
      </div>
      <form id="add-tech-form" class="space-y-4">
        <div>
          <label for="tech-name-input" class="block text-xs font-black uppercase text-slate-700 mb-1">
            Nombre del Técnico
          </label>
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
            ${COLORS.map(
              (c, idx) => `
              <button
                type="button"
                data-tech-color-pick="${c}"
                class="w-10 h-10 rounded-full border-2 transition-transform ${idx === 0 ? 'border-slate-900 scale-110' : 'border-white shadow'}"
                style="background-color: ${c}"
              ></button>
            `
            ).join('')}
          </div>
        </div>
        <div class="flex gap-2 pt-1">
          <button
            id="cancel-tech-modal"
            type="button"
            class="touch-btn px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="touch-btn flex-1 py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-black text-base"
          >
            Guardar Técnico
          </button>
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
        b.className = `w-10 h-10 rounded-full border-2 transition-transform ${
          active ? 'border-slate-900 scale-110' : 'border-white shadow'
        }`;
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

