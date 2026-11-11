import type { DateKey } from './dates';

export const ZONE = 'Europe/Brussels';

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

/** Zet een UTC-moment om naar lokale Brusselse datum + minuten sinds middernacht (zomer-/wintertijd inbegrepen). */
export function utcToBrussels(ms: number): { date: DateKey; minutes: number } {
  const parts = fmt.formatToParts(new Date(ms));
  const g = (t: string) => parts.find(p => p.type === t)!.value;
  return { date: `${g('year')}-${g('month')}-${g('day')}`, minutes: Number(g('hour')) * 60 + Number(g('minute')) };
}

/** Parse een ICS-datum in UTC-vorm (20261109T080000Z). Geeft null bij een ander formaat. */
export function parseIcsUtc(v: string): number | null {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(v.trim());
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
}
