import { openDeliveryConfirmModal } from '../deliveryModal.js';
import { updateOrder } from '../services/ordenesService.js';
import { escapeHtml, showToast } from '../utils.js';
import { openAddTechnicianModal } from './addTechnicianModal.js';
import { BOARD_COLUMNS, renderWorkCard } from './pendingCard.js';

/** Renderiza el tablero Kanban de equipos pendientes y su filtro por técnico. */
export function renderPendingBoardView(container, state, { onRefreshOrders }) {
  const { orders, technicians, selectedTechnicianFilter, isLoading } = state;
  const searchQuery = String(state.pendingSearchQuery || '');

  const activeOrders = orders.filter((o) => o.estado !== 'Entregado');
  const techMap = new Map(technicians.map((t) => [String(t.id), t]));
  const countForFilter = (techId) =>
    activeOrders.filter((o) => (techId === null ? !o.tecnico_id : String(o.tecnico_id) === String(techId))).length;

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
    { label: 'En Reparación / Espera', value: filteredOrders.filter((o) => o.estado === 'En Revisión' || o.estado === 'Por Aprobar').length, accent: 'border-t-indigo-600' },
    { label: 'Listos para Entrega', value: filteredOrders.filter((o) => ['Reparado', 'Sin Reparación', 'Sin Falla'].includes(o.estado)).length, accent: 'border-t-emerald-600' },
  ];

  const chipBtn = (active) =>
    active
      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300';
  const countBadge = (active) => (active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800');

  container.innerHTML = `
    <section class="space-y-4">
      <div class="bg-white rounded-xl border border-slate-200/80 shadow-sm p-3 sm:p-4 space-y-3">
        <div class="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth snap-x snap-mandatory">
          <button type="button" data-tech-filter="all" class="touch-chip snap-start shrink-0 px-3.5 py-2 rounded-xl border font-bold text-sm inline-flex items-center gap-2 transition-colors ${chipBtn(selectedTechnicianFilter === 'all')}">
            <span>Todos</span>
            <span class="px-1.5 py-0.5 rounded-full text-xs font-mono ${countBadge(selectedTechnicianFilter === 'all')}">${activeOrders.length}</span>
          </button>
          <button type="button" data-tech-filter="unassigned" class="touch-chip snap-start shrink-0 px-3.5 py-2 rounded-xl border font-bold text-sm inline-flex items-center gap-2 transition-colors ${chipBtn(selectedTechnicianFilter === 'unassigned')}">
            <span>Sin Asignar</span>
            <span class="px-1.5 py-0.5 rounded-full text-xs font-mono ${countBadge(selectedTechnicianFilter === 'unassigned')}">${countForFilter(null)}</span>
          </button>
          ${technicians.map((t) => {
            const active = String(selectedTechnicianFilter) === String(t.id);
            return `
              <button type="button" data-tech-filter="${escapeHtml(t.id)}" class="touch-chip snap-start shrink-0 px-3.5 py-2 rounded-xl border font-bold text-sm inline-flex items-center gap-2 transition-colors ${chipBtn(active)}">
                <span class="w-2.5 h-2.5 rounded-full shrink-0 ${active ? 'ring-1 ring-white/60' : ''}" style="background-color: ${escapeHtml(t.color || '#1d4ed8')}"></span>
                <span>${escapeHtml(t.nombre)}</span>
                <span class="px-1.5 py-0.5 rounded-full text-xs font-mono ${countBadge(active)}">${countForFilter(t.id)}</span>
              </button>`;
          }).join('')}
          <button id="add-technician-btn" type="button" class="touch-chip snap-start shrink-0 px-3.5 py-2 rounded-xl border border-dashed border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm inline-flex items-center gap-1 transition-colors">+ Técnico</button>
        </div>

        <div class="relative flex items-center">
          <span class="absolute left-3.5 text-slate-400 pointer-events-none">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input id="pending-search-input" type="search" inputmode="search" value="${escapeHtml(searchQuery)}" placeholder="Filtrar pendientes por N° orden, cliente, equipo o falla..." class="w-full min-h-[44px] pl-10 pr-4 py-2 text-base font-semibold rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none transition-all duration-150" />
        </div>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-5">
        ${kpis.map((k) => `
          <div class="bg-white border border-slate-200/80 border-t-4 ${k.accent} rounded-xl p-3.5 sm:p-4 shadow-sm">
            <span class="block text-[11px] sm:text-xs font-semibold uppercase text-slate-500 tracking-wider">${escapeHtml(k.label)}</span>
            <span class="text-2xl lg:text-3xl font-extrabold font-mono text-slate-800 mt-1 block">${k.value}</span>
          </div>`).join('')}
      </div>

      ${isLoading
        ? '<div class="bg-white rounded-xl border border-slate-200 p-8 text-center font-bold text-slate-600">Cargando tablero del taller...</div>'
        : `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            ${BOARD_COLUMNS.map((col) => {
              const colOrders = filteredOrders.filter((o) => (col.estados ? col.estados.includes(o.estado) : o.estado === col.estado));
              return `
                <div data-drop-estado="${escapeHtml(col.estado)}" class="bg-slate-100/80 rounded-xl p-3 border border-slate-200/60 flex flex-col transition-all duration-150">
                  <div class="flex items-center justify-between gap-2 px-1">
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="w-2 h-2 rounded-full shrink-0 ${col.dotClass}"></span>
                      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 truncate">${escapeHtml(col.title)}</h3>
                    </div>
                    <span class="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 font-mono text-xs font-extrabold shrink-0">${colOrders.length}</span>
                  </div>
                  ${colOrders.length === 0
                    ? '<p class="text-xs font-semibold text-slate-400 text-center py-8 mt-3 border border-dashed border-slate-300/70 rounded-xl bg-white/40">Sin equipos</p>'
                    : `<div class="xl:max-h-[calc(100vh-295px)] xl:overflow-y-auto scrollbar-thin pr-1 mt-3 space-y-2.5">${colOrders.map((o) => renderWorkCard(o, col, technicians, techMap)).join('')}</div>`}
                </div>`;
            }).join('')}
          </div>`}
    </section>
  `;

  const pendingSearchInput = container.querySelector('#pending-search-input');
  pendingSearchInput?.addEventListener('input', (e) => {
    state.pendingSearchQuery = e.target.value;
    renderPendingBoardView(container, state, { onRefreshOrders });
    const nextInput = container.querySelector('#pending-search-input');
    if (nextInput) {
      nextInput.focus();
      nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
    }
  });

  container.querySelector('#add-technician-btn')?.addEventListener('click', () => openAddTechnicianModal(onRefreshOrders));
  container.querySelectorAll('[data-tech-filter]').forEach((btn) =>
    btn.addEventListener('click', () => {
      state.selectedTechnicianFilter = btn.dataset.techFilter;
      renderPendingBoardView(container, state, { onRefreshOrders });
    })
  );

  container.querySelectorAll('[data-action="reassign-tech"]').forEach((select) =>
    select.addEventListener('change', async () => {
      select.disabled = true;
      try {
        await updateOrder(select.dataset.id, { tecnico_id: select.value || null });
        showToast('Técnico actualizado');
        await onRefreshOrders?.();
      } catch (err) {
        showToast(`Error al reasignar: ${err.message}`, 'error');
        select.disabled = false;
      }
    })
  );

  container.querySelectorAll('[data-action="advance-status"]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const orderId = btn.dataset.id;
      const nextEstado = btn.dataset.nextEstado;
      if (nextEstado === 'Entregado') {
        const order = activeOrders.find((o) => String(o.id) === String(orderId));
        if (order) openDeliveryConfirmModal(order, { onConfirmed: onRefreshOrders });
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
    })
  );

  container.querySelectorAll('[data-drag-order-id]').forEach((card) => {
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', card.dataset.dragOrderId);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('opacity-50');
    });
    card.addEventListener('dragend', () => card.classList.remove('opacity-50'));
  });

  container.querySelectorAll('[data-drop-estado]').forEach((colEl) => {
    colEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      colEl.classList.add('ring-2', 'ring-blue-400', 'bg-blue-50/40');
    });
    colEl.addEventListener('dragleave', (e) => {
      if (!colEl.contains(e.relatedTarget)) colEl.classList.remove('ring-2', 'ring-blue-400', 'bg-blue-50/40');
    });
    colEl.addEventListener('drop', async (e) => {
      e.preventDefault();
      colEl.classList.remove('ring-2', 'ring-blue-400', 'bg-blue-50/40');
      const orderId = e.dataTransfer.getData('text/plain');
      const targetEstado = colEl.dataset.dropEstado;
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
