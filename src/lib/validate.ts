import { isDateKey, formatLong } from './time/dates';
import type { DateKey } from './time/dates';
import type { Repeat } from './model/types';

export interface BlockInput {
  title: string;
  date: string;
  start: number | null;
  end: number | null;
}

/** Geeft een Nederlandse foutmelding, of null als alles klopt. */
export function validateBlock(d: BlockInput, endDate: DateKey): string | null {
  if (!d.title.trim()) return 'Vul een titel in.';
  if (!isDateKey(d.date)) return 'Kies een geldige datum.';
  if (d.date > endDate) return `Deze datum valt buiten de planner. De planner loopt tot en met ${formatLong(endDate)}.`;
  if (d.start == null) return 'Vul een geldige starttijd in (bv. 09:30 of 12:01).';
  if (d.end == null) return 'Vul een geldige eindtijd in (bv. 11:00 of 12:01).';
  if (d.start >= 1440) return 'De starttijd moet vóór 24:00 liggen.';
  if (d.end === d.start) return 'Begin en einde zijn gelijk. Pas een van beide aan.';
  if (d.end < d.start) return 'Het einde moet na het begin liggen.';
  if (d.end - d.start > 1440) return 'Een blok kan hoogstens 24 uur duren.';
  return null;
}

export function validateCategoryName(name: string, existing: string[]): string | null {
  const n = name.trim();
  if (!n) return 'Geef de categorie een naam.';
  if (existing.some(e => e.toLowerCase() === n.toLowerCase())) return 'Er bestaat al een categorie met deze naam.';
  return null;
}

export function validateRepeat(r: Repeat, date: string, endDate: DateKey): string | null {
  if (r.kind === 'none') return null;
  if (r.until !== undefined && !isDateKey(r.until)) return 'Kies een geldige einddatum voor de herhaling.';
  if (r.until && r.until < date) return 'De herhaling moet eindigen op of na de eerste keer.';
  if (r.until && r.until > endDate) return `De herhaling kan niet verder lopen dan ${formatLong(endDate)}.`;
  if (r.kind === 'dates' && !(r.dates ?? []).length) return 'Duid in de kalender minstens één extra dag aan.';
  return null;
}

export function validateList(name: string, existing: string[]): string | null {
  const n = name.trim();
  if (!n) return 'Geef de lijst een naam.';
  if (existing.some(e => e.toLowerCase() === n.toLowerCase())) return 'Er bestaat al een lijst met deze naam.';
  return null;
}
