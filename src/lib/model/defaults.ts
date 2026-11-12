import type { AppData, Category, ListTemplate } from './types';
import { SCHEMA_VERSION } from './types';

export const OVERIG_ID = 'overig';
export const DEFAULT_END = '2027-02-07';
export const DEFAULT_EXAM = '2027-01-05';
export const DEFAULT_DURATION = 60;
export const ZOOM_LEVELS = [0.8, 1.2, 1.8, 2.6];
export const DEFAULT_ZOOM = 1.2;

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'lessen', name: 'Lessen', color: '#3b82f6' },
  { id: 'werk', name: 'Werk (frituur)', color: '#ea580c' },
  { id: 'fietsen', name: 'Fietsen', color: '#ca8a04' },
  { id: 'persoonlijk', name: 'Persoonlijk', color: '#16a34a', inChecklist: true },
  { id: 'studeren', name: 'Studeren', color: '#8b5cf6', inChecklist: true },
  { id: 'pauze', name: 'Pauze tijdens studeren', color: '#db2777' },
  { id: 'ochtend', name: 'Ochtendroutine', color: '#0d9488' },
  { id: 'unief', name: 'Unief meepakken', color: '#92400e' },
  { id: 'verplaatsing', name: 'Verplaatsing naar campus', color: '#0e7490' },
  { id: 'slapen', name: 'Slapen', color: '#1e3a8a' },
  { id: 'examen', name: 'Examen', color: '#dc2626' },
  { id: OVERIG_ID, name: 'Overig', color: '#6b7280', inChecklist: true },
];

/** Categorieën die in versie 2 bijkwamen (worden bij een update toegevoegd). */
export const NEW_IN_V2 = ['pauze', 'unief', 'verplaatsing', 'slapen'];

export const DEFAULT_LISTS: ListTemplate[] = [
  {
    id: 'ochtendroutine', name: 'Ochtendroutine', minutes: 20, categoryId: 'ochtend',
    items: [
      { text: 'Lenzen aandoen', minutes: 2 },
      { text: 'Tanden poetsen', minutes: 3 },
      { text: 'Pilletjes nemen', minutes: 1 },
      { text: 'Gezicht wassen + Nivea crème', minutes: 1 },
      { text: 'Haar kammen', minutes: 6 },
      { text: 'Kleren aandoen', minutes: 6 },
      { text: 'Parfum/deo opdoen', minutes: 1 },
    ],
  },
  {
    id: 'unief', name: 'Unief meepakken', minutes: 5, categoryId: 'unief',
    items: [
      ...['Laptop in hoes', 'Pennenzak (pen, fluo, tippex, potlood, stylus + oplader, doekje, usb-c stick)', 'Cursusblok',
        'Powerbank + kabel', 'Laptoplader', 'Flesje water', 'Koekje', 'Evt. middageten'].map(text => ({ text, group: 'Boekentas' })),
      ...['Deo', 'Kauwgom', 'Zakdoekjes'].map(text => ({ text, group: 'Voorzakje' })),
      ...['Oortjes', 'Sleutelbos', 'Portefeuille', 'Gsm', 'Evt. kauwgompotje'].map(text => ({ text, group: 'Broekzak' })),
    ],
  },
];

/** @deprecated gebruik data.lists; blijft voor oude imports */
export const LIST_TEMPLATES = DEFAULT_LISTS;

export function defaultData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    categories: DEFAULT_CATEGORIES.map(c => ({ ...c })),
    blocks: [],
    todos: [],
    lists: structuredClone(DEFAULT_LISTS),
    settings: { endDate: DEFAULT_END, examDate: DEFAULT_EXAM, decor: true, counterSort: 'count', zoom: DEFAULT_ZOOM },
  };
}

export function newId(): string {
  const r = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return Date.now().toString(36) + r;
}
