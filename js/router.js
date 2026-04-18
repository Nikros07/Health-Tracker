const _routes = new Map();
let _currentView = null;

export function registerRoute(hash, renderFn) {
  _routes.set(hash, renderFn);
}

export function navigate(hash) {
  window.location.hash = hash;
}

export function getCurrentView() {
  return _currentView;
}

function getHash() {
  return window.location.hash.replace('#', '') || 'dashboard';
}

function updateNav(view) {
  document.querySelectorAll('[data-view]').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });
}

function showView(view) {
  document.querySelectorAll('.view').forEach(el => {
    const id = el.id.replace('view-', '');
    el.classList.toggle('hidden', id !== view);
  });
}

async function handleRoute() {
  const view = getHash();
  _currentView = view;

  showView(view);
  updateNav(view);

  const renderFn = _routes.get(view);
  if (renderFn) {
    const container = document.getElementById(`view-${view}`);
    if (container) await renderFn(container);
  }
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
