import type { AppData, Block, Category, ChecklistItem, ListTemplate, Repeat, Todo } from './types';
import { SCHEMA_VERSION } from './types';
import {
  DEFAULT_END, DEFAULT_EXAM, OVERIG_ID, DEFAULT_CATEGORIES, DEFAULT_LISTS, DEFAULT_ZOOM, NEW_IN_V2, ZOOM_LEVELS, newId,
} from './defaults';
import { isDateKey } from '../time/dates';
import { parseHm } from '../time/quarter';

export class MigrationError extends Error {}

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);

/**
 * Zet ruwe gegevens (huidige of oudere versie, of een back-up van het prototype) om naar de huidige versie.
 * Gooit MigrationError als de gegevens onbruikbaar zijn; er wordt dan niets overschreven.
 */
export function migrate(input: unknown): AppData {
  if (!isObj(input)) throw new MigrationError('Dit is geen geldig planner-bestand.');
  let v = typeof input.schemaVersion === 'number' ? input.schemaVersion : 0;
  if (v > SCHEMA_VERSION) throw new MigrationError('Dit bestand komt uit een nieuwere versie van de planner.');
  let data: Raw = input;
  while (v < SCHEMA_VERSION) {
    const step = STEPS[v];
    data = step(data);
    v += 1;
  }
  return validate(data);
}

/** v0 = prototype (weekplanner-v2): tijden als "HH:MM", velden cat/recur/src, checklist met done. */
function v0to1(d: Raw): Raw {
  if (!Array.isArray(d.blocks) || !Array.isArray(d.categories)) throw new MigrationError('Dit is geen geldig planner-bestand.');
  const settings = isObj(d.settings) ? d.settings : {};
  const blocks = (d.blocks as unknown[]).filter(isObj).map(b => {
    const start = parseHm(str(b.start)), end = parseHm(str(b.end));
    const checklist = Array.isArray(b.checklist)
      ? (b.checklist as unknown[]).filter(isObj).map(i => ({
          id: str(i.id) || newId(), text: str(i.text),
          ...(typeof i.min === 'number' ? { minutes: i.min } : {}),
          ...(str(i.grp) ? { group: str(i.grp) } : {}),
          _done: !!i.done,
        }))
      : undefined;
    const block: Raw = {
      id: str(b.id) || newId(), title: str(b.title), date: str(b.date), start, end,
      categoryId: str(b.cat, OVERIG_ID), location: str(b.location), notes: str(b.notes),
      repeatWeekly: !!b.recur, source: b.src === 'ics' ? 'ics' : 'manual',
    };
    if (checklist && checklist.length) {
      block.checklist = checklist.map(({ _done, ...rest }) => rest);
      const done = checklist.filter(i => i._done).map(i => i.id);
      if (done.length) block.checks = { [str(b.date)]: done };
    }
    return block;
  });
  const todos = Array.isArray(d.todos) ? (d.todos as unknown[]).filter(isObj).map(t => ({
    id: str(t.id) || newId(), week: str(t.week), text: str(t.text), categoryId: str(t.cat, OVERIG_ID), done: !!t.done,
  })) : [];
  return {
    schemaVersion: 1,
    categories: d.categories,
    blocks,
    todos,
    settings: {
      endDate: DEFAULT_END,
      examDate: isDateKey(settings.examDate) ? settings.examDate : DEFAULT_EXAM,
      decor: settings.accents !== false,
      counterSort: 'count',
    },
  };
}

/**
 * v1 → v2: herhaling uitgebreid (repeatWeekly → repeat), lijsten in de gegevens,
 * nieuwe categorieën (Pauze, Unief meepakken, Verplaatsing, Slapen), afvinklijst, zoom.
 */
function v1to2(d: Raw): Raw {
  if (!Array.isArray(d.blocks) || !Array.isArray(d.categories)) throw new MigrationError('Dit is geen geldig planner-bestand.');
  const categories = (d.categories as unknown[]).filter(isObj).map(c => {
    const def = DEFAULT_CATEGORIES.find(x => x.id === c.id);
    return def?.inChecklist && c.inChecklist === undefined ? { ...c, inChecklist: true } : c;
  });
  // nieuwe standaardcategorieën vóór Examen/Overig invoegen
  for (const id of NEW_IN_V2) {
    if (categories.some(c => c.id === id)) continue;
    const def = DEFAULT_CATEGORIES.find(c => c.id === id)!;
    const at = categories.findIndex(c => c.id === 'examen' || c.id === OVERIG_ID);
    categories.splice(at < 0 ? categories.length : at, 0, { ...def });
  }
  const blocks = (d.blocks as unknown[]).filter(isObj).map(b => {
    const { repeatWeekly, ...rest } = b;
    const out: Raw = { ...rest, repeat: { kind: repeatWeekly ? 'weekly' : 'none' } };
    // eerder ingeplande "Unief meepakken"-lijsten krijgen hun eigen categorie
    if (b.title === 'Unief meepakken' && Array.isArray(b.checklist) && b.categoryId === OVERIG_ID) out.categoryId = 'unief';
    return out;
  });
  return { ...d, schemaVersion: 2, categories, blocks, lists: structuredClone(DEFAULT_LISTS),
    settings: { ...(isObj(d.settings) ? d.settings : {}), zoom: DEFAULT_ZOOM } };
}

