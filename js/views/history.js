import { getEntries, deleteEntry, getCategories } from '../store.js';
import { groupEntriesByDate } from '../models.js';
import { formatDate, formatTime, showToast } from '../utils.js';
import { openEditModal } from './log.js';

let _filterCat = 'all';
let _filterRange = '7d';

export function renderHistory(container) {
  container.innerHTML = '';

  const categories = getCategories();

  // Header
  container.innerHTML = `<h1 class="page-title">Verlauf</h1>`;

  // Category filter
  const filterBar = document.createElement('div');
  filterBar.className = 'filter-bar';
  filterBar.id = 'catFilter';

  const allChip = makeFilterChip('Alle', 'all', _filterCat === 'all', '#7c3aed', () => {
    _filterCat = 'all';
    renderHistory(container);
  });
  filterBar.appendChild(allChip);

  categories.forEach(cat => {
    const chip = makeFilterChip(`${cat.icon} ${cat.name}`, cat.id, _filterCat === cat.id, cat.color, () => {
      _filterCat = cat.id;
      renderHistory(container);
    });
    filterBar.appendChild(chip);
  });

  container.appendChild(filterBar);

  // Time range filter
  const rangeBar = document.createElement('div');
  rangeBar.className = 'filter-bar';
  rangeBar.style.marginBottom = '24px';

  const ranges = [
    { label: 'Heute', value: '1d' },
    { label: '7 Tage', value: '7d' },
    { label: '30 Tage', value: '30d' },
    { label: 'Alles', value: 'all' },
  ];

  ranges.forEach(r => {
    const chip = makeFilterChip(r.label, r.value, _filterRange === r.value, '#06b6d4', () => {
      _filterRange = r.value;
      renderHistory(container);
    });
    rangeBar.appendChild(chip);
  });

  container.appendChild(rangeBar);

  // Get filtered entries
  let entries = getEntries();

  if (_filterCat !== 'all') {
    entries = entries.filter(e => e.categoryId === _filterCat);
  }

  const cutoff = getRangeCutoff(_filterRange);
  if (cutoff) {
    entries = entries.filter(e => e.timestamp >= cutoff);
  }

  if (!entries.length) {
    container.appendChild(createEmptyState());
    return;
  }

  // Summary bar
  const summary = buildSummary(entries, categories);
  container.appendChild(summary);

  // Group by date
  const groups = groupEntriesByDate(entries);
  const catMap = new Map(categories.map(c => [c.id, c]));

  groups.forEach((dayEntries, dateKey) => {
    const group = document.createElement('div');
    group.className = 'history-group';

    const dateHeader = document.createElement('div');
    dateHeader.className = 'history-date-header';
    const dayAlcohol = dayEntries.filter(e => e.unit === 'Units').reduce((s, e) => s + (e.totalUnits || e.amount), 0);
    const daySummary = dayAlcohol > 0 ? `${dayAlcohol.toFixed(1)} Units` : `${dayEntries.length} Einträge`;
    dateHeader.innerHTML = `${formatDate(dateKey)} <span style="float:right;font-weight:400;text-transform:none;">${daySummary}</span>`;
    group.appendChild(dateHeader);

    dayEntries.forEach(entry => {
      const cat = catMap.get(entry.categoryId);
      if (!cat) return;
      group.appendChild(buildHistoryItem(entry, cat, container, categories));
    });

    container.appendChild(group);
  });
}

