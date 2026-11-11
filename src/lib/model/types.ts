import type { DateKey } from '../time/dates';

export const SCHEMA_VERSION = 1;

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  minutes?: number;
  group?: string;
}

export interface Block {
  id: string;
  title: string;
  date: DateKey;
  /** minuten sinds middernacht */
  start: number;
  end: number;
  categoryId: string;
  location: string;
  notes: string;
  teachers?: string[];
  repeatWeekly: boolean;
  source: 'manual' | 'ics';
  icsUid?: string;
  checklist?: ChecklistItem[];
  /** afgevinkte item-id's per datum (per keer bij herhaling) */
  checks?: Record<DateKey, string[]>;
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
}

export interface AppData {
  schemaVersion: number;
  categories: Category[];
  blocks: Block[];
  todos: Todo[];
  settings: Settings;
}
