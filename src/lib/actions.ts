/** Acties die de interface aanroept: wijzigen + opslaan + feedback. */
import { store } from './store/state.svelte';
import { ui } from './store/ui.svelte';
import { moveBlock, resizeBlock, blockFromTemplate, blockFromTodo } from './planner/ops';
import { LIST_TEMPLATES, OVERIG_ID } from './model/defaults';
import type { DragPayload, DropTarget } from '../actions/dnd.svelte';
import { formatLong, type DateKey } from './time/dates';
import { hm, QUARTER, DAY_MINUTES } from './time/quarter';
import type { Category } from './model/types';

export function outOfRange(date: DateKey): boolean {
  return date > store.data.settings.endDate;
}

function rangeError() {
  ui.toast(`Deze datum valt buiten de planner. De planner loopt tot en met ${formatLong(store.data.settings.endDate)}.`, 'error');
}

export function handleDrop(p: DragPayload, t: DropTarget): void {
  if (outOfRange(t.date)) return rangeError();
  if (p.kind === 'block') {
    store.change(d => moveBlock(d, p.blockId, p.fromDate, t.date, t.start));
  } else if (p.kind === 'template') {
    const tpl = LIST_TEMPLATES.find(x => x.id === p.templateId);
    if (tpl) store.change(d => { blockFromTemplate(d, tpl, t.date, t.start); });
  } else {
    store.change(d => { blockFromTodo(d, p.todoId, t.date, t.start); });
  }
}

export function planTemplate(templateId: string, date: DateKey, start: number): boolean {
  if (outOfRange(date)) { rangeError(); return false; }
  handleDrop({ kind: 'template', templateId, duration: 0, title: '' }, { date, start });
  return true;
}

export function planTodo(todoId: string, date: DateKey, start: number): boolean {
  if (outOfRange(date)) { rangeError(); return false; }
  handleDrop({ kind: 'todo', todoId, duration: 60, title: '' }, { date, start });
  return true;
}

export function resize(blockId: string, end: number): void {
  store.change(d => resizeBlock(d, blockId, end));
}

export function categoryOf(id: string): Category {
  const cats = store.data.categories;
  return cats.find(c => c.id === id) ?? cats.find(c => c.id === OVERIG_ID) ?? { id: OVERIG_ID, name: 'Overig', color: '#6b7280' };
}

/** Keuzelijst met kwartieren (00:00 … 24:00). */
export const QUARTER_OPTIONS: { value: number; label: string }[] = Array.from(
  { length: DAY_MINUTES / QUARTER + 1 }, (_, i) => ({ value: i * QUARTER, label: hm(i * QUARTER) }),
);
