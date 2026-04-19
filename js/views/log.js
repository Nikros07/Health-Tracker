import { getCategories, addEntry, updateEntry } from '../store.js';
import { showToast } from '../utils.js';
import { renderDashboard } from './dashboard.js';

let _selectedCat = null;
let _selectedSub = null;
let _quantity = 1;
let _editEntryId = null;

export function openLogModal() {
  const categories = getCategories();
  if (!categories.length) {
    showToast('Keine Kategorien vorhanden.', 'error');
    return;
  }
  _editEntryId = null;
  _selectedCat = categories[0];
  _selectedSub = _selectedCat.subcategories[0] || null;
  _quantity = 1;
  _openModal('Eintrag hinzufügen', categories);
}

export function openEditModal(entry) {
  const categories = getCategories();
  _editEntryId = entry.id;
  _selectedCat = categories.find(c => c.id === entry.categoryId) || categories[0];
  _selectedSub = _selectedCat.subcategories.find(s => s.id === entry.subcategoryId) || _selectedCat.subcategories[0] || null;
  _quantity = entry.amount || 1;
  _openModal('Eintrag bearbeiten', categories, entry);
}

function _openModal(title, categories, prefill = null) {
  document.getElementById('addModal').querySelector('.modal-title').textContent = title;
  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  overlay.classList.remove('hidden');
  body.innerHTML = '';
  body.appendChild(buildForm(categories, prefill));
}

function buildForm(categories, prefill = null) {
  const frag = document.createDocumentFragment();

  // Category picker
  const catSection = createSection('Kategorie');
  const catChips = document.createElement('div');
  catChips.className = 'chip-row';
  catChips.id = 'catChips';

  categories.forEach(cat => {
    const chip = document.createElement('button');
    chip.className = `chip${cat.id === _selectedCat.id ? ' active' : ''}`;
    chip.style.setProperty('--chip-color', cat.color);
    chip.style.setProperty('--chip-bg', hexToRgba(cat.color, 0.15));
    chip.innerHTML = `${cat.icon} ${cat.name}`;
    chip.addEventListener('click', () => selectCategory(cat));
    catChips.appendChild(chip);
  });

  catSection.appendChild(catChips);
  frag.appendChild(catSection);

  // Subcategory section
  const subSection = createSection('Was?');
  subSection.id = 'subSection';
  subSection.appendChild(buildSubcatGrid());
  frag.appendChild(subSection);

  // Unit info
  const unitSection = document.createElement('div');
  unitSection.id = 'unitInfo';
  unitSection.appendChild(buildUnitInfo());
  frag.appendChild(unitSection);

  // Quantity
  const qtySection = createSection(getQtyLabel());
  qtySection.id = 'qtySection';
  qtySection.appendChild(buildQuantityInput());
  frag.appendChild(qtySection);

  // Date/time
  const dtSection = createSection('Zeitpunkt');
  const dtInput = document.createElement('input');
  dtInput.type = 'datetime-local';
  dtInput.className = 'form-input';
  dtInput.id = 'entryDateTime';
  const ts = prefill?.timestamp ? new Date(prefill.timestamp) : new Date();
  ts.setMinutes(ts.getMinutes() - ts.getTimezoneOffset());
  dtInput.value = ts.toISOString().slice(0, 16);
  dtSection.appendChild(dtInput);
  frag.appendChild(dtSection);

  // Notes
  const notesSection = createSection('Notiz (optional)');
  const notesInput = document.createElement('input');
  notesInput.type = 'text';
  notesInput.className = 'form-input';
  notesInput.id = 'entryNotes';
  notesInput.placeholder = 'z.B. Freitagabend mit Freunden';
  notesInput.value = prefill?.notes || '';
  notesSection.appendChild(notesInput);
  frag.appendChild(notesSection);

  // Submit
  const submitBtn = document.createElement('button');
  submitBtn.className = 'btn btn-primary btn-full';
  submitBtn.style.marginTop = '8px';
  submitBtn.textContent = _editEntryId ? 'Änderungen speichern' : 'Eintrag speichern';
  submitBtn.addEventListener('click', handleSubmit);
  frag.appendChild(submitBtn);

  return frag;
}

function getUnit() {
  return _selectedSub?.unit || _selectedCat?.unit || 'Stück';
}

function getQtyLabel() {
  const unit = getUnit();
  if (unit === 'Züge') return 'Anzahl Züge';
  if (unit === 'mg') return 'Milligramm';
  if (unit === 'Units') return 'Anzahl Drinks';
  return 'Anzahl';
}

function createSection(label) {
  const div = document.createElement('div');
  div.className = 'form-group';
  const lbl = document.createElement('label');
  lbl.className = 'form-label';
  lbl.textContent = label;
  div.appendChild(lbl);
  return div;
}

function buildSubcatGrid() {
  const grid = document.createElement('div');
  grid.className = 'subcat-grid';
  const subs = _selectedCat?.subcategories || [];
  subs.forEach(sub => {
    const subUnit = sub.unit || _selectedCat.unit;
    const item = document.createElement('button');
    item.className = `subcat-item${_selectedSub?.id === sub.id ? ' selected' : ''}`;
    item.innerHTML = `
      <span class="subcat-name">${sub.icon || ''} ${sub.name}</span>
      <span class="subcat-units">${sub.defaultUnits} ${subUnit}</span>
    `;
    item.addEventListener('click', () => selectSub(sub, item));
    grid.appendChild(item);
  });
  return grid;
}

