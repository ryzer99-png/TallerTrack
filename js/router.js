/**
 * Enrutamiento ligero por hash y parámetros de consulta para escaneo de QR.
 */

export function parseRoute() {
  const { pathname, search, hash } = window.location;
  const params = new URLSearchParams(search);
  const queryOrderId = params.get('id') || params.get('n');

  if (hash.startsWith('#/orden')) {
    const hashQuery = hash.includes('?') ? hash.split('?')[1] : '';
    const hashParams = new URLSearchParams(hashQuery);
    return {
      view: 'publica',
      publicOrderId: hashParams.get('id') || hashParams.get('n'),
      scanOrderId: null,
    };
  }

  if (pathname === '/orden' || pathname.startsWith('/orden/') || queryOrderId) {
    return { view: 'activas', publicOrderId: null, scanOrderId: queryOrderId };
  }

  if (hash === '#/activas') return { view: 'activas', publicOrderId: null, scanOrderId: null };
  if (hash === '#/pendientes') return { view: 'pendientes', publicOrderId: null, scanOrderId: null };
  if (hash === '#/entregados') return { view: 'entregados', publicOrderId: null, scanOrderId: null };

  return { view: 'nueva', publicOrderId: null, scanOrderId: null };
}

export function navigateTo(view, onRouteChange) {
  const hashMap = {
    activas: '#/activas',
    pendientes: '#/pendientes',
    entregados: '#/entregados',
    nueva: '#/nueva',
  };
  const targetHash = hashMap[view] || '#/nueva';
  if (window.location.pathname !== '/' || window.location.search) {
    window.history.pushState({}, '', `/${targetHash}`);
  } else {
    window.location.hash = targetHash;
  }
  onRouteChange?.();
}
