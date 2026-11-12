/** Tijden in minuten sinds middernacht. Het raster werkt per 10 minuten; getypte tijden mogen elke minuut zijn. */
export const DAY_MINUTES = 1440;
/** rasterstap in minuten (slepen, afronden, pijltjestoetsen) */
export const STEP = 10;

const pad = (n: number) => String(n).padStart(2, '0');

export function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v));
}
/** Rond af op de dichtstbijzijnde rasterstap (10 minuten). */
export function snap(min: number): number {
  return Math.round(min / STEP) * STEP;
}
/** Rond een gesleept bereik binnen één dag af; minstens één stap lang. */
export function snapRange(a: number, b: number): { start: number; end: number } {
  const lo = Math.min(a, b), hi = Math.max(a, b);
  const start = clamp(snap(lo), 0, DAY_MINUTES - STEP);
  const end = clamp(snap(hi), start + STEP, DAY_MINUTES);
  return { start, end };
}
/**
 * Plaats een blok van `dur` minuten op (afgerond) `start`. Een start vóór middernacht of na 24:00
 * schuift naar de vorige/volgende dag (`dayShift`); het einde mag over middernacht lopen.
 */
export function placeBlock(start: number, dur: number, round = true): { start: number; end: number; dayShift: number } {
  const s = round ? snap(start) : Math.round(start);
  const dayShift = Math.floor(s / DAY_MINUTES);
  const st = s - dayShift * DAY_MINUTES;
  return { start: st, end: st + dur, dayShift };
}
/** 420 → "07:00"; 1440 → "24:00"; 1500 → "01:00" (volgende dag) */
export function hm(min: number): string {
  const m = min > DAY_MINUTES ? min - DAY_MINUTES : min;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}
/** Loopt dit blok over middernacht? */
export function overnight(end: number): boolean {
  return end > DAY_MINUTES;
}
/** Strikt "HH:MM" (ook 24:00). */
export function parseHm(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  if (mi > 59 || h > 24 || (h === 24 && mi !== 0)) return null;
  return h * 60 + mi;
}
/**
 * Vrij getypte tijd: "12:01", "12.01", "12u01", "12h01", "1201", "930", "9", "9u".
 * Geeft null bij een ongeldige tijd.
 */
export function parseTime(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, '');
  if (!s) return null;
  let h: number, mi: number;
  let m = /^(\d{1,2})[:.uh](\d{1,2})?$/.exec(s);
  if (m) {
    h = Number(m[1]);
    mi = m[2] === undefined ? 0 : Number(m[2]);
    if (m[2] !== undefined && m[2].length === 1) mi *= 10; // "9:3" → 9:30
  } else if ((m = /^(\d{1,4})$/.exec(s))) {
    const d = m[1];
    if (d.length <= 2) { h = Number(d); mi = 0; }
    else { h = Number(d.slice(0, d.length - 2)); mi = Number(d.slice(-2)); }
  } else return null;
  if (mi > 59 || h > 24 || (h === 24 && mi !== 0)) return null;
  return h * 60 + mi;
}
/**
 * Einde ten opzichte van het begin: ligt de getypte eindtijd op of vóór de starttijd,
 * dan bedoel je de volgende dag (bv. slapen 23:00 → 07:00).
 */
export function resolveEnd(start: number, end: number): number {
  if (end === DAY_MINUTES) return end;
  return end <= start ? end + DAY_MINUTES : end;
}
/** 90 → "1 uur 30 min", 120 → "2 uur", 45 → "45 min" */
export function formatDuration(m: number): string {
  const h = Math.floor(m / 60), r = m % 60;
  if (!h) return `${r} min`;
  return r ? `${h} uur ${r} min` : `${h} uur`;
}
