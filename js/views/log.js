import { getCategories, addEntry } from '../store.js';
import { showToast } from '../utils.js';
import { renderDashboard } from './dashboard.js';

let _selectedCat = null;
let _selectedSub = null;
let _quantity = 1;

export function openLogModal() {
  const categories = getCategories();
  if (!categories.length) {
    showToast('Keine Kategorien vorhanden. Bitte zuerst Kategorien anlegen.', 'error');
    return;
  }

  _selectedCat = categories[0];
  _selectedSub = _selectedCat.subcategories[0] || null;
  _quantity = 1;

  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  overlay.classList.remove('hidden');
  body.innerHTML = '';
  body.appendChild(buildForm(categories));
}

function buildForm(categories) {
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
  const qtySection = createSection('Anzahl');
  qtySection.appendChild(buildQuantityInput());
  frag.appendChild(qtySection);

  // Date/time
  const dtSection = createSection('Zeitpunkt');
  const dtInput = document.createElement('input');
  dtInput.type = 'datetime-local';
  dtInput.className = 'form-input';
  dtInput.id = 'entryDateTime';
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  dtInput.value = now.toISOString().slice(0, 16);
  dtSection.appendChild(dtInput);
  frag.appendChild(dtSection);

  // Notes
  const notesSection = createSection('Notiz (optional)');
  const notesInput = document.createElement('input');
  notesInput.type = 'text';
  notesInput.className = 'form-input';
  notesInput.id = 'entryNotes';
  notesInput.placeholder = 'z.B. Freitagabend mit Freunden';
  notesSection.appendChild(notesInput);
  frag.appendChild(notesSection);

  // Submit
  const submitBtn = document.createElement('button');
  submitBtn.className = 'btn btn-primary btn-full';
  submitBtn.style.marginTop = '8px';
  submitBtn.textContent = 'Eintrag speichern';
  submitBtn.addEventListener('click', handleSubmit);
  frag.appendChild(submitBtn);

  return frag;
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
    const item = document.createElement('button');
    item.className = `subcat-item${_selectedSub?.id === sub.id ? ' selected' : ''}`;
    item.innerHTML = `
      <span class="subcat-name">${sub.icon || ''} ${sub.name}</span>
      <span class="subcat-units">${sub.defaultUnits} ${_selectedCat.unit}</span>
    `;
    item.addEventListener('click', () => selectSub(sub));
    grid.appendChild(item);
  });
  return grid;
}

function buildUnitInfo() {
  if (!_selectedSub) return document.createDocumentFragment();
  const totalUnits = (_selectedSub.defaultUnits * _quantity).toFixed(2);
  const frag = document.createDocumentFragment();

  const div = document.createElement('div');
  div.className = 'unit-info';
  div.innerHTML = `
    <div>
      <div>Reiner Alkohol</div>
      <div style="font-size:11px;color:var(--text-muted);">1 Unit = 10ml purer Alkohol</div>
    </div>
    <span class="unit-info-value">${totalUnits} ${_selectedCat.unit}</span>
  `;
  frag.appendChild(div);
  return frag;
}

function buildQuantityInput() {
  const row = document.createElement('div');
  row.className = 'amount-row';

  const minusBtn = document.createElement('button');
  minusBtn.className = 'amount-btn';
  minusBtn.textContent = '−';
  minusBtn.addEventListener('click', () => adjustQty(-1));

  const inputWrapper = document.createElement('div');
  inputWrapper.className = 'amount-input-wrapper';

  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'form-input';
  input.id = 'entryQty';
  input.min = '1';
  input.max = '99';
  input.value = _quantity;
  input.addEventListener('change', e => {
    _quantity = Math.max(1, parseInt(e.target.value) || 1);
    input.value = _quantity;
    refreshUnitInfo();
  });

  const unitLabel = document.createElement('div');
  unitLabel.className = 'amount-unit';
  unitLabel.textContent = 'Anzahl Drinks/Stück';

  inputWrapper.appendChild(input);
  inputWrapper.appendChild(unitLabel);

  const plusBtn = document.createElement('button');
  plusBtn.className = 'amount-btn';
  plusBtn.textContent = '+';
  plusBtn.addEventListener('click', () => adjustQty(1));

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

  // Update chip active states
  document.querySelectorAll('#catChips .chip').forEach((chip, i) => {
    const cats = getCategories();
    chip.classList.toggle('active', cats[i]?.id === cat.id);
  });

  // Rebuild subcategory section
  const subSection = document.getElementById('subSection');
  if (subSection) {
    subSection.querySelector('.subcat-grid')?.remove();
    subSection.appendChild(buildSubcatGrid());
  }
  refreshUnitInfo();
}

function selectSub(sub) {
  _selectedSub = sub;
  document.querySelectorAll('.subcat-item').forEach(el => el.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
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

  const timestamp = dtInput?.value
    ? new Date(dtInput.value).toISOString()
    : new Date().toISOString();

  const totalUnits = _selectedSub
    ? parseFloat((_selectedSub.defaultUnits * _quantity).toFixed(4))
    : _quantity;

  const entry = {
    categoryId: _selectedCat.id,
    subcategoryId: _selectedSub?.id || null,
    subcategoryName: _selectedSub?.name || _selectedCat.name,
    amount: _quantity,
    totalUnits,
    unit: _selectedCat.unit,
    notes: notesInput?.value.trim() || '',
    timestamp,
  };

  addEntry(entry);
  window.closeModal();
  showToast(`${_selectedCat.icon} Eintrag gespeichert (${totalUnits} ${_selectedCat.unit})`, 'success');

  // Refresh dashboard if visible
  const dashView = document.getElementById('view-dashboard');
  if (dashView && !dashView.classList.contains('hidden')) {
    renderDashboard(dashView);
  }
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
