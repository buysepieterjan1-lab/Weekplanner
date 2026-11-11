import { isDateKey, formatLong } from './time/dates';
import type { DateKey } from './time/dates';

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
  if (d.start == null || d.end == null) return 'Vul een geldige starttijd en eindtijd in.';
  if (d.end <= d.start) return 'Het einde moet na het begin liggen.';
  return null;
}

export function validateCategoryName(name: string, existing: string[]): string | null {
  const n = name.trim();
  if (!n) return 'Geef de categorie een naam.';
  if (existing.some(e => e.toLowerCase() === n.toLowerCase())) return 'Er bestaat al een categorie met deze naam.';
  return null;
}
