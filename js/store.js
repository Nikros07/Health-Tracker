import { loadFromGitHub, saveToGitHub, hasToken } from './github-storage.js';
import { uid } from './utils.js';

const SCHEMA_VERSION = '1';

const DEFAULT_CATEGORIES = [
  {
    id: 'cat-alcohol',
    name: 'Alkohol',
    icon: '',
    color: '#7c3aed',
    unit: 'Units',
    dailyLimit: 14,
    archived: false,
    subcategories: [
      { id: 'sub-beer-05',   name: '1 Bier (0,5L)',      defaultUnits: 2.5, unit: 'Units' },
      { id: 'sub-beer-mass', name: '1 Maß Bier (1L)',     defaultUnits: 5.0, unit: 'Units' },
      { id: 'sub-shot',      name: 'Shot (4cl)',           defaultUnits: 1.6, unit: 'Units' },
      { id: 'sub-shot-dbl',  name: 'Doppelter Shot (8cl)',defaultUnits: 3.2, unit: 'Units' },
      { id: 'sub-cocktail',  name: 'Cocktail',             defaultUnits: 2.0, unit: 'Units' },
      { id: 'sub-wine',      name: 'Wein (0,2L)',          defaultUnits: 2.4, unit: 'Units' },
      { id: 'sub-sekt',      name: 'Sekt (0,1L)',          defaultUnits: 1.1, unit: 'Units' },
    ],
  },
  {
    id: 'cat-nicotine',
    name: 'Nikotin',
    icon: '',
    color: '#f59e0b',
    unit: 'Stück',
    dailyLimit: 10,
    archived: false,
    subcategories: [
      { id: 'sub-cig',        name: 'Zigarette',         defaultUnits: 1,  unit: 'Stück'  },
      { id: 'sub-vape',       name: 'Vape',              defaultUnits: 1,  unit: 'Session'},
      { id: 'sub-snus-4',     name: 'Snus leicht (4mg)', defaultUnits: 4,  unit: 'mg'     },
      { id: 'sub-snus-8',     name: 'Snus mittel (8mg)', defaultUnits: 8,  unit: 'mg'     },
      { id: 'sub-snus-12',    name: 'Snus stark (12mg)', defaultUnits: 12, unit: 'mg'     },
      { id: 'sub-shisha',     name: 'Shisha',            defaultUnits: 1,  unit: 'Session'},
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

export function updateEntry(id, updates) {
  const idx = _state.entries.findIndex(e => e.id === id);
  if (idx >= 0) {
    _state.entries[idx] = { ..._state.entries[idx], ...updates, updatedAt: new Date().toISOString() };
    scheduleSave();
    return _state.entries[idx];
  }
  return null;
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
