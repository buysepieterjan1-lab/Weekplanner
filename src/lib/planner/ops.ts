/** Pure bewerkingen op de gegevens. Ze passen `data` ter plaatse aan (ook bruikbaar met Svelte-$state). */
import type { AppData, Block, ListTemplate, Todo } from '../model/types';
import { shiftRepeat } from './occurrences';
import { OVERIG_ID, DEFAULT_DURATION, newId } from '../model/defaults';
import type { DateKey } from '../time/dates';
import { addDays, diffDays } from '../time/dates';
import { placeBlock, clamp, DAY_MINUTES, STEP } from '../time/quarter';

export type BlockFields = Pick<Block, 'title' | 'date' | 'start' | 'end' | 'categoryId' | 'location' | 'notes' | 'repeat'> & { inTodo?: boolean };
const NO_REPEAT = () => ({ kind: 'none' as const });

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
  let repeat = f.repeat;
  if (f.repeat.kind !== 'none' && occurrenceDate && occurrenceDate !== b.date) {
    // een latere keer werd bewerkt: de hele reeks schuift mee
    const shift = diffDays(occurrenceDate, f.date);
    date = addDays(b.date, shift);
    repeat = shiftRepeat(f.repeat, shift);
  }
  const { inTodo, ...rest } = f;
  Object.assign(b, { ...rest, title: f.title.trim(), date, repeat });
  if (inTodo === undefined) delete b.inTodo; else b.inTodo = inTodo;
}

/** Verplaats (een keer van) een blok naar een nieuwe dag/tijd; duur blijft gelijk. */
export function moveBlock(data: AppData, id: string, fromDate: DateKey, toDate: DateKey, start: number): void {
  const b = data.blocks.find(x => x.id === id);
  if (!b) return;
  // start mag negatief zijn of na 24:00 vallen (vervolgstuk van een blok over middernacht verslepen)
  const p = placeBlock(start, b.end - b.start);
  const shift = diffDays(fromDate, toDate) + p.dayShift;
  b.date = addDays(b.date, shift);
  b.repeat = shiftRepeat(b.repeat, shift);
  b.start = p.start;
  b.end = p.end;
}

export function resizeBlock(data: AppData, id: string, end: number): void {
  const b = data.blocks.find(x => x.id === id);
  if (!b) return;
  // een blok duurt minstens één rasterstap en hoogstens 24 uur (mag over middernacht)
  b.end = clamp(end, b.start + STEP, b.start + DAY_MINUTES);
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

/** Een keer van een blok afvinken of terug openzetten. Bij een checklist worden ook alle items mee (af)gevinkt. */
export function toggleDone(data: AppData, id: string, date: DateKey, done: boolean): void {
  const b = data.blocks.find(x => x.id === id);
  if (!b) return;
  const set = new Set(b.done ?? []);
  if (done) set.add(date); else set.delete(date);
  b.done = [...set];
  if (b.checklist?.length) {
    b.checks ??= {};
    b.checks[date] = done ? b.checklist.map(i => i.id) : [];
  }
}

/** `exact`: getypte starttijd niet afronden (bij slepen wordt wel afgerond op het raster). */
export function blockFromTemplate(data: AppData, t: ListTemplate, date: DateKey, start: number, exact = false): Block {
  const p = placeBlock(start, t.minutes, !exact);
  return addBlock(data, {
    title: t.name, date: addDays(date, p.dayShift), start: p.start, end: p.end, categoryId: catOr(data, t.categoryId),
    location: '', notes: '', repeat: NO_REPEAT(),
  }, {
    checklist: t.items.map(i => ({ id: newId(), text: i.text, ...(i.minutes != null ? { minutes: i.minutes } : {}), ...(i.group ? { group: i.group } : {}) })),
    checks: {},
  });
}

/** Taak naar de planner: blok van 1 uur, taak verdwijnt uit de lijst. */
export function blockFromTodo(data: AppData, todoId: string, date: DateKey, start: number, exact = false): Block | null {
  const t = data.todos.find(x => x.id === todoId);
  if (!t) return null;
  const p = placeBlock(start, DEFAULT_DURATION, !exact);
  const b = addBlock(data, {
    title: t.text, date: addDays(date, p.dayShift), start: p.start, end: p.end, categoryId: catOr(data, t.categoryId),
    location: '', notes: '', repeat: NO_REPEAT(),
  }, { inTodo: true });
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
  for (const l of data.lists) if (l.categoryId === id) l.categoryId = OVERIG_ID;
  return true;
}

export type ListFields = Omit<ListTemplate, 'id'>;

/** Tekst met één item per regel omzetten. "Groep: item" maakt een groep. */
export function parseListItems(text: string): ListTemplate['items'] {
  return text.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const m = /^([^:]{1,30}):\s*(.+)$/.exec(line);
    return m ? { group: m[1].trim(), text: m[2].trim() } : { text: line };
  });
}

export function listItemsToText(items: ListTemplate['items']): string {
  return items.map(i => (i.group ? `${i.group}: ${i.text}` : i.text)).join('\n');
}

export function saveList(data: AppData, id: string | null, f: ListFields): ListTemplate {
  const fields = { ...f, name: f.name.trim(), categoryId: catOr(data, f.categoryId) };
  const existing = id ? data.lists.find(l => l.id === id) : undefined;
  if (existing) {
    // minuten per item blijven bewaard als de tekst gelijk blijft
    fields.items = fields.items.map(i => ({ ...existing.items.find(o => o.text === i.text && (o.group ?? '') === (i.group ?? '')), ...i }));
    Object.assign(existing, fields);
    return existing;
  }
  const l: ListTemplate = { id: newId(), ...fields };
  data.lists.push(l);
  return l;
}

export function deleteList(data: AppData, id: string): void {
  data.lists = data.lists.filter(l => l.id !== id);
}

/** Vervang alle eerder geïmporteerde blokken; eigen blokken blijven staan. */
export function replaceImported(data: AppData, imported: Block[]): void {
  data.blocks = data.blocks.filter(b => b.source !== 'ics').concat(imported);
}

function catOr(data: AppData, id: string): string {
  return data.categories.some(c => c.id === id) ? id : OVERIG_ID;
}
