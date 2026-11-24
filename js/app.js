import {
  bindAuthLockForm,
  cerrarAccesoDispositivo,
  comprobarAutorizacion,
  hideAuthLockScreen,
  showAuthLockScreen,
} from './auth/index.js';
import { isSupabaseConfigured } from './config.js';
import { openSupabaseConfigModal } from './configModal.js';
import { openGlobalSearchModal } from './globalSearchModal.js';
import { initPwa } from './pwa.js';
import { navigateTo, parseRoute } from './router.js';
import { listOrders } from './services/ordenesService.js';
import { subscribeToOrders } from './services/realtime.js';
import { listTechnicians } from './services/tecnicosService.js';
import { showToast } from './utils.js';
import { renderActiveOrdersView } from './views/activeOrders.js';
import { renderDeliveredOrdersView } from './views/deliveredOrders.js';
import { renderNewOrderView } from './views/newOrder.js';
import { renderPendingBoardView } from './views/pendingBoard.js';
import { renderPublicOrderView } from './views/publicOrder.js';

const state = {
  currentView: 'nueva',
  publicOrderId: null,
  scanOrderId: null,
  isAuthorized: false,
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
const NAV_IDS = [
  ['nueva', document.getElementById('nav-nueva'), 'bg-emerald-600'],
  ['pendientes', document.getElementById('nav-pendientes'), 'bg-indigo-600'],
  ['activas', document.getElementById('nav-activas'), 'bg-blue-600'],
  ['entregados', document.getElementById('nav-entregados'), 'bg-slate-600'],
];
const activeCountBadge = document.getElementById('active-count-badge');
const deliveredCountBadge = document.getElementById('delivered-count-badge');
const connectionBadge = document.getElementById('connection-badge');
const demoBanner = document.getElementById('demo-banner');
const openConfigBtn = document.getElementById('open-config-btn');
const openGlobalSearchBtn = document.getElementById('open-global-search-btn');
const logoutDeviceBtn = document.getElementById('logout-device-btn');

const goTo = (view) => navigateTo(view, handleRouteChange);

function updateHeaderUI() {
  const isPublic = state.currentView === 'publica';
  headerEl.classList.toggle('hidden', isPublic);
  if (isPublic) return;

  const baseTab = 'touch-btn flex-1 sm:flex-none flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 min-h-[46px] sm:min-h-[40px] px-1.5 sm:px-3 xl:px-3.5 py-1 sm:py-2 rounded-lg font-bold text-[11px] sm:text-sm whitespace-nowrap min-w-0 transition-all duration-150';
  for (const [view, btn, activeBg] of NAV_IDS) {
    btn.className = state.currentView === view ? `${baseTab} ${activeBg} text-white shadow-sm` : `${baseTab} text-slate-300 hover:text-white hover:bg-slate-700/60`;
  }

  const activeCount = state.orders.filter((o) => o.estado !== 'Entregado').length;
  activeCountBadge.textContent = String(activeCount);
  if (deliveredCountBadge) deliveredCountBadge.textContent = String(state.orders.length - activeCount);

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

  if (state.currentView === 'publica') return renderPublicOrderView(appRoot, state.publicOrderId);
  if (state.currentView === 'pendientes') return renderPendingBoardView(appRoot, state, { onRefreshOrders: loadOrders });
  if (state.currentView === 'activas') return renderActiveOrdersView(appRoot, state, { onRefreshOrders: loadOrders });
  if (state.currentView === 'entregados') return renderDeliveredOrdersView(appRoot, state, { onRefreshOrders: loadOrders });

  renderNewOrderView(appRoot, {
    technicians: state.technicians,
    getOrders: () => state.orders,
    onOrderCreated: () => loadOrders(),
    onGoToActive: () => goTo('activas'),
  });
}

async function loadOrders() {
  const prevTechCount = state.technicians.length;
  state.isLoading = true;
  if (['activas', 'pendientes', 'entregados'].includes(state.currentView)) renderCurrentView();

  try {
    const [orders, technicians] = await Promise.all([listOrders(), listTechnicians()]);
    state.orders = orders;
    state.technicians = technicians;
    applyPendingScanFilter();
  } catch (err) {
    showToast(`No se pudieron cargar las órdenes: ${err.message}`, 'error');
  } finally {
    state.isLoading = false;
    updateHeaderUI();
    if (
      ['activas', 'pendientes', 'entregados'].includes(state.currentView) ||
      (state.currentView === 'nueva' && prevTechCount !== state.technicians.length)
    ) {
      renderCurrentView();
    }
  }
}

function initRealtime() {
  unsubscribeRealtime?.();
  unsubscribeRealtime = subscribeToOrders({
    onDataChange: () => {
      if (state.currentView === 'publica') renderPublicOrderView(appRoot, state.publicOrderId);
      else loadOrders();
    },
    onStatusChange: (status) => {
      state.realtimeStatus = status;
      updateHeaderUI();
    },
  });
}

function applyPendingScanFilter() {
  if (!state.scanOrderId || state.orders.length === 0) return;

  const target = String(state.scanOrderId);
  const matched = state.orders.find((o) => String(o.id) === target || String(o.numero_orden) === target);
  state.scanOrderId = null;

  if (!matched) {
    showToast('No se encontró la orden escaneada', 'error');
    return;
  }

  if (matched.estado === 'Entregado') {
    state.currentView = 'entregados';
    state.deliveredSearchQuery = String(matched.numero_orden);
    window.history.replaceState({}, '', '/#/entregados');
  } else {
    state.currentView = 'activas';
    state.statusFilter = 'Activas';
    state.activePage = 1;
    state.searchQuery = String(matched.numero_orden);
    window.history.replaceState({}, '', '/#/activas');
  }
}

function handleRouteChange() {
  const { view, publicOrderId, scanOrderId } = parseRoute();
  state.currentView = view;
  state.publicOrderId = publicOrderId;
  state.scanOrderId = scanOrderId || null;

  if (view === 'publica') {
    hideAuthLockScreen({ showWorkshop: false });
    renderCurrentView();
    return;
  }

  if (!state.isAuthorized) {
    showAuthLockScreen();
    return;
  }

  if (state.scanOrderId) applyPendingScanFilter();
  renderCurrentView();
}

for (const [view, btn] of NAV_IDS) btn?.addEventListener('click', () => goTo(view));
openConfigBtn?.addEventListener('click', () =>
  openSupabaseConfigModal({
    onSaved: () => {
      initRealtime();
      loadOrders();
    },
  })
);
openGlobalSearchBtn?.addEventListener('click', () => {
  if (state.isAuthorized) openGlobalSearchModal(state, { onNavigate: goTo });
});
logoutDeviceBtn?.addEventListener('click', () => {
  if (!window.confirm('¿Desvincular este dispositivo? Tendrás que ingresar nuevamente el código del taller para acceder.')) {
    return;
  }
  cerrarAccesoDispositivo({
    onLocked: () => {
      unsubscribeRealtime?.();
      unsubscribeRealtime = null;
      state.isAuthorized = false;
      state.orders = [];
      state.technicians = [];
      state.realtimeStatus = 'connecting';
      if (appRoot) appRoot.innerHTML = '';
      showToast('Dispositivo desvinculado');
    },
  });
});
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && state.isAuthorized && state.currentView !== 'publica') {
    e.preventDefault();
    openGlobalSearchModal(state, { onNavigate: goTo });
  }
});
window.addEventListener('hashchange', handleRouteChange);
window.addEventListener('popstate', handleRouteChange);

async function unlockWorkshop({ linkedByUrl = false, linkedManually = false } = {}) {
  state.isAuthorized = true;
  hideAuthLockScreen({ showWorkshop: true });
  handleRouteChange();
  initRealtime();
  loadOrders();
  if (linkedByUrl || linkedManually) showToast('Dispositivo vinculado correctamente');
}

async function bootstrapApp() {
  initPwa({ onInstalled: () => showToast('App instalada en tu dispositivo') });
  bindAuthLockForm({ onAuthorized: unlockWorkshop });

  if (parseRoute().view === 'publica') {
    handleRouteChange();
    return;
  }
  await comprobarAutorizacion({ onAuthorized: unlockWorkshop });
}

bootstrapApp();
