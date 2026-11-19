import {
  clearLocalEnvOverrides,
  getConfig,
  isSupabaseConfigured,
  saveLocalEnvOverrides,
} from './config.js';
import { openGlobalSearchModal } from './globalSearchModal.js';
import { listOrders, listTechnicians, subscribeToOrders } from './ordersService.js';
import { initPwa } from './pwa.js';
import { escapeHtml, showToast } from './utils.js';
import { renderActiveOrdersView } from './views/activeOrders.js';
import { renderDeliveredOrdersView } from './views/deliveredOrders.js';
import { renderNewOrderView } from './views/newOrder.js';
import { renderPendingBoardView } from './views/pendingBoard.js';
import { renderPublicOrderView } from './views/publicOrder.js';

const state = {
  currentView: 'nueva', // 'nueva' | 'pendientes' | 'activas' | 'entregados' | 'publica'
  publicOrderId: null,
  orders: [],
  technicians: [],
  selectedTechnicianFilter: 'all',
  isLoading: false,
  searchQuery: '',
  deliveredSearchQuery: '',
  activePage: 1,
  deliveredPage: 1,
  statusFilter: 'Activas',
  realtimeStatus: 'connecting',
};

let unsubscribeRealtime = null;

const appRoot = document.getElementById('app-root');
const headerEl = document.getElementById('workshop-header');
const navNuevaBtn = document.getElementById('nav-nueva');
const navPendientesBtn = document.getElementById('nav-pendientes');
const navActivasBtn = document.getElementById('nav-activas');
const navEntregadosBtn = document.getElementById('nav-entregados');
const activeCountBadge = document.getElementById('active-count-badge');
const deliveredCountBadge = document.getElementById('delivered-count-badge');
const connectionBadge = document.getElementById('connection-badge');
const demoBanner = document.getElementById('demo-banner');
const openConfigBtn = document.getElementById('open-config-btn');
const openGlobalSearchBtn = document.getElementById('open-global-search-btn');

function parseRoute() {
  const { pathname, search, hash } = window.location;
  const params = new URLSearchParams(search);

  // Soporta /orden?id=... o #/orden?id=...
  if (pathname === '/orden' || pathname.startsWith('/orden/')) {
    return { view: 'publica', publicOrderId: params.get('id') || params.get('n') };
  }

  if (hash.startsWith('#/orden')) {
    const hashQuery = hash.includes('?') ? hash.split('?')[1] : '';
    const hashParams = new URLSearchParams(hashQuery);
    return { view: 'publica', publicOrderId: hashParams.get('id') || hashParams.get('n') };
  }

  if (hash === '#/activas') {
    return { view: 'activas', publicOrderId: null };
  }

  if (hash === '#/pendientes') {
    return { view: 'pendientes', publicOrderId: null };
  }

  if (hash === '#/entregados') {
    return { view: 'entregados', publicOrderId: null };
  }

  return { view: 'nueva', publicOrderId: null };
}

function navigateTo(view) {
  const hashMap = {
    activas: '#/activas',
    pendientes: '#/pendientes',
    entregados: '#/entregados',
    nueva: '#/nueva',
  };
  const targetHash = hashMap[view] || '#/nueva';
  if (window.location.pathname !== '/') {
    window.history.pushState({}, '', `/${targetHash}`);
  } else {
    window.location.hash = targetHash;
  }
  handleRouteChange();
}

