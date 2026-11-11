import { describe, it, expect } from 'vitest';
import { defaultData } from '../../src/lib/model/defaults';
import { addBlock, updateBlock, moveBlock, toggleCheck, blockFromTemplate, blockFromTodo, addTodo, deleteCategory, replaceImported } from '../../src/lib/planner/ops';
import { occurrencesOn, occurrencesIn, checklistProgress } from '../../src/lib/planner/occurrences';
import { countByCategory } from '../../src/lib/planner/counter';
import { LIST_TEMPLATES } from '../../src/lib/model/defaults';
import { weekDays } from '../../src/lib/time/dates';

const END = '2027-02-07';
const base = { title: 'Frituur', date: '2026-11-13', start: 1080, end: 1320, categoryId: 'werk', location: '', notes: '', repeatWeekly: true };

describe('herhalende reeksen', () => {
  it('herhaalt wekelijks vanaf de startdatum tot en met de eindgrens', () => {
    const d = defaultData();
    addBlock(d, base);
    expect(occurrencesOn(d.blocks, '2026-11-06', END)).toHaveLength(0);
    expect(occurrencesOn(d.blocks, '2026-11-13', END)).toHaveLength(1);
    expect(occurrencesOn(d.blocks, '2026-11-20', END)).toHaveLength(1);
    expect(occurrencesOn(d.blocks, '2026-11-21', END)).toHaveLength(0);
    expect(occurrencesOn(d.blocks, '2027-02-05', END)).toHaveLength(1);
    expect(occurrencesOn(d.blocks, '2027-02-12', END)).toHaveLength(0);
  });
  it('een wijziging geldt voor alle herhalingen', () => {
    const d = defaultData();
    const b = addBlock(d, base);
    updateBlock(d, b.id, { ...base, title: 'Frituur (lang)', date: '2026-11-27', end: 1380 }, '2026-11-27');
    expect(d.blocks[0].date).toBe('2026-11-13');
    expect(occurrencesOn(d.blocks, '2026-11-20', END)[0].block.title).toBe('Frituur (lang)');
    expect(occurrencesOn(d.blocks, '2026-11-20', END)[0].block.end).toBe(1380);
  });
  it('een keer naar een andere dag slepen verschuift de hele reeks', () => {
    const d = defaultData();
    const b = addBlock(d, base);
    moveBlock(d, b.id, '2026-11-27', '2026-11-28', 600);
    expect(d.blocks[0].date).toBe('2026-11-14');
    expect(occurrencesOn(d.blocks, '2026-11-21', END)[0].block.start).toBe(600);
    expect(occurrencesOn(d.blocks, '2026-11-20', END)).toHaveLength(0);
  });
  it('vinkjes gelden per keer', () => {
    const d = defaultData();
    const b = blockFromTemplate(d, LIST_TEMPLATES[0], '2026-11-16', 420);
    b.repeatWeekly = true;
    expect(b.end - b.start).toBe(20);
    toggleCheck(d, b.id, '2026-11-16', b.checklist![0].id);
    toggleCheck(d, b.id, '2026-11-16', b.checklist![1].id);
    expect(checklistProgress(b, '2026-11-16')).toEqual({ done: 2, total: 7 });
    expect(checklistProgress(b, '2026-11-23')).toEqual({ done: 0, total: 7 });
    toggleCheck(d, b.id, '2026-11-16', b.checklist![1].id);
    expect(checklistProgress(b, '2026-11-16').done).toBe(1);
  });
  it('taak naar planner → blok van 1 uur en taak weg', () => {
    const d = defaultData();
    const t = addTodo(d, '2026-11-09', 'Oefeningen wiskunde', 'studeren')!;
    const b = blockFromTodo(d, t.id, '2026-11-12', 847)!;
    expect([b.start, b.end]).toEqual([840, 900]);
    expect(d.todos).toHaveLength(0);
  });
  it('categorie verwijderen → blokken naar Overig; Overig niet verwijderbaar', () => {
    const d = defaultData();
    addBlock(d, { ...base, categoryId: 'fietsen' });
    expect(deleteCategory(d, 'fietsen')).toBe(true);
    expect(d.blocks[0].categoryId).toBe('overig');
    expect(deleteCategory(d, 'overig')).toBe(false);
  });
  it('teller telt herhalingen in de zichtbare periode', () => {
    const d = defaultData();
    addBlock(d, base);
    addBlock(d, { ...base, title: 'Fietsen', categoryId: 'fietsen', repeatWeekly: false, date: '2026-11-17', start: 600, end: 645 });
    const week = countByCategory(d.blocks, d.categories, weekDays('2026-11-16'), END, 'count');
    expect(week[0]).toMatchObject({ count: 1 });
    expect(week.find(r => r.category.id === 'werk')).toMatchObject({ count: 1, minutes: 240 });
    expect(week.find(r => r.category.id === 'fietsen')).toMatchObject({ count: 1, minutes: 45 });
    const byName = countByCategory(d.blocks, d.categories, weekDays('2026-11-16'), END, 'name').map(r => r.category.name);
    expect(byName[0]).toBe('Examen');
    expect(occurrencesIn(d.blocks, weekDays('2027-02-01'), END)).toHaveLength(1);
  });
  it('nieuwe import vervangt enkel geïmporteerde blokken', () => {
    const d = defaultData();
    addBlock(d, base);
    replaceImported(d, [{ ...base, id: 'ics-1', source: 'ics', repeatWeekly: false }]);
    replaceImported(d, [{ ...base, id: 'ics-2', source: 'ics', repeatWeekly: false }]);
    expect(d.blocks.map(b => b.id).filter(i => i.startsWith('ics'))).toEqual(['ics-2']);
    expect(d.blocks).toHaveLength(2);
  });
});
