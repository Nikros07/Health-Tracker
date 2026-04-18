const _chartInstances = new Map();

Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'Inter', sans-serif";

function destroyChart(id) {
  if (_chartInstances.has(id)) {
    _chartInstances.get(id).destroy();
    _chartInstances.delete(id);
  }
}

export function renderWeeklyChart(canvasId, categories, weeklyDataMap) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const labels = weeklyDataMap[categories[0]?.id]?.map(d => d.label) || [];

  const datasets = categories.map(cat => ({
    label: `${cat.icon} ${cat.name}`,
    data: (weeklyDataMap[cat.id] || []).map(d => d.total),
    backgroundColor: hexToRgba(cat.color, 0.75),
    borderColor: cat.color,
    borderWidth: 2,
    borderRadius: 6,
    borderSkipped: false,
  }));

  const chart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { padding: 16, usePointStyle: true, pointStyle: 'circle' },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} Units`,
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#94a3b8', stepSize: 1 },
        },
      },
    },
  });

  _chartInstances.set(canvasId, chart);
}

export function renderMonthlyChart(canvasId, categories, monthlyDataMap) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const labels = monthlyDataMap[categories[0]?.id]?.map(d => d.label) || [];

  const datasets = categories.map(cat => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, hexToRgba(cat.color, 0.4));
    gradient.addColorStop(1, hexToRgba(cat.color, 0.01));

    return {
      label: `${cat.icon} ${cat.name}`,
      data: (monthlyDataMap[cat.id] || []).map(d => d.total),
      borderColor: cat.color,
      borderWidth: 2,
      backgroundColor: gradient,
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: cat.color,
    };
  });

  const chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { padding: 16, usePointStyle: true, pointStyle: 'circle' },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} Units`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#94a3b8',
            maxTicksLimit: 8,
            maxRotation: 0,
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#94a3b8' },
        },
      },
    },
  });

  _chartInstances.set(canvasId, chart);
}

export function renderDonutChart(canvasId, categories, totals) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const filtered = categories.filter(c => (totals[c.id] || 0) > 0);
  if (!filtered.length) return;

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: filtered.map(c => `${c.icon} ${c.name}`),
      datasets: [{
        data: filtered.map(c => totals[c.id] || 0),
        backgroundColor: filtered.map(c => hexToRgba(c.color, 0.75)),
        borderColor: filtered.map(c => c.color),
        borderWidth: 2,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 16, usePointStyle: true, pointStyle: 'circle' },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed.toFixed(1)} Units`,
          },
        },
      },
    },
  });

  _chartInstances.set(canvasId, chart);
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