function buildUnitInfo() {
  if (!_selectedSub) return document.createDocumentFragment();
  const unit = getUnit();
  const total = (_selectedSub.defaultUnits * _quantity).toFixed(unit === 'mg' ? 0 : 2);
  const frag = document.createDocumentFragment();

  const isAlcohol = _selectedCat?.id === 'cat-alcohol';
  const div = document.createElement('div');
  div.className = 'unit-info';
  div.innerHTML = `
    <div>
      <div>Gesamt</div>
      ${isAlcohol ? '<div style="font-size:11px;color:var(--text-muted);">1 Unit = 10ml purer Alkohol</div>' : ''}
    </div>
    <span class="unit-info-value">${total} ${unit}</span>
  `;
  frag.appendChild(div);
  return frag;
}

function buildQuantityInput() {
  const unit = getUnit();
  const row = document.createElement('div');
  row.className = 'amount-row';

  const step = unit === 'mg' ? 1 : 1;
  const minusBtn = document.createElement('button');
  minusBtn.className = 'amount-btn';
  minusBtn.textContent = '−';
  minusBtn.addEventListener('click', () => adjustQty(-step));

  const inputWrapper = document.createElement('div');
  inputWrapper.className = 'amount-input-wrapper';

  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'form-input';
  input.id = 'entryQty';
  input.min = '1';
  input.value = _quantity;
  input.addEventListener('change', e => {
    _quantity = Math.max(1, parseInt(e.target.value) || 1);
    input.value = _quantity;
    refreshUnitInfo();
  });

  const unitLabel = document.createElement('div');
  unitLabel.className = 'amount-unit';
  unitLabel.textContent = unit;

  inputWrapper.appendChild(input);
  inputWrapper.appendChild(unitLabel);

  const plusBtn = document.createElement('button');
  plusBtn.className = 'amount-btn';
  plusBtn.textContent = '+';
  plusBtn.addEventListener('click', () => adjustQty(step));

  row.appendChild(minusBtn);
  row.appendChild(inputWrapper);
  row.appendChild(plusBtn);
  return row;
}

function adjustQty(delta) {
  _quantity = Math.max(1, _quantity + delta);
  const input = document.getElementById('entryQty');
  if (input) input.value = _quantity;
  refreshUnitInfo();
}

function selectCategory(cat) {
  _selectedCat = cat;
  _selectedSub = cat.subcategories[0] || null;
  _quantity = 1;

  document.querySelectorAll('#catChips .chip').forEach((chip, i) => {
    const cats = getCategories();
    chip.classList.toggle('active', cats[i]?.id === cat.id);
  });

  const subSection = document.getElementById('subSection');
  if (subSection) {
    subSection.querySelector('.subcat-grid')?.remove();
    subSection.appendChild(buildSubcatGrid());
  }

  const qtySection = document.getElementById('qtySection');
  if (qtySection) {
    const lbl = qtySection.querySelector('.form-label');
    if (lbl) lbl.textContent = getQtyLabel();
  }

  refreshUnitInfo();
}

function selectSub(sub, element) {
  _selectedSub = sub;
  document.querySelectorAll('.subcat-item').forEach(el => el.classList.remove('selected'));
  element.classList.add('selected');

  const qtySection = document.getElementById('qtySection');
  if (qtySection) {
    const lbl = qtySection.querySelector('.form-label');
    if (lbl) lbl.textContent = getQtyLabel();
  }

  refreshUnitInfo();
}

function refreshUnitInfo() {
  const container = document.getElementById('unitInfo');
  if (!container) return;
  container.innerHTML = '';
  container.appendChild(buildUnitInfo());
  const input = document.getElementById('entryQty');
  if (input) input.value = _quantity;
}

async function handleSubmit() {
  if (!_selectedCat) return;

  const dtInput = document.getElementById('entryDateTime');
  const notesInput = document.getElementById('entryNotes');
  const unit = getUnit();

  const timestamp = dtInput?.value
    ? new Date(dtInput.value).toISOString()
    : new Date().toISOString();

  const totalUnits = _selectedSub
    ? parseFloat((_selectedSub.defaultUnits * _quantity).toFixed(4))
    : _quantity;

  const entryData = {
    categoryId: _selectedCat.id,
    subcategoryId: _selectedSub?.id || null,
    subcategoryName: _selectedSub?.name || _selectedCat.name,
    amount: _quantity,
    totalUnits,
    unit,
    notes: notesInput?.value.trim() || '',
    timestamp,
  };

  if (_editEntryId) {
    updateEntry(_editEntryId, entryData);
    showToast(`${_selectedCat.icon} Eintrag aktualisiert`, 'success');
  } else {
    addEntry(entryData);
    showToast(`${_selectedCat.icon} Gespeichert — ${totalUnits} ${unit}`, 'success');
  }

  window.closeModal();
  document.getElementById('addModal').querySelector('.modal-title').textContent = 'Eintrag hinzufügen';

  const dashView = document.getElementById('view-dashboard');
  if (dashView && !dashView.classList.contains('hidden')) renderDashboard(dashView);

  const histView = document.getElementById('view-history');
  if (histView && !histView.classList.contains('hidden')) {
    const { renderHistory } = await import('./history.js');
    renderHistory(histView);
  }
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
