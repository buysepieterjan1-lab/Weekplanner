import type { DateKey, View } from '../time/dates';
import { todayKey } from '../time/dates';
import type { ListTemplate } from '../model/types';

export interface BlockDraft {
  date: DateKey;
  start: number;
  end: number;
}

export type Dialog =
  | { kind: 'none' }
  | { kind: 'block'; blockId: string | null; occurrenceDate?: DateKey; draft?: BlockDraft }
  | { kind: 'checklist'; blockId: string; date: DateKey }
  | { kind: 'list'; template: ListTemplate }
  | { kind: 'listEdit'; listId: string | null }
  | { kind: 'plan'; todoId: string }
  | { kind: 'settings' };

export interface Toast { id: number; text: string; tone: 'info' | 'error' }

class UiState {
  view = $state<View>('week');
  current = $state<DateKey>(todayKey());
  mobile = $state(false);
  drawerOpen = $state(false);
  /** tijdens slepen vanuit de lade wordt die even verborgen zodat de planner zichtbaar is */
  drawerPeek = $state(false);
  dialog = $state<Dialog>({ kind: 'none' });
  toasts = $state<Toast[]>([]);
  confirmState = $state<{ text: string; ok: string; resolve: (v: boolean) => void } | null>(null);
  #n = 0;

  open(d: Dialog) { this.dialog = d; }
  close() { this.dialog = { kind: 'none' }; }

  toast(text: string, tone: Toast['tone'] = 'info') {
    const id = ++this.#n;
    this.toasts.push({ id, text, tone });
    setTimeout(() => { this.toasts = this.toasts.filter(t => t.id !== id); }, tone === 'error' ? 8000 : 4000);
  }

  /** Eigen bevestigingsvenster (window.confirm wordt in ingesloten vensters vaak geblokkeerd). */
  confirm(text: string, ok = 'Verwijderen'): Promise<boolean> {
    return new Promise(resolve => { this.confirmState = { text, ok, resolve }; });
  }
}

export const ui = new UiState();
