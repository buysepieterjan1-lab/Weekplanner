import type { Block, Category, Repeat } from '../model/types';
import type { DateKey } from '../time/dates';
import { diffDays, weekday, addDays, formatLong, DAYS_SHORT } from '../time/dates';

export interface Occurrence {
  block: Block;
  /** de datum waarop deze keer begint */
  date: DateKey;
  /** unieke sleutel per keer */
  key: string;
}

/** Het stuk van een keer dat op één dag zichtbaar is (een blok over middernacht heeft er twee). */
export interface Segment extends Occurrence {
  /** minuten op de getoonde dag */
  segStart: number;
  segEnd: number;
  /** dit stuk loopt verder na middernacht */
  continuesNext: boolean;
  /** dit stuk is het vervolg van de vorige dag */
  fromPrev: boolean;
}

export function isRepeating(b: Block): boolean {
  return b.repeat.kind !== 'none';
}

/** Valt dit blok (of een herhaling ervan) op deze dag? Herhalingen lopen t/m `until` en nooit voorbij de eindgrens. */
export function occursOn(b: Block, day: DateKey, endDate: DateKey): boolean {
  if (day > endDate) return false;
  if (b.date === day) return true;
  const r = b.repeat;
  if (r.kind === 'none' || day < b.date) return false;
  if (r.until && day > r.until) return false;
  switch (r.kind) {
    case 'daily': return true;
    case 'weekly': return diffDays(b.date, day) % 7 === 0;
    case 'weekdays': return (r.days ?? []).includes(weekday(day));
    case 'dates': return (r.dates ?? []).includes(day);
  }
}

export function occurrencesOn(blocks: Block[], day: DateKey, endDate: DateKey): Occurrence[] {
  const out: Occurrence[] = [];
  for (const b of blocks) if (occursOn(b, day, endDate)) out.push({ block: b, date: day, key: `${b.id}@${day}` });
  return out.sort((a, b) => a.block.start - b.block.start || b.block.end - a.block.end);
}

/**
 * Alles wat op een dag te zien is: blokken die die dag beginnen (tot middernacht)
 * en het vervolg van blokken die de vorige dag over middernacht begonnen.
 */
export function segmentsOn(blocks: Block[], day: DateKey, endDate: DateKey): Segment[] {
  const out: Segment[] = [];
  if (day > endDate) return out;
  for (const o of occurrencesOn(blocks, day, endDate)) {
    const over = o.block.end > 1440;
    out.push({ ...o, segStart: o.block.start, segEnd: Math.min(o.block.end, 1440), continuesNext: over, fromPrev: false });
  }
  const prev = addDays(day, -1);
  for (const o of occurrencesOn(blocks, prev, endDate)) {
    if (o.block.end <= 1440) continue;
    out.push({ ...o, key: `${o.key}+`, segStart: 0, segEnd: o.block.end - 1440, continuesNext: false, fromPrev: true });
  }
  return out.sort((a, b) => a.segStart - b.segStart || b.segEnd - a.segEnd);
}

export function occurrencesIn(blocks: Block[], days: DateKey[], endDate: DateKey): Occurrence[] {
  return days.flatMap(d => occurrencesOn(blocks, d, endDate));
}

/** Verschuif een herhaling mee als de eerste keer een aantal dagen verschuift. */
export function shiftRepeat(r: Repeat, days: number): Repeat {
  if (!days) return r;
  const out: Repeat = { ...r };
  if (r.kind === 'weekdays') out.days = (r.days ?? []).map(d => (((d + days) % 7) + 7) % 7).sort();
  if (r.kind === 'dates') out.dates = (r.dates ?? []).map(d => addDays(d, days)).sort();
  return out;
}

/** Korte omschrijving, bv. "elke dag t/m 7 februari 2027". */
export function describeRepeat(b: Block, endDate: DateKey): string {
  const r = b.repeat;
  const until = `t/m ${formatLong(r.until && r.until < endDate ? r.until : endDate)}`;
  switch (r.kind) {
    case 'none': return '';
    case 'daily': return `elke dag ${until}`;
    case 'weekly': return `elke ${['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'][weekday(b.date)]} ${until}`;
    case 'weekdays': return `op ${(r.days ?? []).map(d => DAYS_SHORT[d].toLowerCase()).join(', ')} ${until}`;
    case 'dates': return `op ${(r.dates?.length ?? 0) + 1} gekozen dagen`;
  }
}

/** Aantal afgevinkte checklist-items voor één keer. */
export function checklistProgress(b: Block, date: DateKey): { done: number; total: number } {
  const total = b.checklist?.length ?? 0;
  const ids = new Set(b.checks?.[date] ?? []);
  const done = (b.checklist ?? []).filter(i => ids.has(i.id)).length;
  return { done, total };
}

/** Is deze keer afgewerkt? Handmatig afgevinkt, of de hele checklist is afgevinkt. */
export function isDone(b: Block, date: DateKey): boolean {
  if (b.done?.includes(date)) return true;
  const p = checklistProgress(b, date);
  return p.total > 0 && p.done === p.total;
}

/** Hoort dit blok in de afvinklijst? Eigen keuze bij het blok, anders de instelling van de categorie. */
export function inChecklist(b: Block, categories: Category[]): boolean {
  if (typeof b.inTodo === 'boolean') return b.inTodo;
  return categories.find(c => c.id === b.categoryId)?.inChecklist ?? false;
}
