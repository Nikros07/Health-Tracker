import { loadFromGitHub, saveToGitHub, hasToken } from './github-storage.js';
import { uid } from './utils.js';

const SCHEMA_VERSION = '1';

const DEFAULT_CATEGORIES = [
  {
    id: 'cat-alcohol',
    name: 'Alkohol',
    icon: '🍺',
    color: '#7c3aed',
    unit: 'Units',
    dailyLimit: 14,
    archived: false,
    subcategories: [
      // Bier — 5% ABV: ml × 0,05 / 10 = Units
      { id: 'sub-beer-mass', name: '🍺 Maß Bier (1L, 5%)', defaultUnits: 5.0, icon: '🍺' },
      { id: 'sub-beer-05', name: '🍺 Bier Flasche/Pint (0,5L, 5%)', defaultUnits: 2.5, icon: '🍺' },
      { id: 'sub-beer-033', name: '🍺 Kleines Bier (0,33L, 5%)', defaultUnits: 1.65, icon: '🍺' },
      // Vodka — 40% ABV: 40cl Glas = 16 Units, deutlich mehr als Bier!
      { id: 'sub-vodka-shot', name: '🥃 Vodka Shot (2cl, 40%)', defaultUnits: 0.8, icon: '🥃' },
      { id: 'sub-vodka-norm', name: '🥃 Vodka Glas (4cl, 40%)', defaultUnits: 1.6, icon: '🥃' },
      { id: 'sub-vodka-dbl', name: '🥃 Vodka doppelt (8cl, 40%)', defaultUnits: 3.2, icon: '🥃' },
      { id: 'sub-vodka-lg', name: '🥃 Vodka Party-Glas (15cl, 40%)', defaultUnits: 6.0, icon: '🥃' },
      // Gin, Rum, Whisky — 40%
      { id: 'sub-gin-norm', name: '🫙 Gin (4cl, 40%)', defaultUnits: 1.6, icon: '🫙' },
      { id: 'sub-gin-lg', name: '🫙 Gin doppelt (8cl, 40%)', defaultUnits: 3.2, icon: '🫙' },
      { id: 'sub-rum-norm', name: '🫙 Rum (4cl, 40%)', defaultUnits: 1.6, icon: '🫙' },
      { id: 'sub-rum-lg', name: '🫙 Rum doppelt (8cl, 40%)', defaultUnits: 3.2, icon: '🫙' },
      { id: 'sub-whisky-norm', name: '🥃 Whisky (4cl, 40%)', defaultUnits: 1.6, icon: '🥃' },
      // Wein — 12% ABV
      { id: 'sub-wine-bottle', name: '🍷 Wein Flasche (0,75L, 12%)', defaultUnits: 9.0, icon: '🍷' },
      { id: 'sub-wine-lg', name: '🍷 Wein großes Glas (0,2L, 12%)', defaultUnits: 2.4, icon: '🍷' },
      { id: 'sub-wine-sm', name: '🍷 Wein kleines Glas (0,1L, 12%)', defaultUnits: 1.2, icon: '🍷' },
      // Sonstiges
      { id: 'sub-sekt', name: '🥂 Sekt/Prosecco (0,1L, 11%)', defaultUnits: 1.1, icon: '🥂' },
      { id: 'sub-cocktail', name: '🍹 Cocktail (mit Alkohol)', defaultUnits: 2.0, icon: '🍹' },
      { id: 'sub-alcopop', name: '🥤 Alcopop (0,33L, 5%)', defaultUnits: 1.65, icon: '🥤' },
    ],
  },
  {
    id: 'cat-nicotine',
    name: 'Nikotin',
    icon: '🚬',
    color: '#f59e0b',
    unit: 'Stück',
    dailyLimit: 10,
    archived: false,
    subcategories: [
      { id: 'sub-cig', name: 'Zigarette', defaultUnits: 1, icon: '🚬' },
      { id: 'sub-cig-light', name: 'Zigarette Light', defaultUnits: 1, icon: '🚬' },
      { id: 'sub-vape', name: 'Vape/E-Zigarette', defaultUnits: 1, icon: '💨' },
      { id: 'sub-cigar', name: 'Zigarre', defaultUnits: 1, icon: '🪖' },
      { id: 'sub-snus', name: 'Snus/Kautabak', defaultUnits: 1, icon: '📦' },
      { id: 'sub-patch', name: 'Nikotinpflaster', defaultUnits: 1, icon: '🩹' },
    ],
  },
];

let _state = {
  schemaVersion: SCHEMA_VERSION,
  categories: [],
  entries: [],
  settings: {
    weekStartsOn: 1,
  },
};

let _saveTimer = null;
const SAVE_DEBOUNCE = 1500;

function readLocal() {
  try {
    const raw = localStorage.getItem('ht_data');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeLocal(data) {
  try {
    localStorage.setItem('ht_data', JSON.stringify(data));
  } catch {}
}

async function scheduleSave() {
  writeLocal(_state);
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    if (hasToken()) {
      try {
        await saveToGitHub(_state);
      } catch (e) {
        console.error('GitHub save failed:', e.message);
      }
    }
  }, SAVE_DEBOUNCE);
}

export async function initStore() {
  let loaded = null;

  if (hasToken()) {
    try {
      loaded = await loadFromGitHub();
    } catch (e) {
      console.warn('GitHub load failed, falling back to local:', e.message);
    }
  }

  if (!loaded) {
    loaded = readLocal();
  }

  if (loaded && loaded.schemaVersion === SCHEMA_VERSION) {
    _state = loaded;
  } else {
    _state = {
      schemaVersion: SCHEMA_VERSION,
      categories: DEFAULT_CATEGORIES,
      entries: [],
      settings: { weekStartsOn: 1 },
    };
    await scheduleSave();
  }
}

export function getCategories() {
  return _state.categories.filter(c => !c.archived);
}

export function getCategoryById(id) {
  return _state.categories.find(c => c.id === id);
}

export function getEntries() {
  return [..._state.entries].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export function getEntriesForDate(dateStr) {
  return _state.entries.filter(e => e.timestamp.startsWith(dateStr));
}

export function addEntry(entry) {
  const newEntry = { id: uid(), createdAt: new Date().toISOString(), ...entry };
  _state.entries.push(newEntry);
  scheduleSave();
  return newEntry;
}

export function deleteEntry(id) {
  _state.entries = _state.entries.filter(e => e.id !== id);
  scheduleSave();
}

export function addCategory(cat) {
  const newCat = { id: uid(), archived: false, subcategories: [], ...cat };
  _state.categories.push(newCat);
  scheduleSave();
  return newCat;
}

export function updateCategory(id, updates) {
  const idx = _state.categories.findIndex(c => c.id === id);
  if (idx >= 0) {
    _state.categories[idx] = { ..._state.categories[idx], ...updates };
    scheduleSave();
  }
}

export function deleteCategory(id) {
  updateCategory(id, { archived: true });
}

export function getSettings() {
  return { ..._state.settings };
}

export function updateSettings(updates) {
  _state.settings = { ..._state.settings, ...updates };
  scheduleSave();
}

export function exportData() {
  return JSON.stringify(_state, null, 2);
}

export async function importData(jsonStr) {
  const parsed = JSON.parse(jsonStr);
  if (!parsed.categories || !parsed.entries) throw new Error('Ungültiges Format');
  _state = { ...parsed, schemaVersion: SCHEMA_VERSION };
  await scheduleSave();
}

export function getState() {
  return _state;
}
