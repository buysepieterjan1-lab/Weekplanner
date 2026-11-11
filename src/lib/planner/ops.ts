/** Pure bewerkingen op de gegevens. Ze passen `data` ter plaatse aan (ook bruikbaar met Svelte-$state). */
import type { AppData, Block, ListTemplate, Todo } from '../model/types';
import { OVERIG_ID, DEFAULT_DURATION, newId } from '../model/defaults';
import type { DateKey } from '../time/dates';
import { addDays, diffDays } from '../time/dates';
import { placeBlock, clamp, DAY_MINUTES, QUARTER } from '../time/quarter';

export type BlockFields = Pick<Block, 'title' | 'date' | 'start' | 'end' | 'categoryId' | 'location' | 'notes' | 'repeatWeekly'>;

export function addBlock(data: AppData, f: BlockFields, extra: Partial<Block> = {}): Block {
  const b: Block = { id: newId(), source: 'manual', ...f, title: f.title.trim(), ...extra };
  data.blocks.push(b);
  return b;
}

/**
 * Wijzig een blok. Bij een herhalende reeks geldt de wijziging voor alle herhalingen:
 * een andere datum voor een bepaalde keer verschuift de hele reeks met hetzelfde aantal dagen.
 */
export function updateBlock(data: AppData, id: string, f: BlockFields, occurrenceDate?: DateKey): void {
  const b = data.blocks.find(x => x.id === id);
  if (!b) return;
  let date = f.date;
  if (b.repeatWeekly && occurrenceDate && occurrenceDate !== b.date) {
    date = addDays(b.date, diffDays(occurrenceDate, f.date));
  }
  Object.assign(b, { ...f, title: f.title.trim(), date });
}

/** Verplaats (een keer van) een blok naar een nieuwe dag/tijd; duur blijft gelijk. */
export function moveBlock(data: AppData, id: string, fromDate: DateKey, toDate: DateKey, start: number): void {
  const b = data.blocks.find(x => x.id === id);
  if (!b) return;
  const p = placeBlock(start, b.end - b.start);
  b.date = addDays(b.date, diffDays(fromDate, toDate));
  b.start = p.start;
  b.end = p.end;
}

export function resizeBlock(data: AppData, id: string, end: number): void {
  const b = data.blocks.find(x => x.id === id);
  if (!b) return;
  b.end = clamp(end, b.start + QUARTER, DAY_MINUTES);
}

export function deleteBlock(data: AppData, id: string): void {
  data.blocks = data.blocks.filter(b => b.id !== id);
}

export function toggleCheck(data: AppData, id: string, date: DateKey, itemId: string): void {
  const b = data.blocks.find(x => x.id === id);
  if (!b) return;
  b.checks ??= {};
  const cur = new Set(b.checks[date] ?? []);
  if (cur.has(itemId)) cur.delete(itemId); else cur.add(itemId);
  b.checks[date] = [...cur];
}

export function blockFromTemplate(data: AppData, t: ListTemplate, date: DateKey, start: number): Block {
  const p = placeBlock(start, t.minutes);
  return addBlock(data, {
    title: t.name, date, start: p.start, end: p.end, categoryId: catOr(data, t.categoryId),
    location: '', notes: '', repeatWeekly: false,
  }, {
    checklist: t.items.map(i => ({ id: newId(), text: i.text, ...(i.minutes != null ? { minutes: i.minutes } : {}), ...(i.group ? { group: i.group } : {}) })),
    checks: {},
  });
}

/** Taak naar de planner: blok van 1 uur, taak verdwijnt uit de lijst. */
export function blockFromTodo(data: AppData, todoId: string, date: DateKey, start: number): Block | null {
  const t = data.todos.find(x => x.id === todoId);
  if (!t) return null;
  const p = placeBlock(start, DEFAULT_DURATION);
  const b = addBlock(data, {
    title: t.text, date, start: p.start, end: p.end, categoryId: catOr(data, t.categoryId),
    location: '', notes: '', repeatWeekly: false,
  });
  data.todos = data.todos.filter(x => x.id !== todoId);
  return b;
}

export function addTodo(data: AppData, week: DateKey, text: string, categoryId: string): Todo | null {
  const t = text.trim();
  if (!t) return null;
  const todo: Todo = { id: newId(), week, text: t, categoryId: catOr(data, categoryId), done: false };
  data.todos.push(todo);
  return todo;
}

export function addCategory(data: AppData, name: string, color: string): void {
  data.categories.push({ id: newId(), name: name.trim(), color });
}

export function deleteCategory(data: AppData, id: string): boolean {
  if (id === OVERIG_ID) return false;
  data.categories = data.categories.filter(c => c.id !== id);
  for (const b of data.blocks) if (b.categoryId === id) b.categoryId = OVERIG_ID;
  for (const t of data.todos) if (t.categoryId === id) t.categoryId = OVERIG_ID;
  return true;
}

/** Vervang alle eerder geïmporteerde blokken; eigen blokken blijven staan. */
export function replaceImported(data: AppData, imported: Block[]): void {
  data.blocks = data.blocks.filter(b => b.source !== 'ics').concat(imported);
}

function catOr(data: AppData, id: string): string {
  return data.categories.some(c => c.id === id) ? id : OVERIG_ID;
}