function buildHistoryItem(entry, cat, container, categories) {
  const item = document.createElement('div');
  item.className = 'history-item animate-fade-in';
  item.dataset.id = entry.id;

  const iconDiv = document.createElement('div');
  iconDiv.className = 'history-item-icon';
  iconDiv.style.background = hexToRgba(cat.color, 0.15);
  iconDiv.textContent = cat.icon;

  const content = document.createElement('div');
  content.className = 'history-item-content';
  content.innerHTML = `
    <div class="history-item-name">${entry.subcategoryName || cat.name}</div>
    <div class="history-item-meta">${cat.name} · ${formatTime(entry.timestamp)}${entry.notes ? ` · "${entry.notes}"` : ''}</div>
  `;

  const displayVal = entry.unit === 'mg'
    ? Math.round(entry.totalUnits || entry.amount)
    : (entry.totalUnits || entry.amount).toFixed(1);

  const amount = document.createElement('div');
  amount.className = 'history-item-amount';
  amount.innerHTML = `
    <div class="history-item-units" style="color:${cat.color};">${displayVal}</div>
    <div class="history-item-unit-label">${entry.unit || cat.unit}</div>
    ${entry.amount > 1 && entry.unit !== 'mg' ? `<div class="history-item-unit-label">${entry.amount}×</div>` : ''}
  `;

  const isTouchDevice = window.matchMedia('(hover: none)').matches;
  const actions = document.createElement('div');
  actions.style.cssText = `display:flex;gap:4px;opacity:${isTouchDevice ? '1' : '0'};transition:opacity 0.15s;`;
  if (!isTouchDevice) {
    item.addEventListener('mouseenter', () => actions.style.opacity = '1');
    item.addEventListener('mouseleave', () => actions.style.opacity = '0');
  }

  const editBtn = document.createElement('button');
  editBtn.className = 'history-item-delete';
  editBtn.setAttribute('aria-label', 'Bearbeiten');
  editBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
  editBtn.addEventListener('click', () => openEditModal(entry));

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'history-item-delete';
  deleteBtn.setAttribute('aria-label', 'Löschen');
  deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
  deleteBtn.addEventListener('click', () => {
    if (confirm('Eintrag löschen?')) {
      deleteEntry(entry.id);
      showToast('Eintrag gelöscht', 'info');
      renderHistory(container);
    }
  });

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  item.appendChild(iconDiv);
  item.appendChild(content);
  item.appendChild(amount);
  item.appendChild(actions);
  return item;
}

function buildSummary(entries, categories) {
  const div = document.createElement('div');
  div.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:24px;';

  const catTotals = new Map();
  entries.forEach(e => {
    catTotals.set(e.categoryId, (catTotals.get(e.categoryId) || 0) + (e.totalUnits || e.amount));
  });

  catTotals.forEach((total, catId) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    const card = document.createElement('div');
    card.className = 'card card-sm';
    card.innerHTML = `
      <div style="font-size:12px;color:var(--text-secondary);">${cat.icon} ${cat.name}</div>
      <div style="font-size:22px;font-weight:700;color:${cat.color};margin-top:4px;">${total.toFixed(1)}</div>
      <div style="font-size:11px;color:var(--text-muted);">${cat.unit} gesamt</div>
    `;
    div.appendChild(card);
  });

  return div;
}

function makeFilterChip(label, value, active, color, onClick) {
  const chip = document.createElement('button');
  chip.className = `chip${active ? ' active' : ''}`;
  if (active) {
    chip.style.setProperty('--chip-color', color);
    chip.style.setProperty('--chip-bg', hexToRgba(color, 0.15));
  }
  chip.textContent = label;
  chip.addEventListener('click', onClick);
  return chip;
}

function getRangeCutoff(range) {
  const now = new Date();
  if (range === 'all') return null;
  if (range === '1d') return dayjs().startOf('day').toISOString();
  if (range === '7d') return dayjs().subtract(7, 'day').toISOString();
  if (range === '30d') return dayjs().subtract(30, 'day').toISOString();
  return null;
}

function createEmptyState() {
  const div = document.createElement('div');
  div.className = 'empty-state';
  div.innerHTML = `
    <div class="empty-state-icon">📭</div>
    <div class="empty-state-title">Keine Einträge</div>
    <p class="empty-state-desc">Noch keine Einträge für diesen Zeitraum.</p>
  `;
  return div;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
