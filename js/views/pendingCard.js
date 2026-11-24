import { escapeHtml } from '../utils.js';
import { buildStatusWhatsAppUrl } from '../whatsapp.js';

export const BOARD_COLUMNS = [
  { estado: 'Recibido', title: 'Recibidos / Por Revisar', dotClass: 'bg-slate-500', nextEstado: 'En Revisión', nextLabel: '→ En Revisión' },
  { estado: 'En Revisión', title: 'En Reparación', dotClass: 'bg-blue-600', nextEstado: 'Reparado', nextLabel: '→ Listo' },
  { estado: 'Por Aprobar', title: 'Esperando Repuesto / Aprob.', dotClass: 'bg-amber-500', nextEstado: 'Reparado', nextLabel: '→ Listo' },
  { estado: 'Reparado', estados: ['Reparado', 'Sin Reparación', 'Sin Falla'], title: 'Listo para Entrega', dotClass: 'bg-emerald-600', nextEstado: 'Entregado', nextLabel: '→ Entregado' },
];

function getSoberAgeBadge(isoString) {
  if (!isoString) return { label: 'Hoy', badgeClass: 'bg-slate-100 text-slate-600' };
  const days = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / (1000 * 60 * 60 * 24)));
  if (days >= 6) return { label: `${days} días`, badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold' };
  if (days >= 3) return { label: `${days} días`, badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200' };
  return { label: days === 0 ? 'Hoy' : days === 1 ? '1 día' : `${days} días`, badgeClass: 'bg-slate-100 text-slate-600' };
}

/** Tarjeta de trabajo para una columna del tablero Kanban. */
export function renderWorkCard(order, col, technicians, techMap) {
  const age = getSoberAgeBadge(order.fecha_ingreso);
  const tech = order.tecnico_id ? techMap.get(String(order.tecnico_id)) : null;
  const isUrgent = order.prioridad === 'Urgente / Garantía';
  const waUrl = buildStatusWhatsAppUrl(order);

  const subStatusBadge =
    order.estado === 'Sin Reparación'
      ? '<span class="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">Sin Reparación</span>'
      : order.estado === 'Sin Falla'
        ? '<span class="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold">Estaba Bueno</span>'
        : '';

  return `
    <article
      draggable="true"
      data-drag-order-id="${escapeHtml(order.id)}"
      class="bg-white rounded-xl border ${isUrgent ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'} p-3.5 shadow-sm hover:shadow-md transition-shadow duration-150 space-y-2.5 cursor-grab active:cursor-grabbing"
    >
      <div class="flex items-center justify-between gap-2">
        <span class="font-mono font-extrabold text-base text-slate-900 tracking-tight">#${escapeHtml(order.numero_orden)}</span>
        <div class="flex items-center gap-1.5 flex-wrap justify-end">
          ${subStatusBadge}
          ${isUrgent ? '<span class="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase">⚡ Urgente</span>' : ''}
          <span class="px-2 py-0.5 rounded-md text-[11px] font-medium ${age.badgeClass}">${escapeHtml(age.label)}</span>
        </div>
      </div>

      <div class="space-y-1">
        <p class="font-bold text-slate-900 text-sm leading-snug">${escapeHtml(order.tipo_equipo)}</p>
        <p class="text-xs text-slate-600 line-clamp-2">${escapeHtml(order.falla_reportada)}</p>
        <p class="text-xs text-slate-500 font-medium flex items-center gap-1.5 pt-0.5">
          <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span class="truncate">${escapeHtml(order.cliente_nombre)}</span>
        </p>
      </div>

      <div class="flex items-center gap-2 px-2.5 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-slate-100/80 transition-colors">
        <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${escapeHtml(tech?.color || '#94a3b8')}"></span>
        <select
          data-action="reassign-tech"
          data-id="${escapeHtml(order.id)}"
          aria-label="Asignar técnico"
          class="w-full min-h-[44px] sm:min-h-[34px] py-1 bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
        >
          <option value="" ${!order.tecnico_id ? 'selected' : ''}>Sin Asignar</option>
          ${technicians.map((t) => `<option value="${escapeHtml(t.id)}" ${String(order.tecnico_id) === String(t.id) ? 'selected' : ''}>${escapeHtml(t.nombre)}</option>`).join('')}
        </select>
      </div>

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
