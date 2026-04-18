const REPO = 'nikros07/health-tracker';
const DATA_PATH = 'data/tracker-data.json';
const API_BASE = 'https://api.github.com';

let _sha = null;

function getToken() {
  return localStorage.getItem('ht_github_token') || '';
}

async function apiFetch(path, opts = {}) {
  const token = getToken();
  if (!token) throw new Error('NO_TOKEN');
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...opts.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function loadFromGitHub() {
  const token = getToken();
  if (!token) return null;
  try {
    const data = await apiFetch(`/repos/${REPO}/contents/${DATA_PATH}`);
    _sha = data.sha;
    const decoded = JSON.parse(atob(data.content.replace(/\n/g, '')));
    return decoded;
  } catch (e) {
    if (e.message === 'NO_TOKEN') return null;
    if (e.message && e.message.includes('Not Found')) return null;
    throw e;
  }
}

export async function saveToGitHub(payload) {
  const token = getToken();
  if (!token) return false;
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2))));
  const body = {
    message: `tracker: update data ${new Date().toISOString()}`,
    content,
  };
  if (_sha) body.sha = _sha;
  const res = await apiFetch(`/repos/${REPO}/contents/${DATA_PATH}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  _sha = res.content.sha;
  return true;
}

export function hasToken() {
  return !!getToken();
}

export function setToken(token) {
  localStorage.setItem('ht_github_token', token.trim());
}

export function clearToken() {
  localStorage.removeItem('ht_github_token');
}

export async function validateToken() {
  try {
    await apiFetch('/user');
    return true;
  } catch {
    return false;
  }
}
