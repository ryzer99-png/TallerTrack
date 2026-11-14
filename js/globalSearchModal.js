import { escapeHtml, formatDateTime, getPublicOrderUrl, STATUS_META } from './utils.js';

function matchesOrder(order, queryLower) {
  if (!queryLower) return true;
  const haystacks = [
    order.numero_orden,
    order.cliente_nombre,
    order.cliente_telefono,
    order.tipo_equipo,
    order.falla_reportada,
    order.observaciones,
  ];
  return haystacks.some((val) => String(val || '').toLowerCase().includes(queryLower));
}

function renderResultRow(order, techMap) {
  const isDelivered = order.estado === 'Entregado';
  const meta = STATUS_META[order.estado] || {
    label: order.estado,
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
  };
  const tech = order.tecnico_id ? techMap.get(String(order.tecnico_id)) : null;
  const publicUrl = getPublicOrderUrl(order);

  return `
    <div class="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="space-y-1 min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white font-mono font-black text-sm">
            #${escapeHtml(order.numero_orden)}
          </span>
          <span class="px-2 py-0.5 rounded-lg border text-[11px] font-black ${escapeHtml(meta.badgeClass)}">
            ${isDelivered ? '📦 Entregado' : `🔧 ${escapeHtml(meta.label)}`}
          </span>
          ${
            tech
              ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700">
                  <span class="w-2 h-2 rounded-full" style="background-color: ${escapeHtml(tech.color || '#1d4ed8')}"></span>
                  ${escapeHtml(tech.nombre)}
                </span>`
              : ''
          }
        </div>

        <p class="font-extrabold text-slate-900 text-sm truncate">
          ${escapeHtml(order.cliente_nombre)} · <span class="font-semibold text-slate-600">${escapeHtml(order.cliente_telefono)}</span>
        </p>
        <p class="text-xs text-slate-600 truncate">
          <strong class="text-slate-800">${escapeHtml(order.tipo_equipo)}</strong> — ${escapeHtml(order.falla_reportada)}
        </p>
        <p class="text-[11px] font-semibold ${isDelivered ? 'text-emerald-700' : 'text-slate-400'}">
          ${
            isDelivered
              ? `Entregado: ${order.fecha_entrega ? escapeHtml(formatDateTime(order.fecha_entrega)) : 'Sin fecha'}`
              : `Ingreso: ${escapeHtml(formatDateTime(order.fecha_ingreso))}`
          }
        </p>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <a
          href="${escapeHtml(publicUrl)}"
          target="_blank"
          rel="noopener noreferrer"
          class="min-h-[38px] px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center"
        >
          👁️ Ficha
        </a>
        <button
          type="button"
          data-action="jump-to-order"
          data-numero="${escapeHtml(order.numero_orden)}"
          data-target-view="${isDelivered ? 'entregados' : 'activas'}"
          class="min-h-[38px] px-3.5 rounded-lg ${isDelivered ? 'bg-slate-800 hover:bg-slate-900' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold text-xs transition-colors"
        >
          ${isDelivered ? 'Ver en Entregados →' : 'Ver en Órdenes →'}
        </button>
      </div>
    </div>
  `;
}

/**
 * Abre un buscador general sobre todas las órdenes (en taller y entregadas).
 */
export function openGlobalSearchModal(state, { onNavigate } = {}) {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  const techMap = new Map((state.technicians || []).map((t) => [String(t.id), t]));
  let query = '';

  modalRoot.className = 'fixed inset-0 z-50 bg-slate-950/70 flex items-start justify-center p-3 sm:p-6 pt-10 sm:pt-16';
  modalRoot.innerHTML = `
    <div class="bg-slate-50 rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[82vh]">
      <div class="bg-white p-4 border-b border-slate-200 flex items-center gap-3">
        <svg class="w-5 h-5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          id="global-search-input"
          type="search"
          placeholder="Buscar en TODO (Órdenes y Entregados): #orden, nombre, celular, equipo..."
          class="w-full text-sm sm:text-base font-semibold text-slate-900 placeholder:text-slate-400 outline-none bg-transparent"
        />
        <button
          type="button"
          id="close-global-search"
          class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs shrink-0"
        >
          ESC
        </button>
      </div>

      <div id="global-search-meta" class="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100/80 border-b border-slate-200"></div>

      <div id="global-search-results" class="p-3 sm:p-4 space-y-2.5 overflow-y-auto"></div>
    </div>
  `;

  const input = document.getElementById('global-search-input');
  const metaEl = document.getElementById('global-search-meta');
  const resultsEl = document.getElementById('global-search-results');

  const closeModal = () => {
    document.removeEventListener('keydown', onKeyDown);
    modalRoot.className = 'fixed inset-0 z-50 hidden';
    modalRoot.innerHTML = '';
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', onKeyDown);

  modalRoot.querySelector('#close-global-search')?.addEventListener('click', closeModal);
  modalRoot.addEventListener('click', (e) => {
    if (e.target === modalRoot) closeModal();
  });

  const renderResults = () => {
    const qLower = query.trim().toLowerCase();
    const matches = (state.orders || []).filter((o) => matchesOrder(o, qLower));
    const visible = matches.slice(0, 25);

    const activeCount = matches.filter((o) => o.estado !== 'Entregado').length;
    const deliveredCount = matches.length - activeCount;

    if (metaEl) {
      metaEl.textContent = qLower
        ? `${matches.length} resultado(s) — ${activeCount} en taller · ${deliveredCount} entregado(s)${matches.length > 25 ? ' (mostrando 25)' : ''}`
        : `Mostrando ${visible.length} de ${matches.length} órdenes recientes (${activeCount} en taller · ${deliveredCount} entregadas)`;
    }

    if (!resultsEl) return;
    if (visible.length === 0) {
      resultsEl.innerHTML = `
        <div class="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p class="font-extrabold text-slate-800">Sin coincidencias para "${escapeHtml(query.trim())}"</p>
          <p class="text-xs text-slate-500 mt-1">Prueba con el número de orden, últimos 4 dígitos del teléfono o nombre.</p>
        </div>
      `;
      return;
    }

    resultsEl.innerHTML = visible.map((o) => renderResultRow(o, techMap)).join('');
    resultsEl.querySelectorAll('[data-action="jump-to-order"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const numero = btn.dataset.numero || '';
        const targetView = btn.dataset.targetView || 'activas';
        if (targetView === 'entregados') {
          state.deliveredSearchQuery = numero;
        } else {
          state.searchQuery = numero;
          state.statusFilter = 'Activas';
        }
        closeModal();
        onNavigate?.(targetView);
      });
    });
  };

  input?.addEventListener('input', (e) => {
    query = e.target.value;
    renderResults();
  });

  renderResults();
  input?.focus();
}
