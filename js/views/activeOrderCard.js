import { escapeHtml, formatCurrency, formatDateTime, getPublicOrderUrl, STATUS_META } from '../utils.js';
import { buildStatusWhatsAppUrl } from '../whatsapp.js';

export const FILTER_OPTIONS = [
  { id: 'Activas', label: 'En Taller (Activas)' },
  { id: 'Recibido', label: 'Recibido' },
  { id: 'En Revisión', label: 'En Revisión' },
  { id: 'Por Aprobar', label: 'Por Aprobar' },
  { id: 'Reparado', label: 'Reparado' },
  { id: 'Sin Reparación', label: 'Sin Reparación' },
  { id: 'Sin Falla', label: 'Estaba Bueno' },
];

export const QUICK_STATUS_BUTTONS = [
  { estado: 'En Revisión', label: 'En Revisión' },
  { estado: 'Por Aprobar', label: 'Avisar Cotización' },
  { estado: 'Reparado', label: 'Listo / Reparado' },
  { estado: 'Sin Reparación', label: 'Sin Reparación' },
  { estado: 'Sin Falla', label: 'Estaba Bueno' },
  { estado: 'Entregado', label: 'Entregado' },
];

/** Renderiza la tarjeta completa de una orden activa con botones de 1 toque. */
export function renderOrderCard(order, techMap) {
  const meta = STATUS_META[order.estado] || STATUS_META['Recibido'];
  const waUrl = buildStatusWhatsAppUrl(order);
  const publicUrl = getPublicOrderUrl(order);
  const isPrinted = Boolean(order.impresa);
  const costo = Number(order.costo_estimado || 0);
  const tech = order.tecnico_id ? techMap.get(String(order.tecnico_id)) : null;

  return `
    <article class="bg-white rounded-2xl border border-slate-200/90 shadow-lg shadow-slate-300/30 p-4 sm:p-5 space-y-4">
      <div class="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div class="flex items-center gap-3 min-w-0">
          <div class="px-3.5 py-2 rounded-xl bg-slate-900 text-white font-mono font-black text-2xl sm:text-3xl tracking-tight shadow-sm shrink-0">
            #${escapeHtml(order.numero_orden)}
          </div>
          <div class="min-w-0">
            <h3 class="text-lg sm:text-xl font-black text-slate-900 leading-tight truncate">${escapeHtml(order.cliente_nombre)}</h3>
            <p class="text-xs sm:text-sm font-bold text-slate-600 break-words">📞 ${escapeHtml(order.cliente_telefono)} · ${escapeHtml(formatDateTime(order.fecha_ingreso))}</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          ${tech
            ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-300 text-xs font-extrabold text-slate-800">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${escapeHtml(tech.color || '#1d4ed8')}"></span>
                ${escapeHtml(tech.nombre)}
              </span>`
            : `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-500">Sin asignar</span>`}
          <span class="px-3 py-1.5 rounded-xl border-2 text-xs sm:text-sm font-black ${meta.badgeClass}">${escapeHtml(meta.label)}</span>
          <span class="px-3 py-1.5 rounded-xl border-2 text-xs font-extrabold ${isPrinted ? 'bg-emerald-50 text-emerald-900 border-emerald-400' : 'bg-amber-50 text-amber-900 border-amber-400'}">
            ${isPrinted ? '🖨️ Impreso' : '⏳ Pendiente de imprimir'}
          </span>
        </div>
      </div>

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

      <div>
        <span class="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Cambiar estado (1 toque):</span>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          ${QUICK_STATUS_BUTTONS.map((btn) => {
            const isCurrent = order.estado === btn.estado;
            return `
              <button
                type="button"
                data-action="set-status"
                data-id="${escapeHtml(order.id)}"
                data-estado="${escapeHtml(btn.estado)}"
                class="touch-chip px-3 py-2.5 rounded-xl border-2 font-extrabold text-xs sm:text-sm text-center ${
                  isCurrent ? 'bg-blue-700 text-white border-blue-900 shadow' : 'bg-white text-slate-900 border-slate-300 hover:border-blue-600 hover:bg-blue-50'
                }"
              >
                ${escapeHtml(btn.label)}
              </button>`;
          }).join('')}
        </div>
      </div>

      <div class="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between gap-2 pt-2.5 border-t-2 border-slate-200">
        <div class="contents sm:flex sm:flex-wrap sm:items-center sm:gap-2">
          <button
            type="button"
            data-action="edit-cost"
            data-id="${escapeHtml(order.id)}"
            class="col-span-2 sm:col-span-1 w-full sm:w-auto touch-btn px-4 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border-2 border-amber-400 font-extrabold text-sm sm:text-base text-center"
          >
            💰 Precio Reparación: ${costo > 0 ? escapeHtml(formatCurrency(costo)) : 'Asignar'}
          </button>
          <button
            type="button"
            data-action="copy-link"
            data-id="${escapeHtml(order.id)}"
            class="w-full sm:w-auto touch-btn px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold text-sm flex items-center justify-center gap-1"
          >
            🔗 Link QR
          </button>
          <a
            href="${escapeHtml(publicUrl)}"
            target="_blank"
            rel="noopener noreferrer"
            class="w-full sm:w-auto touch-btn px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold text-sm flex items-center justify-center gap-1"
          >
            👁️ Ficha
          </a>
        </div>
        <a
          href="${escapeHtml(waUrl)}"
          target="_blank"
          rel="noopener noreferrer"
          class="col-span-2 w-full sm:w-auto touch-btn px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-emerald-800 font-black text-base flex items-center justify-center gap-2 shadow-sm"
        >
          <span>📲 Avisar por WhatsApp</span>
        </a>
      </div>
    </article>
  `;
}
