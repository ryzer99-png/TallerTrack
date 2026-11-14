import { updateOrder } from '../ordersService.js';
import {
  escapeHtml,
  formatCurrency,
  formatDateTime,
  getPublicOrderUrl,
  showToast,
} from '../utils.js';
import { buildStatusWhatsAppUrl } from '../whatsapp.js';

export function renderDeliveredOrdersView(container, state, { onRefreshOrders }) {
  const { orders, technicians, isLoading } = state;
  const searchQuery = String(state.deliveredSearchQuery || '');
  const techMap = new Map((technicians || []).map((t) => [String(t.id), t]));

  const deliveredOrders = orders
    .filter((o) => o.estado === 'Entregado')
    .sort((a, b) => {
      const dateA = new Date(a.fecha_entrega || a.fecha_ingreso || 0).getTime();
      const dateB = new Date(b.fecha_entrega || b.fecha_ingreso || 0).getTime();
      return dateB - dateA;
    });
  const q = searchQuery.trim().toLowerCase();

  const filtered = deliveredOrders.filter((order) => {
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

  container.innerHTML = `
    <section class="space-y-4">
      <!-- Encabezado y buscador de historial / garantías -->
      <div class="bg-white rounded-2xl border border-slate-200/90 shadow-lg shadow-slate-300/30 p-3.5 sm:p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Equipos Entregados y Garantías</h2>
            <p class="text-xs sm:text-sm text-slate-500 font-medium">Historial de equipos entregados para consulta o reingreso por garantía</p>
          </div>
          <span class="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 font-mono text-xs font-extrabold text-slate-700">
            ${deliveredOrders.length} entregado(s)
          </span>
        </div>

        <div class="flex flex-col sm:flex-row gap-2.5">
          <div class="relative flex-1 flex items-center">
            <span class="absolute left-3.5 text-slate-400 pointer-events-none">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </span>
            <input
              id="delivered-search-input"
              type="search"
              inputmode="search"
              value="${escapeHtml(searchQuery)}"
              placeholder="Buscar entregado por N° orden, últimos 4 dígitos del cel, nombre o equipo..."
              class="w-full min-h-[48px] pl-11 pr-4 py-2.5 text-base sm:text-lg font-semibold rounded-xl border border-slate-300 bg-slate-50/70 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none transition-all duration-150"
            />
          </div>
          <button
            id="refresh-delivered-btn"
            type="button"
            class="touch-btn px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 font-bold text-slate-700 text-sm sm:text-base transition-colors"
          >
            ↻ Actualizar
          </button>
        </div>
      </div>

      ${
        isLoading
          ? '<div class="bg-white rounded-2xl border border-slate-200 p-8 text-center font-bold text-slate-600">Cargando historial de entregados...</div>'
          : filtered.length === 0
            ? `<div class="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-1.5">
                <p class="text-lg font-black text-slate-800">${deliveredOrders.length === 0 ? 'Aún no hay equipos entregados' : 'No hay coincidencias'}</p>
                <p class="text-sm font-medium text-slate-500">${deliveredOrders.length === 0 ? 'Cuando marques una orden como Entregado aparecerá aquí.' : 'Prueba buscando por otro número de orden, teléfono o nombre.'}</p>
              </div>`
            : `<div class="grid grid-cols-1 gap-4">
                ${filtered.map((o) => renderDeliveredCard(o, techMap)).join('')}
              </div>`
      }
    </section>
  `;

  const searchInput = container.querySelector('#delivered-search-input');
  searchInput?.addEventListener('input', (e) => {
    state.deliveredSearchQuery = e.target.value;
    renderDeliveredOrdersView(container, state, { onRefreshOrders });
    const nextInput = container.querySelector('#delivered-search-input');
    if (nextInput) {
      nextInput.focus();
      const len = nextInput.value.length;
      nextInput.setSelectionRange(len, len);
    }
  });

  container.querySelector('#refresh-delivered-btn')?.addEventListener('click', () => {
    onRefreshOrders?.();
  });

  container.querySelectorAll('[data-action="reenter-warranty"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      btn.disabled = true;
      btn.textContent = 'Reingresando...';
      try {
        await updateOrder(id, {
          estado: 'En Revisión',
          prioridad: 'Urgente / Garantía',
        });
        showToast('Orden reingresada por garantía a Órdenes Activas');
        await onRefreshOrders?.();
      } catch (err) {
        showToast(`Error al reingresar: ${err.message}`, 'error');
        btn.disabled = false;
        btn.textContent = '🔄 Reingresar por Garantía';
      }
    });
  });
}

