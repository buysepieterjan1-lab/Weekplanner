import { describe, it, expect } from 'vitest';
import { defaultData, DEFAULT_LISTS } from '../../src/lib/model/defaults';
import {
  addBlock, updateBlock, moveBlock, toggleCheck, toggleDone, blockFromTemplate, blockFromTodo, addTodo, deleteCategory,
  replaceImported, saveList, deleteList, parseListItems, listItemsToText, type BlockFields,
} from '../../src/lib/planner/ops';
import { occurrencesOn, occurrencesIn, checklistProgress, isDone, inChecklist, describeRepeat } from '../../src/lib/planner/occurrences';
import { countByCategory } from '../../src/lib/planner/counter';
import { weekDays } from '../../src/lib/time/dates';
import { validateRepeat } from '../../src/lib/validate';

const END = '2027-02-07';
const base: BlockFields = {
  title: 'Frituur', date: '2026-11-13', start: 1080, end: 1320, categoryId: 'werk', location: '', notes: '', repeat: { kind: 'weekly' },
};
const on = (d: ReturnType<typeof defaultData>, day: string) => occurrencesOn(d.blocks, day, END).length;

describe('herhalende reeksen', () => {
  it('wekelijks vanaf de startdatum tot en met de eindgrens', () => {
    const d = defaultData();
    addBlock(d, base);
    expect(on(d, '2026-11-06')).toBe(0);
    expect(on(d, '2026-11-13')).toBe(1);
    expect(on(d, '2026-11-20')).toBe(1);
    expect(on(d, '2026-11-21')).toBe(0);
    expect(on(d, '2027-02-05')).toBe(1);
    expect(on(d, '2027-02-12')).toBe(0);
  });
  it('elke dag tot een zelfgekozen datum (bv. ochtendroutine tot de blok)', () => {
    const d = defaultData();
    addBlock(d, { ...base, title: 'Ochtendroutine', date: '2026-11-16', start: 420, end: 440, repeat: { kind: 'daily', until: '2026-12-20' } });
    expect(on(d, '2026-11-17')).toBe(1);
    expect(on(d, '2026-11-22')).toBe(1);
    expect(on(d, '2026-12-20')).toBe(1);
    expect(on(d, '2026-12-21')).toBe(0);
    expect(describeRepeat(d.blocks[0], END)).toBe('elke dag t/m 20 december 2026');
  });
  it('gekozen weekdagen (ma–vr)', () => {
    const d = defaultData();
    addBlock(d, { ...base, date: '2026-11-16', repeat: { kind: 'weekdays', days: [0, 1, 2, 3, 4] } });
    expect(weekDays('2026-11-23').map(k => on(d, k))).toEqual([1, 1, 1, 1, 1, 0, 0]);
  });
  it('zelf aangeduide dagen (mini-kalender)', () => {
    const d = defaultData();
    addBlock(d, { ...base, date: '2026-11-16', repeat: { kind: 'dates', dates: ['2026-11-19', '2026-12-02', '2027-03-01'] } });
    expect(['2026-11-16', '2026-11-17', '2026-11-19', '2026-12-02', '2027-03-01'].map(k => on(d, k))).toEqual([1, 0, 1, 1, 0]);
  });
  it('validatie van de herhaling', () => {
    expect(validateRepeat({ kind: 'daily', until: '2026-11-01' }, '2026-11-16', END)).toMatch(/op of na de eerste keer/);
    expect(validateRepeat({ kind: 'dates', dates: [] }, '2026-11-16', END)).toMatch(/minstens één extra dag/);
    expect(validateRepeat({ kind: 'daily', until: '2027-03-01' }, '2026-11-16', END)).toMatch(/niet verder lopen/);
    expect(validateRepeat({ kind: 'weekly' }, '2026-11-16', END)).toBeNull();
  });
  it('een wijziging geldt voor alle herhalingen', () => {
    const d = defaultData();
    const b = addBlock(d, base);
    updateBlock(d, b.id, { ...base, title: 'Frituur (lang)', date: '2026-11-27', end: 1380 }, '2026-11-27');
    expect(d.blocks[0].date).toBe('2026-11-13');
    expect(occurrencesOn(d.blocks, '2026-11-20', END)[0].block).toMatchObject({ title: 'Frituur (lang)', end: 1380 });
  });
  it('een keer naar een andere dag slepen verschuift de hele reeks (ook gekozen weekdagen)', () => {
    const d = defaultData();
    const b = addBlock(d, base);
    moveBlock(d, b.id, '2026-11-27', '2026-11-28', 600);
    expect(d.blocks[0].date).toBe('2026-11-14');
    expect(occurrencesOn(d.blocks, '2026-11-21', END)[0].block.start).toBe(600);
    const w = addBlock(d, { ...base, date: '2026-11-16', repeat: { kind: 'weekdays', days: [0, 2] } });
    moveBlock(d, w.id, '2026-11-18', '2026-11-19', 600);
    expect(d.blocks[1].repeat.days).toEqual([1, 3]);
  });
});

