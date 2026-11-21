export const ORDER_STATES = [
  'Recibido',
  'En Revisión',
  'Por Aprobar',
  'Reparado',
  'Sin Reparación',
  'Sin Falla',
  'Entregado',
];

export const STATUS_META = {
  'Recibido': {
    label: 'Recibido',
    shortLabel: 'Recibido',
    badgeClass: 'bg-slate-200 text-slate-900 border-slate-400',
    stepIndex: 0,
    description: 'Tu equipo ingresó al taller y está en cola para revisión técnica.',
  },
  'En Revisión': {
    label: 'En Revisión',
    shortLabel: 'En Revisión',
    badgeClass: 'bg-blue-100 text-blue-950 border-blue-500',
    stepIndex: 1,
    description: 'Nuestro técnico está revisando el equipo para encontrar la falla y verificar su solución.',
  },
  'Por Aprobar': {
    label: 'Por Aprobar',
    shortLabel: 'Cotización',
    badgeClass: 'bg-amber-100 text-amber-950 border-amber-500',
    stepIndex: 2,
    description: 'Ya tenemos el diagnóstico y presupuesto. Esperamos tu aprobación para reparar.',
  },
  'Reparado': {
    label: 'Reparado',
    shortLabel: 'Listo / Reparado',
    badgeClass: 'bg-emerald-100 text-emerald-950 border-emerald-600',
    stepIndex: 3,
    description: '¡Tu equipo ya está reparado y listo para recoger en Teleradio!',
  },
  'Sin Reparación': {
    label: 'Sin Reparación',
    shortLabel: 'Sin Reparación',
    badgeClass: 'bg-rose-100 text-rose-950 border-rose-500',
    stepIndex: 3,
    description: 'Revisamos tu equipo pero lamentablemente no fue posible repararlo. Ya puedes pasar a recogerlo.',
  },
  'Sin Falla': {
    label: 'Sin Falla',
    shortLabel: 'Estaba Bueno',
    badgeClass: 'bg-teal-100 text-teal-950 border-teal-500',
    stepIndex: 3,
    description: 'Probamos tu equipo en taller y funcionó correctamente sin presentar falla. Ya está listo para recoger.',
  },
  'Entregado': {
    label: 'Entregado',
    shortLabel: 'Entregado',
    badgeClass: 'bg-zinc-200 text-zinc-800 border-zinc-400',
    stepIndex: 4,
    description: 'Equipo entregado al cliente. ¡Gracias por confiar en Teleradio!',
  },
};

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatDateTime(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatCurrency(amount) {
  const numeric = Number(amount || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(numeric);
}

export function getPublicOrderUrl(order) {
  const idOrNum = order?.id || order?.numero_orden;
  return `${window.location.origin}/orden?id=${encodeURIComponent(idOrNum)}`;
}

export function getAgeMeta(isoString) {
  if (!isoString) {
    return { days: 0, label: 'Hoy', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200', dotClass: 'bg-emerald-500' };
  }
  const ms = Date.now() - new Date(isoString).getTime();
  const days = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  if (days >= 5) {
    return {
      days,
      label: `${days} días`,
      badgeClass: 'bg-red-50 text-red-800 border-red-200',
      dotClass: 'bg-red-600',
    };
  }
  if (days >= 2) {
    return {
      days,
      label: `${days} días`,
      badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
      dotClass: 'bg-amber-500',
    };
  }
  return {
    days,
    label: days === 1 ? '1 día' : 'Hoy',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotClass: 'bg-emerald-500',
  };
}

export function paginateItems(items, currentPage = 1, pageSize = 10) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(Math.max(1, Number(currentPage) || 1), totalPages);
  const start = (page - 1) * pageSize;
  return {
    pageItems: items.slice(start, start + pageSize),
    page,
    totalPages,
    totalItems,
  };
}

export function renderPaginationBar({ page, totalPages, totalItems, itemLabel = 'equipos' }) {
  if (!totalItems) return '';

  const pageNumbers = [];
  if (totalPages > 1) {
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    const adjustedStart = Math.max(1, end - 4);
    for (let i = adjustedStart; i <= end; i += 1) {
      pageNumbers.push(i);
    }
  }

  return `
    <nav aria-label="Paginación" class="bg-white rounded-2xl border border-slate-200/90 shadow-sm px-3 py-2.5 sm:px-4 flex items-center justify-between gap-2">
      <button
        type="button"
        data-page-action="prev"
        ${page <= 1 ? 'disabled' : ''}
        class="touch-btn px-3.5 sm:px-4 py-2 rounded-xl border font-extrabold text-sm transition-colors ${
          page <= 1
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300'
        }"
      >
        ← Ant
      </button>

      <div class="flex flex-col items-center justify-center text-center min-w-0">
        ${
          totalPages > 1
            ? `<div class="hidden md:flex items-center gap-1 mb-1">
                ${pageNumbers
                  .map(
                    (num) => `
                  <button
                    type="button"
                    data-page-num="${num}"
                    class="min-w-[34px] h-[34px] px-2 rounded-lg font-mono font-extrabold text-xs border transition-colors ${
                      num === page
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }"
                  >
                    ${num}
                  </button>
                `
                  )
                  .join('')}
              </div>`
            : ''
        }
        <span class="text-sm font-black text-slate-900 md:hidden">Pág. ${page} de ${totalPages}</span>
        <span class="text-[11px] font-bold text-slate-500 truncate">
          <span class="hidden md:inline">Pág. ${page} de ${totalPages} · </span>(${totalItems} ${escapeHtml(itemLabel)})
        </span>
      </div>

      <button
        type="button"
        data-page-action="next"
        ${page >= totalPages ? 'disabled' : ''}
        class="touch-btn px-3.5 sm:px-4 py-2 rounded-xl border font-extrabold text-sm transition-colors ${
          page >= totalPages
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
        }"
      >
        Sig →
      </button>
    </nav>
  `;
}

export function showToast(message, variant = 'success') {
  const root = document.getElementById('toast-root');
  if (!root) return;

  const colors = {
    success: 'bg-emerald-700 text-white border-emerald-900',
    error: 'bg-red-700 text-white border-red-900',
    info: 'bg-slate-900 text-white border-slate-700',
  };

  const el = document.createElement('div');
  el.className = `pointer-events-auto px-4 py-3 rounded-xl border-2 shadow-lg font-bold text-sm sm:text-base text-center transition-opacity duration-200 ${colors[variant] || colors.info}`;
  el.textContent = message;
  root.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 220);
  }, 2600);
}

