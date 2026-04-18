export function uid() {
  return crypto.randomUUID();
}

export function today() {
  return dayjs().format('YYYY-MM-DD');
}

export function dateKey(ts) {
  return dayjs(ts).format('YYYY-MM-DD');
}

export function formatDate(ts) {
  const d = dayjs(ts);
  const t = dayjs();
  if (d.isSame(t, 'day')) return 'Heute';
  if (d.isSame(t.subtract(1, 'day'), 'day')) return 'Gestern';
  return d.format('DD. MMM YYYY');
}

export function formatTime(ts) {
  return dayjs(ts).format('HH:mm');
}

export function formatDateTime(ts) {
  return dayjs(ts).format('DD.MM.YYYY HH:mm');
}

export function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    days.push(dayjs().subtract(i, 'day').format('YYYY-MM-DD'));
  }
  return days;
}

export function getLast30Days() {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    days.push(dayjs().subtract(i, 'day').format('YYYY-MM-DD'));
  }
  return days;
}

export function el(tag, attrs = {}, ...children) {
  const elem = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') elem.className = v;
    else if (k === 'html') elem.innerHTML = v;
    else elem.setAttribute(k, v);
  }
  for (const child of children) {
    if (typeof child === 'string') elem.appendChild(document.createTextNode(child));
    else if (child) elem.appendChild(child);
  }
  return elem;
}

export function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = el('div', { class: `toast toast-${type}` }, message);
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export function showLoading() {
  document.getElementById('loadingOverlay').classList.remove('hidden');
}

export function hideLoading() {
  document.getElementById('loadingOverlay').classList.add('hidden');
}

export function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
