export const ORDER_STATES = [
  'Recibido',
  'En Revisión',
  'Por Aprobar',
  'Reparado',
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

