import { getConfig } from '../config.js';
import { getOrderByIdOrNumber } from '../ordersService.js';
import {
  escapeHtml,
  formatCurrency,
  formatDateTime,
  ORDER_STATES,
  STATUS_META,
} from '../utils.js';
import { buildWorkshopContactWhatsAppUrl } from '../whatsapp.js';

export async function renderPublicOrderView(container, orderId) {
  const { TELERADIO_DIRECCION } = getConfig();

  if (!orderId) {
    container.innerHTML = renderPublicError(
      'Falta el número o identificador de orden',
      'Escanea nuevamente el código QR de tu ticket o abre el enlace completo que te enviamos por WhatsApp.'
    );
    return;
  }

  container.innerHTML = `
    <div class="max-w-xl mx-auto bg-white rounded-3xl border-2 border-slate-300 shadow-sm p-8 text-center space-y-3">
      <div class="w-12 h-12 rounded-2xl bg-slate-900 text-white font-black text-xl flex items-center justify-center mx-auto">
        TR
      </div>
      <p class="text-lg font-extrabold text-slate-800">Consultando estado de tu orden...</p>
    </div>
  `;

  try {
    const order = await getOrderByIdOrNumber(orderId);
    if (!order) {
      container.innerHTML = renderPublicError(
        'Orden no encontrada',
        'No encontramos una orden con ese código. Verifica el enlace o comunícate con Teleradio.'
      );
      return;
    }

    const meta = STATUS_META[order.estado] || STATUS_META['Recibido'];
    const currentStep = meta.stepIndex;
    const contactUrl = buildWorkshopContactWhatsAppUrl(order);
    const costo = Number(order.costo_estimado || 0);

    container.innerHTML = `
      <div class="max-w-xl mx-auto space-y-4">
        <!-- Encabezado de marca para cliente -->
        <div class="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border-b-4 border-blue-600 flex items-center justify-between gap-4">
          <div>
            <p class="text-xs font-black uppercase tracking-widest text-blue-300">${escapeHtml(TELERADIO_DIRECCION)}</p>
            <h1 class="text-2xl sm:text-3xl font-black tracking-tight">Estado de Reparación</h1>
          </div>
          <div class="px-4 py-2 rounded-2xl bg-white text-slate-900 text-center shrink-0">
            <span class="block text-[10px] font-black uppercase tracking-wider text-slate-500">Orden</span>
            <span class="font-mono font-black text-2xl sm:text-3xl">#${escapeHtml(order.numero_orden)}</span>
          </div>
        </div>

        <!-- Estado actual destacado -->
        <section class="bg-white rounded-3xl border-2 border-slate-300 shadow-sm p-5 sm:p-6 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs font-black uppercase tracking-wider text-slate-500">Estado Actual</span>
            <span class="px-3.5 py-1.5 rounded-xl border-2 text-base font-black ${meta.badgeClass}">
              ${escapeHtml(meta.label)}
            </span>
          </div>

          <p class="text-base sm:text-lg font-bold text-slate-800">
            ${escapeHtml(meta.description)}
          </p>

          <!-- Línea de progreso de 5 pasos -->
          <div class="pt-2 space-y-2">
            ${ORDER_STATES.map((stepName, idx) => {
              const done = idx < currentStep;
              const current = idx === currentStep;
              return `
                <div class="flex items-center gap-3">
                  <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 border-2 ${
                    current
                      ? 'bg-blue-700 text-white border-blue-900'
                      : done
                        ? 'bg-emerald-600 text-white border-emerald-800'
                        : 'bg-slate-100 text-slate-400 border-slate-300'
                  }">
                    ${done ? '✓' : idx + 1}
                  </div>
                  <span class="text-sm sm:text-base ${
                    current
                      ? 'font-black text-slate-900'
                      : done
                        ? 'font-bold text-emerald-800'
                        : 'font-semibold text-slate-400'
                  }">
                    ${escapeHtml(stepName)}
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        </section>

        <!-- Datos del radicado -->
        <section class="bg-white rounded-3xl border-2 border-slate-300 shadow-sm p-5 sm:p-6 space-y-3">
          <h2 class="text-sm font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">
            Datos del Radicado
          </h2>

          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm sm:text-base">
            <div>
              <dt class="text-xs font-bold uppercase text-slate-500">Cliente</dt>
              <dd class="font-extrabold text-slate-900">${escapeHtml(order.cliente_nombre)}</dd>
            </div>
            <div>
              <dt class="text-xs font-bold uppercase text-slate-500">Fecha de Ingreso</dt>
              <dd class="font-bold text-slate-900">${escapeHtml(formatDateTime(order.fecha_ingreso))}</dd>
            </div>
            <div>
              <dt class="text-xs font-bold uppercase text-slate-500">Equipo</dt>
              <dd class="font-extrabold text-slate-900">${escapeHtml(order.tipo_equipo)}</dd>
            </div>
            <div>
              <dt class="text-xs font-bold uppercase text-slate-500">Accesorios</dt>
              <dd class="font-bold text-slate-900">${escapeHtml(order.accesorios || 'Ninguno')}</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-xs font-bold uppercase text-slate-500">Falla Reportada</dt>
              <dd class="font-extrabold text-slate-900">${escapeHtml(order.falla_reportada)}</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-xs font-bold uppercase text-slate-500">Observaciones</dt>
              <dd class="font-semibold text-slate-700">${escapeHtml(order.observaciones || '—')}</dd>
            </div>
            ${
              costo > 0
                ? `
              <div class="sm:col-span-2 bg-amber-50 border-2 border-amber-300 rounded-2xl p-3.5 flex items-center justify-between">
                <span class="text-sm font-black uppercase text-amber-950">Valor Estimado</span>
                <span class="text-2xl font-black font-mono text-amber-950">${escapeHtml(formatCurrency(costo))}</span>
              </div>
            `
                : ''
            }
          </dl>
        </section>

        <!-- Botón de contacto directo con Teleradio -->
        <a
          href="${escapeHtml(contactUrl)}"
          target="_blank"
          rel="noopener noreferrer"
          class="touch-btn w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg text-center flex items-center justify-center gap-2 shadow-md border-2 border-emerald-800"
        >
          <span>💬 Contactar a Teleradio por WhatsApp</span>
        </a>
      </div>
    `;
  } catch (err) {
    console.error('Error consultando orden pública:', err);
    container.innerHTML = renderPublicError(
      'No pudimos consultar la orden',
      'Ocurrió un error de conexión. Intenta nuevamente en unos segundos.'
    );
  }
}

function renderPublicError(title, description) {
  return `
    <div class="max-w-md mx-auto bg-white rounded-3xl border-2 border-slate-300 shadow-sm p-6 text-center space-y-3">
      <div class="w-12 h-12 rounded-2xl bg-red-100 text-red-700 font-black text-2xl flex items-center justify-center mx-auto">
        !
      </div>
      <h1 class="text-xl font-black text-slate-900">${escapeHtml(title)}</h1>
      <p class="text-sm font-medium text-slate-600">${escapeHtml(description)}</p>
    </div>
  `;
}

