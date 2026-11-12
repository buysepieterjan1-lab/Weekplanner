export const DAY_MINUTES = 1440;
export const QUARTER = 15;

const pad = (n: number) => String(n).padStart(2, '0');

export function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v));
}
/** Rond af op het dichtstbijzijnde kwartier. */
export function snap(min: number): number {
  return Math.round(min / QUARTER) * QUARTER;
}
/** Rond een bereik af op kwartieren; minstens één kwartier, binnen de dag. */
export function snapRange(a: number, b: number): { start: number; end: number } {
  const lo = Math.min(a, b), hi = Math.max(a, b);
  const start = clamp(snap(lo), 0, DAY_MINUTES - QUARTER);
  const end = clamp(snap(hi), start + QUARTER, DAY_MINUTES);
  return { start, end };
}
/** Plaats een blok van `dur` minuten zo dicht mogelijk bij `start`, binnen de dag. */
export function placeBlock(start: number, dur: number): { start: number; end: number } {
  const s = clamp(snap(start), 0, DAY_MINUTES - dur);
  return { start: s, end: s + dur };
}
export function hm(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}
export function parseHm(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  if (mi > 59 || h > 24 || (h === 24 && mi !== 0)) return null;
  return h * 60 + mi;
}
/** 90 → "1 uur 30 min", 120 → "2 uur", 45 → "45 min" */
export function formatDuration(m: number): string {
  const h = Math.floor(m / 60), r = m % 60;
  if (!h) return `${r} min`;
  return r ? `${h} uur ${r} min` : `${h} uur`;
}