function updateHeaderUI() {
  const isPublic = state.currentView === 'publica';
  headerEl.classList.toggle('hidden', isPublic);
  if (isPublic) return;

  const baseTabClass =
    'touch-btn flex-1 sm:flex-none flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 min-h-[46px] sm:min-h-[42px] px-1.5 sm:px-3.5 py-1 sm:py-2 rounded-lg font-bold text-[11px] sm:text-sm transition-all duration-150';
  const inactiveTabClass = `${baseTabClass} text-slate-300 hover:text-white hover:bg-slate-700/60`;

  navNuevaBtn.className =
    state.currentView === 'nueva'
      ? `${baseTabClass} bg-emerald-600 text-white shadow-sm`
      : inactiveTabClass;

  navPendientesBtn.className =
    state.currentView === 'pendientes'
      ? `${baseTabClass} bg-indigo-600 text-white shadow-sm`
      : inactiveTabClass;

  navActivasBtn.className =
    state.currentView === 'activas'
      ? `${baseTabClass} bg-blue-600 text-white shadow-sm`
      : inactiveTabClass;

  navEntregadosBtn.className =
    state.currentView === 'entregados'
      ? `${baseTabClass} bg-slate-600 text-white shadow-sm`
      : inactiveTabClass;

  const activeCount = state.orders.filter((o) => o.estado !== 'Entregado').length;
  const deliveredCount = state.orders.length - activeCount;
  activeCountBadge.textContent = String(activeCount);
  if (deliveredCountBadge) {
    deliveredCountBadge.textContent = String(deliveredCount);
  }

  demoBanner.classList.toggle('hidden', isSupabaseConfigured());

  const badgeMap = {
    connected: { dot: 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.85)]', text: 'Realtime activo' },
    connecting: { dot: 'bg-amber-400 animate-pulse', text: 'Conectando...' },
    demo: { dot: 'bg-amber-400 animate-pulse', text: 'Modo Demo' },
    error: { dot: 'bg-red-500', text: 'Sin conexión' },
  };
  const info = badgeMap[state.realtimeStatus] || badgeMap.connecting;
  connectionBadge.innerHTML = `<span class="w-2 h-2 rounded-full ${info.dot}"></span>${info.text}`;
}

function renderCurrentView() {
  updateHeaderUI();

  appRoot.className =
    state.currentView === 'pendientes'
      ? 'w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-4 pb-28 sm:pb-8'
      : 'w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-28 sm:pb-16';

  if (state.currentView === 'publica') {
    renderPublicOrderView(appRoot, state.publicOrderId);
    return;
  }

  if (state.currentView === 'pendientes') {
    renderPendingBoardView(appRoot, state, {
      onRefreshOrders: loadOrders,
    });
    return;
  }

  if (state.currentView === 'activas') {
    renderActiveOrdersView(appRoot, state, {
      onRefreshOrders: loadOrders,
    });
    return;
  }

  if (state.currentView === 'entregados') {
    renderDeliveredOrdersView(appRoot, state, {
      onRefreshOrders: loadOrders,
    });
    return;
  }

  renderNewOrderView(appRoot, {
    technicians: state.technicians,
    onOrderCreated: () => {
      loadOrders();
    },
    onGoToActive: () => {
      navigateTo('activas');
    },
  });
}

async function loadOrders() {
  const prevTechCount = state.technicians.length;
  state.isLoading = true;
  if (
    state.currentView === 'activas' ||
    state.currentView === 'pendientes' ||
    state.currentView === 'entregados'
  ) {
    renderCurrentView();
  }
  try {
    const [orders, technicians] = await Promise.all([listOrders(), listTechnicians()]);
    state.orders = orders;
    state.technicians = technicians;
  } catch (err) {
    console.error('Error cargando órdenes:', err);
    showToast(`No se pudieron cargar las órdenes: ${err.message}`, 'error');
  } finally {
    state.isLoading = false;
    updateHeaderUI();
    if (
      state.currentView === 'activas' ||
      state.currentView === 'pendientes' ||
      state.currentView === 'entregados' ||
      (state.currentView === 'nueva' && prevTechCount !== state.technicians.length)
    ) {
      renderCurrentView();
    }
  }
}

function initRealtime() {
  if (unsubscribeRealtime) {
    unsubscribeRealtime();
    unsubscribeRealtime = null;
  }

  unsubscribeRealtime = subscribeToOrders({
    onDataChange: () => {
      if (state.currentView === 'publica') {
        renderPublicOrderView(appRoot, state.publicOrderId);
      } else {
        loadOrders();
      }
    },
    onStatusChange: (status) => {
      state.realtimeStatus = status;
      updateHeaderUI();
    },
  });
}

function handleRouteChange() {
  const { view, publicOrderId } = parseRoute();
  state.currentView = view;
  state.publicOrderId = publicOrderId;
  renderCurrentView();
}

