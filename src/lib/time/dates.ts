/** Datums als 'YYYY-MM-DD' (lokale kalenderdag). Rekenwerk via UTC zodat zomer-/wintertijd geen rol speelt. */
export type DateKey = string;

const pad = (n: number) => String(n).padStart(2, '0');
const DAY_MS = 86_400_000;

export const DAYS_SHORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
export const DAYS_LONG = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
export const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

export function isDateKey(s: unknown): s is DateKey {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

function toUtc(k: DateKey): number {
  const [y, m, d] = k.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}
function fromUtc(ms: number): DateKey {
  const t = new Date(ms);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function keyFromDate(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function todayKey(now: Date = new Date()): DateKey {
  return keyFromDate(now);
}
export function addDays(k: DateKey, n: number): DateKey {
  return fromUtc(toUtc(k) + n * DAY_MS);
}
export function diffDays(from: DateKey, to: DateKey): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}
/** 0 = maandag … 6 = zondag */
export function weekday(k: DateKey): number {
  return (new Date(toUtc(k)).getUTCDay() + 6) % 7;
}
export function startOfWeek(k: DateKey): DateKey {
  return addDays(k, -weekday(k));
}
export function weekDays(k: DateKey): DateKey[] {
  const m = startOfWeek(k);
  return Array.from({ length: 7 }, (_, i) => addDays(m, i));
}
export function startOfMonth(k: DateKey): DateKey {
  return k.slice(0, 8) + '01';
}
export function addMonths(k: DateKey, n: number): DateKey {
  const [y, m] = k.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return fromUtc(t.getTime());
}
export function monthDays(k: DateKey): DateKey[] {
  const first = startOfMonth(k);
  const next = addMonths(first, 1);
  const n = diffDays(first, next);
  return Array.from({ length: n }, (_, i) => addDays(first, i));
}
/** 6 weken (42 dagen) vanaf de maandag vóór de eerste dag van de maand. */
export function monthGrid(k: DateKey): DateKey[] {
  const s = startOfWeek(startOfMonth(k));
  return Array.from({ length: 42 }, (_, i) => addDays(s, i));
}
export function isoWeek(k: DateKey): { year: number; week: number } {
  const thursday = addDays(k, 3 - weekday(k));
  const year = Number(thursday.slice(0, 4));
  const week = Math.floor(diffDays(`${year}-01-01`, thursday) / 7) + 1;
  return { year, week };
}
export function dayNumber(k: DateKey): number {
  return Number(k.slice(8, 10));
}
export function monthIndex(k: DateKey): number {
  return Number(k.slice(5, 7)) - 1;
}
export function yearOf(k: DateKey): number {
  return Number(k.slice(0, 4));
}
/** "7 februari 2027" */
export function formatLong(k: DateKey): string {
  return `${dayNumber(k)} ${MONTHS[monthIndex(k)]} ${yearOf(k)}`;
}
/** "zo 7 feb" */
export function formatShort(k: DateKey): string {
  return `${DAYS_SHORT[weekday(k)].toLowerCase()} ${dayNumber(k)} ${MONTHS[monthIndex(k)].slice(0, 3)}`;
}

export type View = 'day' | 'week' | 'month';

export function periodKeys(view: View, cur: DateKey): DateKey[] {
  if (view === 'day') return [cur];
  if (view === 'week') return weekDays(cur);
  return monthDays(cur);
}

export function rangeLabel(view: View, cur: DateKey): string {
  if (view === 'day') return `${DAYS_LONG[weekday(cur)]} ${formatLong(cur)}`;
  if (view === 'week') {
    const days = weekDays(cur);
    const a = days[0], b = days[6];
    const left = monthIndex(a) === monthIndex(b) ? `${dayNumber(a)}` : `${dayNumber(a)} ${MONTHS[monthIndex(a)].slice(0, 3)}`;
    return `Week ${isoWeek(a).week} · ${left} – ${dayNumber(b)} ${MONTHS[monthIndex(b)].slice(0, 3)} ${yearOf(b)}`;
  }
  const s = MONTHS[monthIndex(cur)];
  return `${s[0].toUpperCase()}${s.slice(1)} ${yearOf(cur)}`;
}

/** Eerste dag van de volgende periode. */
export function stepKey(view: View, cur: DateKey, n: number): DateKey {
  if (view === 'day') return addDays(cur, n);
  if (view === 'week') return addDays(cur, 7 * n);
  return addMonths(cur, n);
}

/** Kan je vanuit deze periode nog vooruit zonder voorbij de eindgrens te gaan? */
export function canGoNext(view: View, cur: DateKey, endDate: DateKey): boolean {
  const next = stepKey(view, cur, 1);
  const first = view === 'week' ? startOfWeek(next) : view === 'month' ? startOfMonth(next) : next;
  return first <= endDate;
}

/** Houd de huidige datum binnen de eindgrens. */
export function clampToEnd(k: DateKey, endDate: DateKey): DateKey {
  return k > endDate ? endDate : k;
}

export function daysUntil(from: DateKey, to: DateKey): number {
  return diffDays(from, to);
}
