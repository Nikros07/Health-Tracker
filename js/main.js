import { initStore } from './store.js';
import { initRouter, registerRoute } from './router.js';
import { renderDashboard } from './views/dashboard.js';
import { renderHistory } from './views/history.js';
import { renderSettings } from './views/settings.js';
import { openLogModal } from './views/log.js';
import { showLoading, hideLoading } from './utils.js';

async function init() {
  showLoading();
  try {
    await initStore();
  } catch (e) {
    console.error('Store init failed:', e);
  } finally {
    hideLoading();
  }

  registerRoute('dashboard', renderDashboard);
  registerRoute('history', renderHistory);
  registerRoute('settings', renderSettings);

  initRouter();

  // FAB buttons
  document.getElementById('fabBtn')?.addEventListener('click', openLogModal);
  document.getElementById('fabBtnDesktop')?.addEventListener('click', openLogModal);

  // Modal close
  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('modalOverlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  document.getElementById('modalBody').innerHTML = '';
}

window.closeModal = closeModal;

init();
