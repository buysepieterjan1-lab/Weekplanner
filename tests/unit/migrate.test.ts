import { describe, it, expect } from 'vitest';
import { migrate, MigrationError } from '../../src/lib/model/migrate';
import { defaultData } from '../../src/lib/model/defaults';
import { exportJson, importJson } from '../../src/lib/backup/backup';
import { validateBlock } from '../../src/lib/validate';

describe('migratie en back-up', () => {
  it('huidige versie blijft ongewijzigd', () => {
    const d = defaultData();
    expect(importJson(exportJson(d))).toEqual(d);
  });
  it('back-up van het prototype (v0) wordt omgezet zonder verlies', () => {
    const v0 = {
      categories: [{ id: 'lessen', name: 'Lessen', color: '#3b82f6' }, { id: 'overig', name: 'Overig', color: '#9ca3af' }],
      blocks: [{ id: 'x', title: 'Ochtendroutine', date: '2026-11-12', start: '07:00', end: '07:20', cat: 'ochtend', location: '', notes: '', recur: true,
        checklist: [{ id: 'i1', text: 'Lenzen', min: 2, grp: '', done: true }] }],
      todos: [{ id: 't', text: 'Boek', cat: 'lessen', done: false, week: '2026-11-09' }],
      settings: { accents: false, examDate: '2027-01-06' },
    };
    const d = migrate(v0);
    expect(d.schemaVersion).toBe(2);
    expect(d.blocks[0]).toMatchObject({ start: 420, end: 440, repeat: { kind: 'weekly' }, categoryId: 'overig', checks: { '2026-11-12': ['i1'] } });
    expect(d.settings).toMatchObject({ decor: false, examDate: '2027-01-06', endDate: '2027-02-07' });
    expect(d.todos[0]).toMatchObject({ categoryId: 'lessen', week: '2026-11-09' });
  });
  it('versie 1 → 2: herhaling, nieuwe categorieën, lijsten, Unief meepakken eigen categorie', () => {
    const v1 = {
      schemaVersion: 1,
      categories: [
        { id: 'lessen', name: 'Lessen', color: '#3b82f6' }, { id: 'studeren', name: 'Studeren', color: '#8b5cf6' },
        { id: 'eigen', name: 'Gitaar', color: '#000000' },
        { id: 'examen', name: 'Examen', color: '#dc2626' }, { id: 'overig', name: 'Overig', color: '#6b7280' },
      ],
      blocks: [
        { id: 'a', title: 'Frituur', date: '2026-11-13', start: 1080, end: 1320, categoryId: 'eigen', location: '', notes: '', repeatWeekly: true, source: 'manual' },
        { id: 'b', title: 'Unief meepakken', date: '2026-11-13', start: 480, end: 485, categoryId: 'overig', location: '', notes: '', repeatWeekly: false, source: 'manual',
          checklist: [{ id: 'x', text: 'Laptop' }], checks: {} },
      ],
      todos: [],
      settings: { endDate: '2027-02-07', examDate: '2027-01-05', decor: true, counterSort: 'name' },
    };
    const d = migrate(v1);
    expect(d.schemaVersion).toBe(2);
    expect(d.blocks[0]).toMatchObject({ repeat: { kind: 'weekly' }, categoryId: 'eigen' });
    expect(d.blocks[0]).not.toHaveProperty('repeatWeekly');
    expect(d.blocks[1].categoryId).toBe('unief');
    expect(d.categories.map(c => c.id)).toEqual(['lessen', 'studeren', 'eigen', 'pauze', 'unief', 'verplaatsing', 'slapen', 'examen', 'overig']);
    expect(d.categories.find(c => c.id === 'studeren')!.inChecklist).toBe(true);
    expect(d.categories.find(c => c.name === 'Gitaar')!.inChecklist).toBeUndefined();
    expect(d.lists.map(l => l.name)).toEqual(['Ochtendroutine', 'Unief meepakken']);
    expect(d.settings).toMatchObject({ counterSort: 'name', zoom: 1.2 });
  });
  it('weigert onbruikbare of nieuwere bestanden', () => {
    expect(() => importJson('{kapot')).toThrow(MigrationError);
    expect(() => migrate({ schemaVersion: 99 })).toThrow(/nieuwere versie/);
    expect(() => migrate([])).toThrow(MigrationError);
  });
  it('Overig wordt altijd toegevoegd', () => {
    const d = defaultData();
    d.categories = d.categories.filter(c => c.id !== 'overig');
    expect(migrate(d).categories.some(c => c.id === 'overig')).toBe(true);
  });
});

describe('validatiemeldingen', () => {
  const ok = { title: 'Les', date: '2026-11-12', start: 600, end: 660 };
  it('Nederlandse meldingen', () => {
    expect(validateBlock(ok, '2027-02-07')).toBeNull();
    expect(validateBlock({ ...ok, title: '  ' }, '2027-02-07')).toBe('Vul een titel in.');
    expect(validateBlock({ ...ok, end: 600 }, '2027-02-07')).toBe('Het einde moet na het begin liggen.');
    expect(validateBlock({ ...ok, date: '2027-02-08' }, '2027-02-07')).toMatch(/buiten de planner.*7 februari 2027/);
    expect(validateBlock({ ...ok, date: '' }, '2027-02-07')).toBe('Kies een geldige datum.');
  });
});