const STEPS: Record<number, (d: Raw) => Raw> = { 0: v0to1, 1: v1to2 };

function readRepeat(v: unknown): Repeat {
  if (!isObj(v)) return { kind: 'none' };
  const kinds = ['none', 'daily', 'weekly', 'weekdays', 'dates'] as const;
  const kind = kinds.find(k => k === v.kind) ?? 'none';
  const r: Repeat = { kind };
  if (isDateKey(v.until)) r.until = v.until;
  if (kind === 'weekdays') r.days = Array.isArray(v.days) ? [...new Set(v.days.filter((x): x is number => Number.isInteger(x) && x >= 0 && x <= 6))].sort() : [];
  if (kind === 'dates') r.dates = Array.isArray(v.dates) ? [...new Set(v.dates.filter(isDateKey))].sort() : [];
  return r;
}

function validate(d: Raw): AppData {
  const bad = () => new MigrationError('Dit is geen geldig planner-bestand.');
  if (!Array.isArray(d.categories) || !Array.isArray(d.blocks) || !Array.isArray(d.todos) || !isObj(d.settings)) throw bad();
  const categories: Category[] = (d.categories as unknown[]).filter(isObj)
    .filter(c => str(c.id) && str(c.name))
    .map(c => ({
      id: str(c.id), name: str(c.name), color: /^#[0-9a-f]{6}$/i.test(str(c.color)) ? str(c.color) : '#6b7280',
      ...(typeof c.inChecklist === 'boolean' ? { inChecklist: c.inChecklist } : {}),
    }));
  if (!categories.some(c => c.id === OVERIG_ID)) categories.push({ ...DEFAULT_CATEGORIES.find(c => c.id === OVERIG_ID)! });
  const catIds = new Set(categories.map(c => c.id));
  const blocks: Block[] = [];
  for (const b of (d.blocks as unknown[]).filter(isObj)) {
    const start = b.start, end = b.end;
    if (!isDateKey(b.date) || typeof start !== 'number' || typeof end !== 'number' || end <= start || start < 0 || end > 1440) continue;
    const block: Block = {
      id: str(b.id) || newId(), title: str(b.title) || 'Zonder titel', date: b.date, start, end,
      categoryId: catIds.has(str(b.categoryId)) ? str(b.categoryId) : OVERIG_ID,
      location: str(b.location), notes: str(b.notes), repeat: readRepeat(b.repeat),
      source: b.source === 'ics' ? 'ics' : 'manual',
    };
    if (typeof b.inTodo === 'boolean') block.inTodo = b.inTodo;
    if (Array.isArray(b.done)) block.done = [...new Set(b.done.filter(isDateKey))];
    if (Array.isArray(b.teachers)) block.teachers = (b.teachers as unknown[]).filter((t): t is string => typeof t === 'string');
    if (str(b.icsUid)) block.icsUid = str(b.icsUid);
    if (Array.isArray(b.checklist)) {
      block.checklist = (b.checklist as unknown[]).filter(isObj).map(i => {
        const item: ChecklistItem = { id: str(i.id) || newId(), text: str(i.text) };
        if (typeof i.minutes === 'number') item.minutes = i.minutes;
        if (str(i.group)) item.group = str(i.group);
        return item;
      });
      const checks: Record<string, string[]> = {};
      if (isObj(b.checks)) for (const [k, v] of Object.entries(b.checks)) {
        if (isDateKey(k) && Array.isArray(v)) checks[k] = v.filter((x): x is string => typeof x === 'string');
      }
      block.checks = checks;
    }
    blocks.push(block);
  }
  const todos: Todo[] = (d.todos as unknown[]).filter(isObj).filter(t => isDateKey(t.week) && str(t.text)).map(t => ({
    id: str(t.id) || newId(), week: t.week as string, text: str(t.text),
    categoryId: catIds.has(str(t.categoryId)) ? str(t.categoryId) : OVERIG_ID, done: !!t.done,
  }));
  const lists: ListTemplate[] = (Array.isArray(d.lists) ? (d.lists as unknown[]) : structuredClone(DEFAULT_LISTS) as unknown[])
    .filter(isObj).filter(l => str(l.name) && typeof l.minutes === 'number' && l.minutes >= 5 && l.minutes <= 1440)
    .map(l => ({
      id: str(l.id) || newId(), name: str(l.name), minutes: l.minutes as number,
      categoryId: catIds.has(str(l.categoryId)) ? str(l.categoryId) : OVERIG_ID,
      items: (Array.isArray(l.items) ? (l.items as unknown[]) : []).filter(isObj).filter(i => str(i.text)).map(i => ({
        text: str(i.text),
        ...(typeof i.minutes === 'number' ? { minutes: i.minutes } : {}),
        ...(str(i.group) ? { group: str(i.group) } : {}),
      })),
    }));
  const s = d.settings as Raw;
  return {
    schemaVersion: SCHEMA_VERSION,
    categories, blocks, todos, lists,
    settings: {
      endDate: isDateKey(s.endDate) ? s.endDate : DEFAULT_END,
      examDate: isDateKey(s.examDate) ? s.examDate : DEFAULT_EXAM,
      decor: s.decor !== false,
      counterSort: s.counterSort === 'name' ? 'name' : 'count',
      zoom: ZOOM_LEVELS.includes(s.zoom as number) ? (s.zoom as number) : DEFAULT_ZOOM,
    },
  };
}
