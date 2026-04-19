import { getCategories } from '../store.js';
import { calculateStreak, getTodayTotal, getYesterdayTotal, getWeeklyData, getMonthlyData, getMonthlyTotal } from '../models.js';
import { renderWeeklyChart, renderMonthlyChart, renderDonutChart } from '../charts.js';

export function renderDashboard(container) {
  const categories = getCategories();
  container.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'margin-bottom:28px;';
  header.innerHTML = `
    <h1 style="font-size:26px;font-weight:700;letter-spacing:-0.5px;margin-bottom:4px;">Tracker</h1>
    <p style="color:var(--text-secondary);font-size:14px;">${getGreeting()}</p>
  `;
  container.appendChild(header);

  if (!categories.length) {
    container.innerHTML += `<div class="empty-state">
      <div class="empty-state-title">Keine Kategorien</div>
      <p class="empty-state-desc">Einstellungen aufrufen und Kategorien anlegen.</p>
    </div>`;
    return;
  }

  // Today stats
  appendSection(container, 'Heute', () => {
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;';
    categories.forEach(cat => {
      const todayVal = getTodayTotal(cat.id);
      const ydVal    = getYesterdayTotal(cat.id);
      const streak   = calculateStreak(cat.id);
      const overLimit = cat.dailyLimit && todayVal > cat.dailyLimit;
      const delta    = todayVal - ydVal;
      const deltaClass = delta > 0 ? 'negative' : delta < 0 ? 'positive' : 'neutral';
      const progress = cat.dailyLimit ? Math.min(100, (todayVal / cat.dailyLimit) * 100) : 0;
      const progressColor = overLimit ? 'var(--accent-danger)' : todayVal > 0 ? cat.color : 'var(--accent-success)';

      const card = document.createElement('div');
      card.className = 'card stat-card animate-fade-in';
      card.innerHTML = `
        <div class="stat-card-header">
          <span class="stat-label">${cat.name}</span>
          <span class="cat-dot" style="background:${cat.color};width:8px;height:8px;"></span>
        </div>
        <div>
          <span class="stat-value" style="color:${cat.color};">${todayVal.toFixed(1)}</span>
          <span class="stat-unit">${cat.unit}</span>
        </div>
        ${cat.dailyLimit ? `<div class="progress-bar"><div class="progress-fill" style="width:${progress}%;background:${progressColor};"></div></div>` : ''}
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;">
          <span class="stat-delta ${deltaClass}">${delta > 0 ? '+' : ''}${delta.toFixed(1)} vs. gestern</span>
          ${overLimit ? '<span class="badge badge-danger">Limit!</span>' : todayVal === 0 ? '<span class="badge badge-success">Clean</span>' : '<span class="badge badge-info">OK</span>'}
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">
          ${streak.currentStreak > 0 ? `${streak.currentStreak} Tage clean` : streak.lastUsedDate ? `Zuletzt: ${formatRelative(streak.lastUsedDate)}` : 'Noch kein Eintrag'}
        </div>
      `;
      grid.appendChild(card);
    });
    return grid;
  });

  // Streaks
  appendSection(container, 'Streaks', () => {
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;';
    categories.forEach(cat => {
      const streak = calculateStreak(cat.id);
      const card = document.createElement('div');
      card.className = `streak-card${streak.currentStreak >= 3 ? ' active' : ''}`;
      card.style.setProperty('--streak-color', cat.color);
      card.innerHTML = `
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-secondary);margin-bottom:8px;">${cat.name}</div>
        <div class="streak-number" style="color:${cat.color};">${streak.currentStreak}</div>
        <div class="streak-label">Tage ohne ${cat.name}</div>
        <div class="streak-sub">Rekord: ${streak.longestStreak} Tage</div>
      `;
      grid.appendChild(card);
    });
    return grid;
  });

  // Weekly chart
  appendSection(container, 'Diese Woche', () => {
    const card = document.createElement('div');
    card.className = 'card';
    const canvas = document.createElement('canvas');
    canvas.id = 'weeklyChart';
    canvas.style.height = '200px';
    card.appendChild(canvas);
    return card;
  });

  // Monthly chart
  appendSection(container, 'Letzter Monat', () => {
    const card = document.createElement('div');
    card.className = 'card';
    const canvas = document.createElement('canvas');
    canvas.id = 'monthlyChart';
    canvas.style.height = '200px';
    card.appendChild(canvas);
    return card;
  });

  // Donut + totals
  const statsRow = document.createElement('div');
  statsRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:32px;';

  const donutCard = document.createElement('div');
  donutCard.className = 'card';
  donutCard.innerHTML = `<div class="section-title" style="margin-bottom:12px;">Dieser Monat</div>`;
  const donutCanvas = document.createElement('canvas');
  donutCanvas.id = 'donutChart';
  donutCanvas.style.height = '160px';
  donutCard.appendChild(donutCanvas);

  const totalsCard = document.createElement('div');
  totalsCard.className = 'card';
  totalsCard.innerHTML = `<div class="section-title" style="margin-bottom:12px;">Monatssummen</div>`;
  categories.forEach(cat => {
    const monthly = getMonthlyTotal(cat.id);
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);';
    row.innerHTML = `
      <span style="font-size:13px;color:var(--text-secondary);">${cat.name}</span>
      <span style="font-size:15px;font-weight:700;color:${cat.color};">${monthly.toFixed(1)} <span style="font-size:11px;font-weight:400;color:var(--text-muted);">${cat.unit}</span></span>
    `;
    totalsCard.appendChild(row);
  });

  statsRow.appendChild(donutCard);
  statsRow.appendChild(totalsCard);
  container.appendChild(statsRow);

  // Render charts after DOM ready
  requestAnimationFrame(() => {
    const weeklyDataMap = {}, monthlyDataMap = {}, monthlyTotals = {};
    categories.forEach(cat => {
      weeklyDataMap[cat.id]  = getWeeklyData(cat.id);
      monthlyDataMap[cat.id] = getMonthlyData(cat.id);
      monthlyTotals[cat.id]  = getMonthlyTotal(cat.id);
    });
    renderWeeklyChart('weeklyChart', categories, weeklyDataMap);
    renderMonthlyChart('monthlyChart', categories, monthlyDataMap);
    renderDonutChart('donutChart', categories, monthlyTotals);
  });
}

function appendSection(container, label, buildFn) {
  const section = document.createElement('div');
  section.style.marginBottom = '28px';
  const title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = label;
  section.appendChild(title);
  section.appendChild(buildFn());
  container.appendChild(section);
}

function getGreeting() {
  const h = new Date().getHours();
  const day = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  if (h < 12) return `Guten Morgen — ${day}`;
  if (h < 18) return `Guten Tag — ${day}`;
  return `Guten Abend — ${day}`;
}

function formatRelative(dateStr) {
  const diff = dayjs().diff(dayjs(dateStr), 'day');
  if (diff === 0) return 'heute';
  if (diff === 1) return 'gestern';
  return `vor ${diff} Tagen`;
}