describe('afvinken', () => {
  it('vinkjes van een checklist gelden per keer; alles af = blok af', () => {
    const d = defaultData();
    const b = blockFromTemplate(d, DEFAULT_LISTS[0], '2026-11-16', 420);
    b.repeat = { kind: 'daily' };
    expect(b.end - b.start).toBe(20);
    for (const it of b.checklist!.slice(0, 2)) toggleCheck(d, b.id, '2026-11-16', it.id);
    expect(checklistProgress(b, '2026-11-16')).toEqual({ done: 2, total: 7 });
    expect(checklistProgress(b, '2026-11-17')).toEqual({ done: 0, total: 7 });
    expect(isDone(b, '2026-11-16')).toBe(false);
    for (const it of b.checklist!.slice(2)) toggleCheck(d, b.id, '2026-11-16', it.id);
    expect(isDone(b, '2026-11-16')).toBe(true);
  });
  it('blok afvinken per keer, en terug openzetten', () => {
    const d = defaultData();
    const b = addBlock(d, base);
    toggleDone(d, b.id, '2026-11-20', true);
    expect(isDone(b, '2026-11-20')).toBe(true);
    expect(isDone(b, '2026-11-27')).toBe(false);
    toggleDone(d, b.id, '2026-11-20', false);
    expect(isDone(b, '2026-11-20')).toBe(false);
  });
  it('afvinklijst: Studeren/Persoonlijk/Overig standaard, per blok aan te passen, ingeplande taak altijd', () => {
    const d = defaultData();
    const study = addBlock(d, { ...base, categoryId: 'studeren' });
    const work = addBlock(d, base);
    expect(inChecklist(study, d.categories)).toBe(true);
    expect(inChecklist(work, d.categories)).toBe(false);
    work.inTodo = true;
    expect(inChecklist(work, d.categories)).toBe(true);
    const t = addTodo(d, '2026-11-09', 'Eco A', 'lessen')!;
    expect(inChecklist(blockFromTodo(d, t.id, '2026-11-12', 840)!, d.categories)).toBe(true);
  });
});

describe('overige bewerkingen', () => {
  it('taak naar planner → blok van 1 uur en taak weg', () => {
    const d = defaultData();
    const t = addTodo(d, '2026-11-09', 'Oefeningen wiskunde', 'studeren')!;
    const b = blockFromTodo(d, t.id, '2026-11-12', 847)!;
    expect([b.start, b.end]).toEqual([840, 900]);
    expect(d.todos).toHaveLength(0);
  });
  it('categorie verwijderen → blokken en lijsten naar Overig; Overig niet verwijderbaar', () => {
    const d = defaultData();
    addBlock(d, { ...base, categoryId: 'fietsen' });
    d.lists[0].categoryId = 'fietsen';
    expect(deleteCategory(d, 'fietsen')).toBe(true);
    expect(d.blocks[0].categoryId).toBe('overig');
    expect(d.lists[0].categoryId).toBe('overig');
    expect(deleteCategory(d, 'overig')).toBe(false);
  });
  it('nieuwe categorieën en Unief meepakken heeft een eigen categorie', () => {
    const d = defaultData();
    const names = d.categories.map(c => c.name);
    for (const n of ['Slapen', 'Pauze tijdens studeren', 'Verplaatsing naar campus', 'Unief meepakken']) expect(names).toContain(n);
    expect(d.lists.find(l => l.name === 'Unief meepakken')!.categoryId).toBe('unief');
  });
  it('eigen lijst maken, bewerken en verwijderen', () => {
    const d = defaultData();
    const items = parseListItems('Samenvatting H3\n\nBoekentas: Laptop\n  Oefeningen  ');
    expect(items).toEqual([{ text: 'Samenvatting H3' }, { group: 'Boekentas', text: 'Laptop' }, { text: 'Oefeningen' }]);
    expect(listItemsToText(items)).toBe('Samenvatting H3\nBoekentas: Laptop\nOefeningen');
    const l = saveList(d, null, { name: ' Half uur Eco A ', minutes: 30, categoryId: 'studeren', items: [] });
    expect(d.lists.at(-1)).toMatchObject({ name: 'Half uur Eco A', minutes: 30 });
    saveList(d, l.id, { name: 'Half uur Eco A', minutes: 45, categoryId: 'studeren', items });
    expect(d.lists.at(-1)!.minutes).toBe(45);
    const b = blockFromTemplate(d, d.lists.at(-1)!, '2026-11-16', 600);
    expect([b.start, b.end, b.checklist!.length]).toEqual([600, 645, 3]);
    deleteList(d, l.id);
    expect(d.lists.some(x => x.id === l.id)).toBe(false);
  });
  it('teller telt herhalingen in de zichtbare periode', () => {
    const d = defaultData();
    addBlock(d, base);
    addBlock(d, { ...base, title: 'Fietsen', categoryId: 'fietsen', repeat: { kind: 'none' }, date: '2026-11-17', start: 600, end: 645 });
    const week = countByCategory(d.blocks, d.categories, weekDays('2026-11-16'), END, 'count');
    expect(week.find(r => r.category.id === 'werk')).toMatchObject({ count: 1, minutes: 240 });
    expect(week.find(r => r.category.id === 'fietsen')).toMatchObject({ count: 1, minutes: 45 });
    const byName = countByCategory(d.blocks, d.categories, weekDays('2026-11-16'), END, 'name').map(r => r.category.name);
    expect(byName[0]).toBe('Examen');
    expect(occurrencesIn(d.blocks, weekDays('2027-02-01'), END)).toHaveLength(1);
  });
  it('nieuwe import vervangt enkel geïmporteerde blokken', () => {
    const d = defaultData();
    addBlock(d, base);
    replaceImported(d, [{ ...base, id: 'ics-1', source: 'ics', repeat: { kind: 'none' } }]);
    replaceImported(d, [{ ...base, id: 'ics-2', source: 'ics', repeat: { kind: 'none' } }]);
    expect(d.blocks.map(b => b.id).filter(i => i.startsWith('ics'))).toEqual(['ics-2']);
    expect(d.blocks).toHaveLength(2);
  });
});
