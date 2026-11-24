import { escapeHtml } from '../utils.js';

export const ACCESSORY_OPTIONS = [
  'Sin accesorios',
  'Cable de poder',
  'Control remoto',
  'Adaptador / Cargador',
  'Batería',
  'Bases / Patas',
];

export const FAULT_CHIPS = [
  'No enciende',
  'No da imagen / pantalla oscura',
  'Sin sonido',
  'En corto',
];

/** Renderiza el markup puro del formulario de nueva orden. */
export function renderNewOrderTemplate(technicians = []) {
  return `
    <section class="w-full max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-300/40 overflow-hidden">
      <div class="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500"></div>
      <div class="p-4 sm:p-6 space-y-6">
        <div class="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-200/80">
          <div>
            <h2 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Nueva Orden de Ingreso</h2>
            <p class="text-sm text-slate-500 font-medium mt-0.5">Recepción rápida de equipos en mesón</p>
          </div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-dashed border-emerald-300">
            <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
            <span>Impresión automática al guardar</span>
          </span>
        </div>

        <form id="new-order-form" class="space-y-5" novalidate>
          <div class="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5 space-y-5">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono text-[11px] font-bold">01</span>
              <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-600">Identificación del Equipo</h3>
            </div>

            <div id="equipment-field-wrap" class="relative">
              <label for="tipo-equipo-input" class="block text-sm font-bold text-slate-800 mb-2">
                Tipo de Equipo <span class="text-red-600">*</span>
              </label>
              <div id="equipment-suggestions-tray" class="hidden mb-2.5 p-2.5 sm:p-3 rounded-xl border border-blue-200 bg-white shadow-md shadow-slate-200/60 space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-blue-800">Más frecuentes en el taller</span>
                  <button id="close-equipment-tray-btn" type="button" class="min-h-[44px] px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">Ocultar</button>
                </div>
                <div id="equipment-suggestions-list" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"></div>
              </div>
              <div class="flex items-center rounded-xl border border-slate-300 bg-slate-50/70 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600 transition-all duration-150 pr-1.5">
                <div class="pl-3.5 text-slate-400 pointer-events-none shrink-0">
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
                </div>
                <input id="tipo-equipo-input" name="tipo_equipo" type="text" required autocomplete="off" placeholder="Ej: TV, Linterna, Inversor, Tarjeta Electrónica..." class="w-full min-h-[48px] px-3 py-2.5 text-base sm:text-lg font-semibold text-slate-900 bg-transparent focus:outline-none" />
                <button id="clear-equipment-btn" type="button" aria-label="Limpiar tipo de equipo" class="hidden shrink-0 w-8 h-8 mr-1 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-bold text-sm flex items-center justify-center transition-colors">✕</button>
                <button id="toggle-equipment-tray-btn" type="button" aria-expanded="false" class="shrink-0 min-h-[44px] px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs sm:text-sm flex items-center gap-1 transition-colors duration-150"><span>⚡ Rápidos</span></button>
              </div>
            </div>

            <div class="space-y-3">
              <label class="block text-sm font-bold text-slate-800">Accesorios Recibidos</label>
              <div id="accessory-chips" class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                ${ACCESSORY_OPTIONS.map((acc) => `
                  <button type="button" data-accessory="${escapeHtml(acc)}" class="touch-chip w-full px-2.5 sm:px-3 py-2 rounded-xl border font-semibold text-xs sm:text-sm text-center leading-tight flex items-center justify-center gap-1.5">${escapeHtml(acc)}</button>
                `).join('')}
              </div>
              <div>
                <label for="accesorios-detalle-input" class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Otros accesorios o detalles:</label>
                <input id="accesorios-detalle-input" name="accesorios_detalle" type="text" autocomplete="off" placeholder="Ej: incluye estuche, cable HDMI, adaptador 12V..." class="w-full min-h-[46px] px-3.5 py-2.5 text-base font-medium rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none transition-all duration-150" />
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5 space-y-4">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono text-[11px] font-bold">02</span>
              <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-600">Cliente y Contacto</h3>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label for="cliente-nombre" class="block text-sm font-bold text-slate-800 mb-1.5">Nombre del Cliente <span class="text-red-600">*</span></label>
                <div class="relative flex items-center">
                  <span class="absolute left-3.5 text-slate-400 pointer-events-none"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                  <input id="cliente-nombre" name="cliente_nombre" type="text" required autocomplete="name" placeholder="Ej: Juan Pérez" class="w-full min-h-[48px] pl-10 pr-4 py-2.5 text-base sm:text-lg font-semibold rounded-xl border border-slate-300 bg-slate-50/70 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none transition-all duration-150" />
                </div>
              </div>
              <div>
                <label for="cliente-telefono" class="block text-sm font-bold text-slate-800 mb-1.5">WhatsApp / Teléfono <span class="text-red-600">*</span></label>
                <div class="relative flex items-center">
                  <span class="absolute left-3.5 text-slate-400 pointer-events-none"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></span>
                  <input id="cliente-telefono" name="cliente_telefono" type="tel" inputmode="tel" required autocomplete="tel" placeholder="Ej: 3001234567" class="w-full min-h-[48px] pl-10 pr-4 py-2.5 text-base sm:text-lg font-semibold font-mono rounded-xl border border-slate-300 bg-slate-50/70 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none transition-all duration-150" />
                </div>
              </div>
            </div>
            <div id="returning-client-suggestions" class="hidden rounded-xl border border-blue-200 bg-white p-3 space-y-2"></div>
          </div>

          <div class="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5 space-y-4">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono text-[11px] font-bold">03</span>
              <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-600">Diagnóstico Inicial</h3>
            </div>
            <div>
              <label for="falla-reportada" class="block text-sm font-bold text-slate-800 mb-2">Falla Reportada <span class="text-red-600">*</span></label>
              <div id="fault-chips" class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2.5">
                ${FAULT_CHIPS.map((fault) => `
                  <button type="button" data-fault="${escapeHtml(fault)}" class="touch-chip w-full px-2.5 sm:px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-700 font-semibold text-xs sm:text-sm text-center leading-tight flex items-center justify-center transition-colors duration-150">+ ${escapeHtml(fault)}</button>
                `).join('')}
              </div>
              <div class="relative">
                <span class="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></span>
                <textarea id="falla-reportada" name="falla_reportada" rows="2" required placeholder="Describe la falla o toca los chips de arriba..." class="w-full pl-10 pr-4 py-3 text-base sm:text-lg font-medium rounded-xl border border-slate-300 bg-slate-50/70 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none transition-all duration-150"></textarea>
              </div>
            </div>
            <div>
              <label for="observaciones" class="block text-sm font-bold text-slate-800 mb-1.5">Observaciones</label>
              <div class="relative flex items-center">
                <span class="absolute left-3.5 text-slate-400 pointer-events-none"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></span>
                <input id="observaciones" name="observaciones" type="text" value="Revisar y cotizar antes de reparar" class="w-full min-h-[46px] pl-10 pr-4 py-2 text-base font-medium rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none transition-all duration-150" />
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5 space-y-4">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono text-[11px] font-bold">04</span>
              <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-600">Asignación y Taller</h3>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div class="lg:col-span-8 space-y-2">
                <label class="block text-sm font-bold text-slate-800">Técnico Responsable</label>
                <div id="technician-chips" class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button type="button" data-tech-id="" data-tech-name="Sin Asignar" data-tech-color="" class="touch-chip py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5">Sin Asignar</button>
                  ${technicians.map((t) => `
                    <button type="button" data-tech-id="${escapeHtml(t.id)}" data-tech-name="${escapeHtml(t.nombre)}" data-tech-color="${escapeHtml(t.color || '#1d4ed8')}" class="touch-chip py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2">
                      <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${escapeHtml(t.color || '#1d4ed8')}"></span>
                      <span class="truncate">${escapeHtml(t.nombre)}</span>
                    </button>`).join('')}
                </div>
              </div>
              <div class="lg:col-span-4 space-y-2">
                <label class="block text-sm font-bold text-slate-800">Prioridad del Servicio</label>
                <div id="priority-segmented" class="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white border border-slate-200">
                  <button type="button" data-priority="Normal" class="touch-chip py-2 px-2.5 rounded-lg border text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1">Normal</button>
                  <button type="button" data-priority="Urgente / Garantía" class="touch-chip py-2 px-2.5 rounded-lg border text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1">⚡ Urgente</button>
                </div>
                <p id="priority-hint" class="text-[11px] font-medium text-slate-500">Orden regular de ingreso en taller</p>
              </div>
            </div>
          </div>

          <button id="submit-order-btn" type="submit" class="touch-btn w-full min-h-[56px] py-4 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-lg tracking-wide shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2.5 transition-all duration-150">
            <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
            <span>REGISTRAR ORDEN</span>
          </button>
        </form>
      </div>
    </section>
  `;
}
