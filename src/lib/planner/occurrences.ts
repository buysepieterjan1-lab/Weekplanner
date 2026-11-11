import type { Block } from '../model/types';
import type { DateKey } from '../time/dates';
import { diffDays } from '../time/dates';

export interface Occurrence {
  block: Block;
  /** de datum waarop deze keer valt */
  date: DateKey;
  /** unieke sleutel per keer */
  key: string;
}

/** Valt dit blok (of een herhaling ervan) op deze dag? Herhalingen lopen t/m de eindgrens. */
export function occursOn(b: Block, day: DateKey, endDate: DateKey): boolean {
  if (day > endDate) return false;
  if (b.date === day) return true;
  if (!b.repeatWeekly || day < b.date) return false;
  return diffDays(b.date, day) % 7 === 0;
}

export function occurrencesOn(blocks: Block[], day: DateKey, endDate: DateKey): Occurrence[] {
  const out: Occurrence[] = [];
  for (const b of blocks) if (occursOn(b, day, endDate)) out.push({ block: b, date: day, key: `${b.id}@${day}` });
  return out.sort((a, b) => a.block.start - b.block.start || b.block.end - a.block.end);
}

export function occurrencesIn(blocks: Block[], days: DateKey[], endDate: DateKey): Occurrence[] {
  return days.flatMap(d => occurrencesOn(blocks, d, endDate));
}

/** Aantal afgevinkte items voor één keer. */
export function checklistProgress(b: Block, date: DateKey): { done: number; total: number } {
  const total = b.checklist?.length ?? 0;
  const ids = new Set(b.checks?.[date] ?? []);
  const done = (b.checklist ?? []).filter(i => ids.has(i.id)).length;
  return { done, total };
}