function renderDeliveredCard(order, techMap) {
  const tech = order.tecnico_id ? techMap.get(String(order.tecnico_id)) : null;
  const costo = Number(order.costo_estimado || 0);
  const publicUrl = getPublicOrderUrl(order);
  const waUrl = buildStatusWhatsAppUrl(order);

  const obsLines = String(order.observaciones || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const deliveryNotes = obsLines
    .filter((l) => l.startsWith('Entrega:'))
    .map((l) => l.replace(/^Entrega:\s*/i, '').trim())
    .filter(Boolean);
  const intakeNotes = obsLines.filter((l) => !l.startsWith('Entrega:'));

  return `
    <article class="bg-white rounded-2xl border border-slate-200/90 shadow-md shadow-slate-200/40 p-4 sm:p-5 space-y-3.5">
      <div class="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div class="flex items-center gap-3">
          <div class="px-3.5 py-2 rounded-xl bg-slate-800 text-white font-mono font-black text-xl sm:text-2xl tracking-tight">
            #${escapeHtml(order.numero_orden)}
          </div>
          <div>
            <h3 class="text-lg font-black text-slate-900 leading-tight">${escapeHtml(order.cliente_nombre)}</h3>
            <p class="text-xs sm:text-sm font-bold text-slate-500">
              📞 ${escapeHtml(order.cliente_telefono)} · Ingreso: ${escapeHtml(formatDateTime(order.fecha_ingreso))}
            </p>
            <p class="text-xs sm:text-sm font-extrabold text-emerald-800 mt-0.5">
              📅 Entregado: ${order.fecha_entrega ? escapeHtml(formatDateTime(order.fecha_entrega)) : 'Sin fecha registrada'}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          ${
            tech
              ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                  <span class="w-2 h-2 rounded-full" style="background-color: ${escapeHtml(tech.color || '#1d4ed8')}"></span>
                  ${escapeHtml(tech.nombre)}
                </span>`
              : ''
          }
          <span class="px-3 py-1 rounded-xl border border-zinc-300 bg-zinc-100 text-zinc-800 text-xs font-black">
            Entregado
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div class="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
          <span class="block text-[11px] font-black uppercase tracking-wider text-slate-500">Equipo y Accesorios</span>
          <p class="font-extrabold text-slate-900">${escapeHtml(order.tipo_equipo)}</p>
          <p class="text-slate-600 font-semibold text-xs">Acc: ${escapeHtml(order.accesorios || 'Ninguno')}</p>
        </div>

        <div class="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
          <span class="block text-[11px] font-black uppercase tracking-wider text-slate-500">Falla Reportada</span>
          <p class="font-bold text-slate-900">${escapeHtml(order.falla_reportada)}</p>
          ${intakeNotes.length > 0 ? `<p class="text-slate-500 font-medium text-xs">${escapeHtml(intakeNotes.join(' · '))}</p>` : ''}
        </div>

        <div class="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex flex-col justify-center">
          <span class="block text-[11px] font-black uppercase tracking-wider text-slate-500">Precio Cobrado</span>
          <p class="font-mono font-black text-lg text-slate-900">${costo > 0 ? escapeHtml(formatCurrency(costo)) : 'Sin precio registrado'}</p>
        </div>
      </div>

      ${
        deliveryNotes.length > 0
          ? `<div class="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-amber-950">
              <span class="font-black uppercase tracking-wide text-[11px] text-amber-800 mr-1.5">📝 Nota de entrega:</span>
              <span class="font-semibold">${escapeHtml(deliveryNotes.join(' · '))}</span>
            </div>`
          : ''
      }

      <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div class="flex flex-wrap items-center gap-2">
          <a
            href="${escapeHtml(publicUrl)}"
            target="_blank"
            rel="noopener noreferrer"
            class="touch-btn px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold text-sm flex items-center"
          >
            👁️ Ficha
          </a>
          <a
            href="${escapeHtml(waUrl)}"
            target="_blank"
            rel="noopener noreferrer"
            class="touch-btn px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-sm flex items-center"
          >
            📲 WhatsApp
          </a>
        </div>

        <button
          type="button"
          data-action="reenter-warranty"
          data-id="${escapeHtml(order.id)}"
          class="touch-btn px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 font-extrabold text-sm"
        >
          🔄 Reingresar por Garantía
        </button>
      </div>
    </article>
  `;
}

