import { getCategories, updateCategory, deleteCategory, exportData, importData, getSettings, updateSettings } from '../store.js';
import { hasToken, setToken, clearToken, validateToken } from '../github-storage.js';
import { showToast } from '../utils.js';

export async function renderSettings(container) {
  container.innerHTML = `<h1 class="page-title">Einstellungen</h1>`;

  // GitHub Sync section
  container.appendChild(buildGitHubSection());
  container.appendChild(buildDivider());

  // Categories section
  container.appendChild(buildCategoriesSection());
  container.appendChild(buildDivider());

  // Data section
  container.appendChild(buildDataSection());
}

function buildGitHubSection() {
  const section = document.createElement('div');
  section.className = 'settings-section';
  section.innerHTML = `<div class="settings-section-title">GitHub Sync</div>`;

  const connected = hasToken();
  const card = document.createElement('div');
  card.className = 'card';
  card.id = 'githubCard';

  if (connected) {
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <span style="font-size:24px;">✅</span>
        <div>
          <div style="font-weight:600;">GitHub verbunden</div>
          <div style="font-size:13px;color:var(--text-secondary);">Deine Daten werden automatisch mit dem Repo synchronisiert.</div>
        </div>
      </div>
      <button class="btn btn-danger btn-sm" id="disconnectBtn">GitHub trennen</button>
    `;
    card.querySelector('#disconnectBtn').addEventListener('click', () => {
      clearToken();
      showToast('GitHub-Verbindung getrennt', 'info');
      renderSettings(container);
    });
  } else {
    card.innerHTML = `
      <div style="margin-bottom:16px;">
        <div style="font-weight:600;margin-bottom:8px;">GitHub Personal Access Token</div>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">
          Gehe zu GitHub → Settings → Developer settings → Personal access tokens → Generate new token.<br>
          Wähle Scope: <strong>repo</strong> (Full control of private repositories).
        </div>
        <input type="password" class="form-input" id="tokenInput" placeholder="ghp_xxxxxxxxxxxx" style="margin-bottom:12px;" />
        <button class="btn btn-primary" id="connectBtn">Verbinden</button>
      </div>
    `;
    card.querySelector('#connectBtn').addEventListener('click', async () => {
      const token = card.querySelector('#tokenInput').value.trim();
      if (!token) { showToast('Bitte Token eingeben', 'error'); return; }
      setToken(token);
      const valid = await validateToken();
      if (valid) {
        showToast('GitHub erfolgreich verbunden!', 'success');
        renderSettings(container);
      } else {
        clearToken();
        showToast('Ungültiger Token', 'error');
      }
    });
  }

  section.appendChild(card);
  return section;
}

function buildCategoriesSection() {
  const section = document.createElement('div');
  section.className = 'settings-section';
  section.innerHTML = `<div class="settings-section-title">Kategorien</div>`;

  const categories = getCategories();

  categories.forEach(cat => {
    const row = document.createElement('div');
    row.className = 'settings-row';
    row.style.marginBottom = '8px';
    row.innerHTML = `
      <div>
        <div class="settings-row-label" style="display:flex;align-items:center;gap:8px;"><span class="cat-dot" style="background:${cat.color};"></span>${cat.name}</div>
        <div class="settings-row-desc">Limit: ${cat.dailyLimit || '—'} ${cat.unit}/Tag · ${cat.subcategories?.length || 0} Subkategorien</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button class="btn btn-ghost btn-sm edit-cat-btn" data-id="${cat.id}">Bearbeiten</button>
        <button class="btn btn-danger btn-sm del-cat-btn" data-id="${cat.id}">Löschen</button>
      </div>
    `;
    section.appendChild(row);
  });

  section.querySelectorAll('.edit-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditCategory(btn.dataset.id, section));
  });

  section.querySelectorAll('.del-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Kategorie löschen? Alle Einträge bleiben erhalten.')) {
        deleteCategory(btn.dataset.id);
        showToast('Kategorie gelöscht', 'info');
        renderSettings(document.getElementById('view-settings'));
      }
    });
  });

  return section;
}

function openEditCategory(catId, container) {
  const cat = getCategories().find(c => c.id === catId);
  if (!cat) return;

  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  document.getElementById('addModal').querySelector('.modal-title').textContent = `${cat.name} bearbeiten`;
  overlay.classList.remove('hidden');
  body.innerHTML = '';

  const form = document.createElement('div');
  form.innerHTML = `
    <div class="form-group">
      <label class="form-label">Name</label>
      <input type="text" class="form-input" id="editName" value="${cat.name}" />
    </div>
    <div class="form-group">
      <label class="form-label">Tages-Limit</label>
      <input type="number" class="form-input" id="editLimit" value="${cat.dailyLimit || ''}" placeholder="z.B. 14" />
    </div>
    <div class="form-group">
      <label class="form-label">Farbe</label>
      <input type="color" class="form-input" id="editColor" value="${cat.color}" style="height:44px;cursor:pointer;" />
    </div>
  `;

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary btn-full';
  saveBtn.textContent = 'Speichern';
  saveBtn.addEventListener('click', () => {
    updateCategory(catId, {
      name: form.querySelector('#editName').value.trim() || cat.name,
      dailyLimit: parseFloat(form.querySelector('#editLimit').value) || null,
      color: form.querySelector('#editColor').value,
    });
    window.closeModal();
    showToast('Gespeichert', 'success');
    renderSettings(document.getElementById('view-settings'));
  });

  form.appendChild(saveBtn);
  body.appendChild(form);
}

function buildDataSection() {
  const section = document.createElement('div');
  section.className = 'settings-section';
  section.innerHTML = `<div class="settings-section-title">Daten</div>`;

  const exportRow = document.createElement('div');
  exportRow.className = 'settings-row';
  exportRow.innerHTML = `
    <div>
      <div class="settings-row-label">Daten exportieren</div>
      <div class="settings-row-desc">Alle Einträge als JSON-Datei herunterladen</div>
    </div>
    <button class="btn btn-ghost btn-sm" id="exportBtn">Export</button>
  `;
  exportRow.querySelector('#exportBtn').addEventListener('click', () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export erfolgreich', 'success');
  });

  const importRow = document.createElement('div');
  importRow.className = 'settings-row';
  importRow.style.marginTop = '8px';
  importRow.innerHTML = `
    <div>
      <div class="settings-row-label">Daten importieren</div>
      <div class="settings-row-desc">JSON-Backup wiederherstellen (überschreibt aktuelle Daten)</div>
    </div>
    <label class="btn btn-ghost btn-sm" style="cursor:pointer;">
      Import
      <input type="file" accept=".json" id="importFile" style="display:none;" />
    </label>
  `;
  importRow.querySelector('#importFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async evt => {
      try {
        await importData(evt.target.result);
        showToast('Import erfolgreich', 'success');
        renderSettings(document.getElementById('view-settings'));
      } catch (err) {
        showToast('Import fehlgeschlagen: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  });

  section.appendChild(exportRow);
  section.appendChild(importRow);

  // Version info
  const info = document.createElement('div');
  info.style.cssText = 'margin-top:24px;padding:16px;text-align:center;color:var(--text-muted);font-size:12px;';
  info.innerHTML = `⚡ Tracker v1.0 · Daten lokal + GitHub`;
  section.appendChild(info);

  return section;
}

function buildDivider() {
  const d = document.createElement('div');
  d.className = 'divider';
  return d;
}
