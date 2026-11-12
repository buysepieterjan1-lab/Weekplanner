import type { DateKey } from '../time/dates';

export const SCHEMA_VERSION = 3;

export interface Category {
  id: string;
  name: string;
  color: string;
  /** blokken van deze categorie komen standaard in de afvinklijst */
  inChecklist?: boolean;
}

export interface ChecklistItem {
  id: string;
  text: string;
  minutes?: number;
  group?: string;
}

/**
 * Herhaling. De eerste keer is altijd `block.date`.
 * - daily: elke dag
 * - weekly: elke week op dezelfde weekdag als de eerste keer
 * - weekdays: op de gekozen weekdagen (0 = maandag … 6 = zondag)
 * - dates: op zelf gekozen datums (mini-kalender)
 */
export type RepeatKind = 'none' | 'daily' | 'weekly' | 'weekdays' | 'dates';

export interface Repeat {
  kind: RepeatKind;
  /** laatste dag (t/m); zonder waarde: tot de eindgrens */
  until?: DateKey;
  days?: number[];
  dates?: DateKey[];
}

export interface Block {
  id: string;
  title: string;
  date: DateKey;
  /** minuten sinds middernacht van `date` */
  start: number;
  /** minuten sinds middernacht van `date`; meer dan 1440 = loopt over middernacht (max. 24 uur na het begin) */
  end: number;
  categoryId: string;
  location: string;
  notes: string;
  teachers?: string[];
  repeat: Repeat;
  source: 'manual' | 'ics';
  icsUid?: string;
  checklist?: ChecklistItem[];
  /** afgevinkte checklist-items per datum (per keer bij herhaling) */
  checks?: Record<DateKey, string[]>;
  /** datums waarop dit blok afgevinkt is */
  done?: DateKey[];
  /** expliciet wel/niet in de afvinklijst; zonder waarde geldt de categorie */
  inTodo?: boolean;
}

export interface Todo {
  id: string;
  /** maandag van de week */
  week: DateKey;
  text: string;
  categoryId: string;
  done: boolean;
}

export interface ListTemplate {
  id: string;
  name: string;
  minutes: number;
  categoryId: string;
  items: { text: string; minutes?: number; group?: string }[];
}

export interface Settings {
  endDate: DateKey;
  examDate: DateKey;
  decor: boolean;
  counterSort: 'count' | 'name';
  /** pixels per minuut in het raster */
  zoom: number;
}

export interface AppData {
  schemaVersion: number;
  categories: Category[];
  blocks: Block[];
  todos: Todo[];
  lists: ListTemplate[];
  settings: Settings;
}
