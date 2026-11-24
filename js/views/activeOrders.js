import { openDeliveryConfirmModal } from '../deliveryModal.js';
import { updateOrder } from '../services/ordenesService.js';
import { escapeHtml, getPublicOrderUrl, paginateItems, renderPaginationBar, showToast } from '../utils.js';
import { FILTER_OPTIONS, renderOrderCard } from './activeOrderCard.js';
import { openCostModal } from './costModal.js';

/** Renderiza la lista de órdenes activas en taller con búsqueda, filtros y paginación. */
export function renderActiveOrdersView(container, state, { onRefreshOrders }) {
  const { orders, technicians = [], searchQuery, statusFilter, isLoading } = state;
  const techMap = new Map(technicians.map((t) => [String(t.id), t]));
  const q = searchQuery.trim().toLowerCase();

  const filtered = orders.filter((order) => {
    if (order.estado === 'Entregado') return false;
    if (statusFilter !== 'Activas' && order.estado !== statusFilter) return false;
    if (!q) return true;

    const phoneDigits = String(order.cliente_telefono || '').replace(/\D/g, '');
    return (
      String(order.numero_orden || '').includes(q) ||
      phoneDigits.slice(-4).includes(q) ||
      phoneDigits.includes(q) ||
      String(order.cliente_nombre || '').toLowerCase().includes(q) ||
      String(order.tipo_equipo || '').toLowerCase().includes(q)
    );
  });

  const pagination = paginateItems(filtered, state.activePage || 1, 10);
  state.activePage = pagination.page;

  container.innerHTML = `
    <section class="space-y-4">
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

        <div id="status-filter-bar" class="flex flex-nowrap gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth snap-x snap-mandatory">
          ${FILTER_OPTIONS.map((opt) => {
            const active = statusFilter === opt.id;
            return `
              <button
                type="button"
                data-filter-status="${escapeHtml(opt.id)}"
                class="touch-chip snap-start shrink-0 px-3.5 py-2 rounded-xl border font-bold text-sm transition-colors ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                }"
              >
                ${escapeHtml(opt.label)}
              </button>`;
          }).join('')}
        </div>
      </div>

      ${isLoading
        ? '<div class="bg-white rounded-2xl border border-slate-200 p-8 text-center font-bold text-slate-600">Cargando órdenes...</div>'
        : filtered.length === 0
          ? `<div class="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
              <p class="text-xl font-black text-slate-800">No se encontraron órdenes</p>
              <p class="text-sm font-medium text-slate-500">Prueba cambiando el filtro o buscando por número de orden o teléfono.</p>
            </div>`
          : `<div id="orders-grid" class="grid grid-cols-1 gap-4">${pagination.pageItems.map((o) => renderOrderCard(o, techMap)).join('')}</div>
             ${renderPaginationBar({ ...pagination, itemLabel: 'órdenes' })}`}
    </section>
  `;

  const searchInput = container.querySelector('#orders-search-input');
  searchInput?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    state.activePage = 1;
    renderActiveOrdersView(container, state, { onRefreshOrders });
    const nextInput = container.querySelector('#orders-search-input');
    if (nextInput) {
      nextInput.focus();
      nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
    }
  });

  container.querySelector('#refresh-orders-btn')?.addEventListener('click', () => onRefreshOrders?.());

  container.querySelectorAll('[data-filter-status]').forEach((btn) =>
    btn.addEventListener('click', () => {
      state.statusFilter = btn.dataset.filterStatus;
      state.activePage = 1;
      renderActiveOrdersView(container, state, { onRefreshOrders });
    })
  );

  container.querySelectorAll('[data-page-action]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const dir = btn.dataset.pageAction;
      state.activePage = dir === 'prev' ? Math.max(1, pagination.page - 1) : Math.min(pagination.totalPages, pagination.page + 1);
      renderActiveOrdersView(container, state, { onRefreshOrders });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    })
  );

  container.querySelectorAll('[data-page-num]').forEach((btn) =>
    btn.addEventListener('click', () => {
      state.activePage = Number(btn.dataset.pageNum) || 1;
      renderActiveOrdersView(container, state, { onRefreshOrders });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    })
  );

  container.querySelectorAll('[data-action="set-status"]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const nextEstado = btn.dataset.estado;
      if (nextEstado === 'Entregado') {
        const order = orders.find((o) => String(o.id) === String(id));
        if (order) openDeliveryConfirmModal(order, { onConfirmed: onRefreshOrders });
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
        showToast(`Error al actualizar: ${err.message}`, 'error');
        btn.disabled = false;
        btn.textContent = originalText;
      }
    })
  );

  container.querySelectorAll('[data-action="edit-cost"]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const order = orders.find((o) => String(o.id) === String(btn.dataset.id));
      if (order) openCostModal(order, onRefreshOrders);
    })
  );

  container.querySelectorAll('[data-action="copy-link"]').forEach((btn) =>
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
    })
  );
}
