import { openDeliveryConfirmModal } from '../deliveryModal.js';
import { createTechnician, updateOrder } from '../ordersService.js';
import { escapeHtml, showToast } from '../utils.js';
import { buildStatusWhatsAppUrl } from '../whatsapp.js';

const BOARD_COLUMNS = [
  {
    estado: 'Recibido',
    title: 'Recibidos / Por Revisar',
    dotClass: 'bg-slate-500',
    nextEstado: 'En Revisión',
    nextLabel: '→ En Revisión',
  },
  {
    estado: 'En Revisión',
    title: 'En Reparación',
    dotClass: 'bg-blue-600',
    nextEstado: 'Reparado',
    nextLabel: '→ Listo',
  },
  {
    estado: 'Por Aprobar',
    title: 'Esperando Repuesto / Aprob.',
    dotClass: 'bg-amber-500',
    nextEstado: 'Reparado',
    nextLabel: '→ Listo',
  },
  {
    estado: 'Reparado',
    estados: ['Reparado', 'Sin Reparación', 'Sin Falla'],
    title: 'Listo para Entrega',
    dotClass: 'bg-emerald-600',
    nextEstado: 'Entregado',
    nextLabel: '→ Entregado',
  },
];

function getSoberAgeBadge(isoString) {
  if (!isoString) {
    return { label: 'Hoy', badgeClass: 'bg-slate-100 text-slate-600' };
  }
  const ms = Date.now() - new Date(isoString).getTime();
  const days = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  if (days >= 6) {
    return {
      label: `${days} días`,
      badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold',
    };
  }
  if (days >= 3) {
    return {
      label: `${days} días`,
      badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
    };
  }
  return {
    label: days === 0 ? 'Hoy' : days === 1 ? '1 día' : `${days} días`,
    badgeClass: 'bg-slate-100 text-slate-600',
  };
}

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
    { label: 'Total en Taller', value: filteredOrders.length, accent: 'border-t-blue-600' },
    { label: 'Por Diagnosticar', value: filteredOrders.filter((o) => o.estado === 'Recibido').length, accent: 'border-t-amber-500' },
    {
      label: 'En Reparación / Espera',
      value: filteredOrders.filter((o) => o.estado === 'En Revisión' || o.estado === 'Por Aprobar').length,
      accent: 'border-t-indigo-600',
    },
    {
      label: 'Listos para Entrega',
      value: filteredOrders.filter((o) => o.estado === 'Reparado' || o.estado === 'Sin Reparación' || o.estado === 'Sin Falla').length,
      accent: 'border-t-emerald-600',
    },
  ];

  container.innerHTML = `
    <section class="space-y-4">
      <!-- A. Filtro rápido por Técnico + Buscador para alto volumen -->
      <div class="bg-white rounded-xl border border-slate-200/80 shadow-sm p-3 sm:p-4 space-y-3">
        <div class="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth snap-x snap-mandatory">
          <button
            type="button"
            data-tech-filter="all"
            class="touch-chip snap-start shrink-0 px-3.5 py-2 rounded-xl border font-bold text-sm inline-flex items-center gap-2 transition-colors ${selectedTechnicianFilter === 'all'
      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
    }"
          >
            <span>Todos</span>
            <span class="px-1.5 py-0.5 rounded-md text-xs font-mono ${selectedTechnicianFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
    }">${activeOrders.length}</span>
          </button>

          <button
            type="button"
            data-tech-filter="unassigned"
            class="touch-chip snap-start shrink-0 px-3.5 py-2 rounded-xl border font-bold text-sm inline-flex items-center gap-2 transition-colors ${selectedTechnicianFilter === 'unassigned'
      ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
    }"
          >
            <span>Sin Asignar</span>
            <span class="px-1.5 py-0.5 rounded-md text-xs font-mono ${selectedTechnicianFilter === 'unassigned' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
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
                  class="touch-chip snap-start shrink-0 px-3.5 py-2 rounded-xl border font-bold text-sm inline-flex items-center gap-2 transition-colors ${active
            ? 'bg-blue-700 text-white border-blue-800 shadow-sm'
            : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }"
                >
                  <span class="w-3 h-3 rounded-full shrink-0 border border-white/60" style="background-color: ${escapeHtml(t.color || '#1d4ed8')}"></span>
                  <span>${escapeHtml(t.nombre)}</span>
                  <span class="px-1.5 py-0.5 rounded-md text-xs font-mono ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
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
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-5">
        ${kpis
      .map(
        (k) => `
          <div class="bg-white border border-slate-200/80 border-t-4 ${k.accent} rounded-xl p-3.5 sm:p-4 shadow-sm">
            <span class="block text-[11px] sm:text-xs font-semibold uppercase text-slate-500 tracking-wider">${escapeHtml(k.label)}</span>
            <span class="text-2xl lg:text-3xl font-extrabold font-mono text-slate-800 mt-1 block">${k.value}</span>
          </div>
        `
      )
      .join('')}
      </div>

      <!-- C. Tablero de Estados (4 columnas full-width con scroll independiente en desktop) -->
      ${isLoading
      ? '<div class="bg-white rounded-xl border border-slate-200 p-8 text-center font-bold text-slate-600">Cargando tablero del taller...</div>'
          : `< div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start" >
    ${
      BOARD_COLUMNS.map((col) => {
        const colOrders = filteredOrders.filter((o) =>
          col.estados ? col.estados.includes(o.estado) : o.estado === col.estado
        );
        return `
                  <div
                    data-drop-estado="${escapeHtml(col.estado)}"
                    class="bg-slate-100/80 rounded-xl p-3 border border-slate-200/60 flex flex-col transition-all duration-150"
                  >
                    <div class="flex items-center justify-between gap-2 px-1">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="w-2 h-2 rounded-full shrink-0 ${col.dotClass}"></span>
                        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 truncate">${escapeHtml(col.title)}</h3>
                      </div>
                      <span class="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 font-mono text-xs font-extrabold shrink-0">${colOrders.length}</span>
                    </div>

                    ${colOrders.length === 0
            ? '<p class="text-xs font-semibold text-slate-400 text-center py-8 mt-3 border border-dashed border-slate-300/70 rounded-xl bg-white/40">Sin equipos</p>'
                        : `< div class="xl:max-h-[calc(100vh-295px)] xl:overflow-y-auto scrollbar-thin pr-1 mt-3 space-y-2.5" >
          ${ colOrders.map((o) => renderWorkCard(o, col, technicians, techMap)).join('') }
                          </div > `
                    }
                  </div>
                `;
      }).join('')
  }
            </div > `
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

  // Drag-and-drop HTML5 nativo entre columnas en escritorio
  container.querySelectorAll('[data-drag-order-id]').forEach((card) => {
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', card.dataset.dragOrderId);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('opacity-50');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('opacity-50');
    });
  });

  container.querySelectorAll('[data-drop-estado]').forEach((colEl) => {
    colEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      colEl.classList.add('ring-2', 'ring-blue-400', 'bg-blue-50/40');
    });
    colEl.addEventListener('dragleave', (e) => {
      if (!colEl.contains(e.relatedTarget)) {
        colEl.classList.remove('ring-2', 'ring-blue-400', 'bg-blue-50/40');
      }
    });
    colEl.addEventListener('drop', async (e) => {
      e.preventDefault();
      colEl.classList.remove('ring-2', 'ring-blue-400', 'bg-blue-50/40');
      const orderId = e.dataTransfer.getData('text/plain');
      const targetEstado = colEl.dataset.dropEstado;
      if (!orderId || !targetEstado) return;
      const order = activeOrders.find((o) => String(o.id) === String(orderId));
      if (!order || order.estado === targetEstado) return;

      try {
        await updateOrder(orderId, { estado: targetEstado });
        showToast(`Orden #${order.numero_orden} movida a "${targetEstado}"`);
        await onRefreshOrders?.();
      } catch (err) {
        showToast(`Error al mover: ${err.message}`, 'error');
      }
    });
  });
}

