import { getEntries, getCategoryById } from './store.js';
import { dateKey } from './utils.js';

export function calculateStreak(categoryId) {
  const entries = getEntries().filter(e => e.categoryId === categoryId);
  if (!entries.length) {
    return { currentStreak: 0, longestStreak: 0, lastUsedDate: null, isClean: true };
  }

  const usedDates = new Set(entries.map(e => dateKey(e.timestamp)));
  const lastUsedDate = [...usedDates].sort().reverse()[0];

  const todayStr = dateKey(new Date().toISOString());
  const yesterdayStr = dateKey(dayjs().subtract(1, 'day').toISOString());

  // Current clean streak: count consecutive days from today backwards with no entries
  let currentStreak = 0;
  let d = dayjs();
  while (true) {
    const ds = d.format('YYYY-MM-DD');
    if (usedDates.has(ds)) break;
    currentStreak++;
    d = d.subtract(1, 'day');
    if (currentStreak > 3650) break;
  }

  // Longest streak ever
  const allDates = [...usedDates].sort();
  const firstDate = dayjs(allDates[0]);
  const totalDays = dayjs().diff(firstDate, 'day') + 1;

  let longestStreak = 0;
  let tempStreak = 0;
  let cursor = firstDate;

  for (let i = 0; i <= totalDays; i++) {
    const ds = cursor.format('YYYY-MM-DD');
    if (!usedDates.has(ds)) {
      tempStreak++;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
    cursor = cursor.add(1, 'day');
  }

  const isClean = !usedDates.has(todayStr) && !usedDates.has(yesterdayStr);

  return { currentStreak, longestStreak, lastUsedDate, isClean };
}

export function getTodayTotal(categoryId) {
  const todayStr = dateKey(new Date().toISOString());
  return getEntries()
    .filter(e => e.categoryId === categoryId && e.timestamp.startsWith(todayStr))
    .reduce((sum, e) => sum + (e.totalUnits || e.amount), 0);
}

export function getYesterdayTotal(categoryId) {
  const ydStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  return getEntries()
    .filter(e => e.categoryId === categoryId && e.timestamp.startsWith(ydStr))
    .reduce((sum, e) => sum + (e.totalUnits || e.amount), 0);
}

export function getWeeklyData(categoryId) {
  const entries = getEntries().filter(e => e.categoryId === categoryId);
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const ds = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    const total = entries
      .filter(e => e.timestamp.startsWith(ds))
      .reduce((sum, e) => sum + (e.totalUnits || e.amount), 0);
    days.push({ date: ds, label: dayjs().subtract(i, 'day').format('dd'), total });
  }
  return days;
}

export function getMonthlyData(categoryId) {
  const entries = getEntries().filter(e => e.categoryId === categoryId);
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const ds = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    const total = entries
      .filter(e => e.timestamp.startsWith(ds))
      .reduce((sum, e) => sum + (e.totalUnits || e.amount), 0);
    days.push({ date: ds, label: dayjs().subtract(i, 'day').format('D.M'), total });
  }
  return days;
}

export function getMonthlyTotal(categoryId) {
  const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
  return getEntries()
    .filter(e => e.categoryId === categoryId && e.timestamp >= startOfMonth)
    .reduce((sum, e) => sum + (e.totalUnits || e.amount), 0);
}

export function getWeeklyTotal(categoryId) {
  const startOfWeek = dayjs().subtract(6, 'day').format('YYYY-MM-DD');
  return getEntries()
    .filter(e => e.categoryId === categoryId && e.timestamp.slice(0, 10) >= startOfWeek)
    .reduce((sum, e) => sum + (e.totalUnits || e.amount), 0);
}

export function groupEntriesByDate(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const dk = dateKey(entry.timestamp);
    if (!groups.has(dk)) groups.set(dk, []);
    groups.get(dk).push(entry);
  }
  return groups;
}