function openSupabaseConfigModal() {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;
  const cfg = getConfig();

  modalRoot.className = 'fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-3 sm:p-4';
  modalRoot.innerHTML = `
    <div class="bg-white rounded-2xl border-4 border-slate-900 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-xl font-black text-slate-900">Configurar Supabase</h3>
        <button id="close-cfg-modal" type="button" class="touch-btn min-w-[44px] px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 font-black" aria-label="Cerrar">✕</button>
      </div>
      <p class="text-sm text-slate-600 font-medium">
        En producción (Netlify) se recomienda usar variables de entorno (<code>SUPABASE_URL</code> y <code>SUPABASE_ANON_KEY</code>). Para pruebas rápidas en este navegador puedes guardarlas aquí:
      </p>
      <form id="cfg-form" class="space-y-3">
        <div>
          <label class="block text-xs font-black uppercase text-slate-700 mb-1">SUPABASE_URL</label>
          <input id="cfg-url" type="url" required placeholder="https://xxxx.supabase.co" value="${escapeHtml(cfg.SUPABASE_URL)}" class="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border-2 border-slate-400 font-semibold text-base" />
        </div>
        <div>
          <label class="block text-xs font-black uppercase text-slate-700 mb-1">SUPABASE_ANON_KEY</label>
          <input id="cfg-key" type="text" required placeholder="eyJhbGciOi..." value="${escapeHtml(cfg.SUPABASE_ANON_KEY)}" class="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border-2 border-slate-400 font-semibold text-base" />
        </div>
        <div>
          <label class="block text-xs font-black uppercase text-slate-700 mb-1">WhatsApp del Taller (opcional)</label>
          <input id="cfg-wa" type="tel" placeholder="573001234567" value="${escapeHtml(cfg.TELERADIO_WHATSAPP)}" class="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border-2 border-slate-400 font-semibold text-base" />
        </div>
        <div class="flex flex-wrap gap-2 pt-2">
          <button id="cancel-cfg-btn" type="button" class="touch-btn px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm">Cancelar</button>
          <button id="clear-cfg-btn" type="button" class="touch-btn px-4 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm">Limpiar</button>
          <button type="submit" class="touch-btn flex-1 min-w-[160px] py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-black">Guardar y Conectar</button>
        </div>
      </form>
    </div>
  `;

  const closeModal = () => {
    modalRoot.removeEventListener('click', onBackdropClick);
    modalRoot.className = 'fixed inset-0 z-50 hidden';
    modalRoot.innerHTML = '';
  };

  const onBackdropClick = (e) => {
    if (e.target === modalRoot) closeModal();
  };

  modalRoot.querySelector('#close-cfg-modal').addEventListener('click', closeModal);
  modalRoot.querySelector('#cancel-cfg-btn').addEventListener('click', closeModal);
  modalRoot.addEventListener('click', onBackdropClick);
  modalRoot.querySelector('#clear-cfg-btn').addEventListener('click', () => {
    clearLocalEnvOverrides();
    closeModal();
    initRealtime();
    loadOrders();
    showToast('Configuración local eliminada');
  });

  modalRoot.querySelector('#cfg-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveLocalEnvOverrides({
      SUPABASE_URL: modalRoot.querySelector('#cfg-url').value.trim(),
      SUPABASE_ANON_KEY: modalRoot.querySelector('#cfg-key').value.trim(),
      TELERADIO_WHATSAPP: modalRoot.querySelector('#cfg-wa').value.trim(),
    });
    closeModal();
    initRealtime();
    loadOrders();
    showToast('Credenciales guardadas');
  });
}

// Listeners globales
navNuevaBtn?.addEventListener('click', () => navigateTo('nueva'));
navPendientesBtn?.addEventListener('click', () => navigateTo('pendientes'));
navActivasBtn?.addEventListener('click', () => navigateTo('activas'));
navEntregadosBtn?.addEventListener('click', () => navigateTo('entregados'));
openConfigBtn?.addEventListener('click', openSupabaseConfigModal);
openGlobalSearchBtn?.addEventListener('click', () => {
  openGlobalSearchModal(state, { onNavigate: navigateTo });
});
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && state.currentView !== 'publica') {
    e.preventDefault();
    openGlobalSearchModal(state, { onNavigate: navigateTo });
  }
});
window.addEventListener('hashchange', handleRouteChange);
window.addEventListener('popstate', handleRouteChange);

// Arranque
initPwa({
  onInstalled: () => showToast('App instalada en tu dispositivo'),
});
handleRouteChange();
initRealtime();
if (state.currentView !== 'publica') {
  loadOrders();
}