function renderWorkCard(order, col, technicians, techMap) {
  const age = getSoberAgeBadge(order.fecha_ingreso);
  const tech = order.tecnico_id ? techMap.get(String(order.tecnico_id)) : null;
  const isUrgent = order.prioridad === 'Urgente / Garantía';
  const waUrl = buildStatusWhatsAppUrl(order);

  return `
    <article
      draggable="true"
      data-drag-order-id="${escapeHtml(order.id)}"
      class="bg-white rounded-xl border ${isUrgent ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'} p-3.5 shadow-sm hover:shadow-md transition-shadow duration-150 space-y-2.5 cursor-grab active:cursor-grabbing"
    >
      <!-- Cabecera: N° Orden + Urgente + Antigüedad sobria -->
      <div class="flex items-center justify-between gap-2">
        <span class="font-mono font-extrabold text-base text-slate-900 tracking-tight">
          #${escapeHtml(order.numero_orden)}
        </span>
        <div class="flex items-center gap-1.5 flex-wrap justify-end">
          ${order.estado === 'Sin Reparación'
      ? '<span class="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">Sin Reparación</span>'
      : order.estado === 'Sin Falla'
        ? '<span class="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold">Estaba Bueno</span>'
        : ''
    }
          ${isUrgent
      ? '<span class="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase">⚡ Urgente</span>'
      : ''
    }
          <span class="px-2 py-0.5 rounded-md text-[11px] font-medium ${age.badgeClass}">
            ${escapeHtml(age.label)}
          </span>
        </div>
      </div>

      <!-- Cuerpo: Equipo, falla y cliente -->
      <div class="space-y-1">
        <p class="font-bold text-slate-900 text-sm leading-snug">${escapeHtml(order.tipo_equipo)}</p>
        <p class="text-xs text-slate-600 line-clamp-2">${escapeHtml(order.falla_reportada)}</p>
        <p class="text-xs text-slate-500 font-medium flex items-center gap-1.5 pt-0.5">
          <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span class="truncate">${escapeHtml(order.cliente_nombre)}</span>
        </p>
      </div>

      <!-- Selector compacto de técnico -->
      <div class="flex items-center gap-2 px-2.5 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-slate-100/80 transition-colors">
        <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${escapeHtml(tech?.color || '#94a3b8')}"></span>
        <select
          data-action="reassign-tech"
          data-id="${escapeHtml(order.id)}"
          aria-label="Asignar técnico"
          class="w-full min-h-[44px] sm:min-h-[34px] py-1 bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
        >
          <option value="" ${!order.tecnico_id ? 'selected' : ''}>Sin Asignar</option>
          ${technicians
      .map(
        (t) => `<option value="${escapeHtml(t.id)}" ${String(order.tecnico_id) === String(t.id) ? 'selected' : ''}>${escapeHtml(t.nombre)}</option>`
      )
      .join('')}
        </select>
      </div>

      <!-- Footer de acción rápida -->
      <div class="flex items-center gap-2 pt-0.5">
        <button
          type="button"
          data-action="advance-status"
          data-id="${escapeHtml(order.id)}"
          data-next-estado="${escapeHtml(col.nextEstado)}"
          class="touch-btn min-h-[44px] sm:min-h-[34px] flex-1 py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          ${escapeHtml(col.nextLabel)}
        </button>
        <a
          href="${escapeHtml(waUrl)}"
          target="_blank"
          rel="noopener noreferrer"
          title="Avisar por WhatsApp"
          aria-label="Avisar por WhatsApp"
          class="w-11 h-11 sm:w-8 sm:h-8 shrink-0 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg flex items-center justify-center transition-colors border border-emerald-200"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
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
        b.className = `w-10 h-10 rounded-full border-2 transition-transform ${active ? 'border-slate-900 scale-110' : 'border-white shadow'
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

