import { getCategories } from '../store.js';
import { calculateStreak, getTodayTotal, getYesterdayTotal, getWeeklyData, getMonthlyData, getMonthlyTotal } from '../models.js';
import { renderWeeklyChart, renderMonthlyChart, renderDonutChart } from '../charts.js';

export function renderDashboard(container) {
  const categories = getCategories();
  container.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'margin-bottom:24px;';
  const greeting = getGreeting();
  header.innerHTML = `
    <h1 class="page-title" style="margin-bottom:4px;">⚡ Tracker</h1>
    <p style="color:var(--text-secondary);font-size:14px;">${greeting}</p>
  `;
  container.appendChild(header);

  if (!categories.length) {
    container.innerHTML += `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-title">Keine Kategorien</div>
        <p class="empty-state-desc">Gehe zu Einstellungen und lege Kategorien an.</p>
      </div>`;
    return;
  }

  // Today stats
  const todaySection = document.createElement('div');
  todaySection.style.marginBottom = '32px';
  todaySection.innerHTML = `<h2 class="section-title">Heute</h2>`;
  const todayGrid = document.createElement('div');
  todayGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;';

  categories.forEach(cat => {
    const todayVal = getTodayTotal(cat.id);
    const ydVal = getYesterdayTotal(cat.id);
    const streak = calculateStreak(cat.id);
    const overLimit = cat.dailyLimit && todayVal > cat.dailyLimit;
    const deltaVal = todayVal - ydVal;
    const deltaClass = deltaVal > 0 ? 'negative' : deltaVal < 0 ? 'positive' : 'neutral';
    const deltaSign = deltaVal > 0 ? '+' : '';
    const progress = cat.dailyLimit ? Math.min(100, (todayVal / cat.dailyLimit) * 100) : 0;
    const progressColor = overLimit ? 'var(--accent-danger)' : todayVal > 0 ? cat.color : 'var(--accent-success)';

    const card = document.createElement('div');
    card.className = 'card stat-card animate-fade-in';
    card.innerHTML = `
      <div class="stat-card-header">
        <span class="stat-label">${cat.name}</span>
        <span class="stat-icon">${cat.icon}</span>
      </div>
      <div>
        <span class="stat-value">${todayVal.toFixed(1)}</span>
        <span class="stat-unit"> ${cat.unit}</span>
      </div>
      ${cat.dailyLimit ? `<div class="progress-bar"><div class="progress-fill" style="width:${progress}%;background:${progressColor};"></div></div>` : ''}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;">
        <span class="stat-delta ${deltaClass}">${deltaSign}${deltaVal.toFixed(1)} vs. gestern</span>
        ${overLimit ? '<span class="badge badge-danger">Limit!</span>' : todayVal === 0 ? '<span class="badge badge-success">Clean</span>' : '<span class="badge badge-info">OK</span>'}
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">
        ${streak.currentStreak > 0 ? `🔥 ${streak.currentStreak} Tage clean` : `Zuletzt: ${streak.lastUsedDate ? formatRelative(streak.lastUsedDate) : '—'}`}
      </div>
    `;
    todayGrid.appendChild(card);
  });

  todaySection.appendChild(todayGrid);
  container.appendChild(todaySection);

  // Streaks
  const streakSection = document.createElement('div');
  streakSection.style.marginBottom = '32px';
  streakSection.innerHTML = `<h2 class="section-title">Streaks</h2>`;
  const streakGrid = document.createElement('div');
  streakGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;';

  categories.forEach(cat => {
    const streak = calculateStreak(cat.id);
    const card = document.createElement('div');
    card.className = `streak-card${streak.currentStreak >= 3 ? ' active' : ''}`;
    card.style.setProperty('--streak-color', cat.color);
    card.innerHTML = `
      <div style="font-size:24px;margin-bottom:4px;">${cat.icon}</div>
      <div class="streak-number" style="color:${cat.color};">${streak.currentStreak}</div>
      <div class="streak-label">Tage ohne ${cat.name}</div>
      <div class="streak-sub">Rekord: ${streak.longestStreak} Tage</div>
    `;
    streakGrid.appendChild(card);
  });

  streakSection.appendChild(streakGrid);
  container.appendChild(streakSection);

  // Weekly chart
  const weekSection = document.createElement('div');
  weekSection.style.marginBottom = '32px';
  weekSection.innerHTML = `<h2 class="section-title">Diese Woche</h2>`;
  const weekCard = document.createElement('div');
  weekCard.className = 'card';
  const weekCanvas = document.createElement('canvas');
  weekCanvas.id = 'weeklyChart';
  weekCanvas.style.height = '220px';
  weekCard.appendChild(weekCanvas);
  weekSection.appendChild(weekCard);
  container.appendChild(weekSection);

  // Monthly chart
  const monthSection = document.createElement('div');
  monthSection.style.marginBottom = '32px';
  monthSection.innerHTML = `<h2 class="section-title">Letzter Monat</h2>`;
  const monthCard = document.createElement('div');
  monthCard.className = 'card';
  const monthCanvas = document.createElement('canvas');
  monthCanvas.id = 'monthlyChart';
  monthCanvas.style.height = '220px';
  monthCard.appendChild(monthCanvas);
  monthSection.appendChild(monthCard);
  container.appendChild(monthSection);

  // Donut + monthly totals
  const statsRow = document.createElement('div');
  statsRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:32px;';

  const donutCard = document.createElement('div');
  donutCard.className = 'card';
  donutCard.innerHTML = `<h3 style="font-size:14px;font-weight:600;color:var(--text-secondary);margin-bottom:12px;">Dieser Monat</h3>`;
  const donutCanvas = document.createElement('canvas');
  donutCanvas.id = 'donutChart';
  donutCanvas.style.height = '180px';
  donutCard.appendChild(donutCanvas);

  const totalsCard = document.createElement('div');
  totalsCard.className = 'card';
  totalsCard.innerHTML = `<h3 style="font-size:14px;font-weight:600;color:var(--text-secondary);margin-bottom:12px;">Monatssummen</h3>`;
  categories.forEach(cat => {
    const monthly = getMonthlyTotal(cat.id);
    const weekly = 0;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);';
    row.innerHTML = `
      <span style="font-size:14px;color:var(--text-secondary);">${cat.icon} ${cat.name}</span>
      <span style="font-size:16px;font-weight:700;color:${cat.color};">${monthly.toFixed(1)} <span style="font-size:11px;font-weight:400;color:var(--text-muted);">${cat.unit}</span></span>
    `;
    totalsCard.appendChild(row);
  });

  statsRow.appendChild(donutCard);
  statsRow.appendChild(totalsCard);
  container.appendChild(statsRow);

  // Render charts (after DOM is ready)
  requestAnimationFrame(() => {
    const weeklyDataMap = {};
    const monthlyDataMap = {};
    const monthlyTotals = {};

    categories.forEach(cat => {
      weeklyDataMap[cat.id] = getWeeklyData(cat.id);
      monthlyDataMap[cat.id] = getMonthlyData(cat.id);
      monthlyTotals[cat.id] = getMonthlyTotal(cat.id);
    });

    renderWeeklyChart('weeklyChart', categories, weeklyDataMap);
    renderMonthlyChart('monthlyChart', categories, monthlyDataMap);
    renderDonutChart('donutChart', categories, monthlyTotals);
  });
}

function getGreeting() {
  const h = new Date().getHours();
  const day = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  if (h < 12) return `Guten Morgen · ${day}`;
  if (h < 18) return `Guten Tag · ${day}`;
  return `Guten Abend · ${day}`;
}

function formatRelative(dateStr) {
  const diff = dayjs().diff(dayjs(dateStr), 'day');
  if (diff === 0) return 'Heute';
  if (diff === 1) return 'Gestern';
  return `vor ${diff} Tagen`;
}
