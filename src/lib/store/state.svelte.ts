import type { AppData } from '../model/types';
import { defaultData } from '../model/defaults';
import { migrate, MigrationError } from '../model/migrate';
import { openPersistence, type Persistence } from './db';
import { ui } from './ui.svelte';

/** Centrale gegevens. Elke wijziging loopt via `change()` en wordt meteen opgeslagen. */
class AppStore {
  data = $state<AppData>(defaultData());
  ready = $state(false);
  /** true als opslaan uitgeschakeld is omdat de bestaande gegevens niet gelezen konden worden */
  locked = $state(false);
  mode = $state<Persistence['mode']>('geheugen');
  #p: Persistence | null = null;
  #queue: Promise<void> = Promise.resolve();

  async init(): Promise<void> {
    this.#p = await openPersistence();
    this.mode = this.#p.mode;
    try {
      const raw = await this.#p.load();
      if (raw != null) this.data = migrate(raw);
      else await this.#write();
    } catch (e) {
      // Gegevens niet overschrijven als ze niet gelezen kunnen worden.
      this.locked = true;
      ui.toast(e instanceof MigrationError
        ? `Je opgeslagen gegevens konden niet worden gelezen (${e.message}). Er wordt niets overschreven.`
        : 'Je opgeslagen gegevens konden niet worden gelezen. Er wordt niets overschreven.', 'error');
    }
    this.ready = true;
  }

  change(fn: (d: AppData) => void): void {
    fn(this.data);
    void this.#write();
  }

  replace(d: AppData): void {
    this.data = d;
    this.locked = false;
    void this.#write();
  }

  /** Wacht tot alle schrijfacties klaar zijn. */
  flush(): Promise<void> {
    return this.#queue;
  }

  #write(): Promise<void> {
    if (this.locked || !this.#p) return this.#queue;
    const snap = $state.snapshot(this.data);
    const p = this.#p;
    let seq: number;
    try { seq = p.mirror(snap); } catch {
      ui.toast('Opslaan is mislukt. Exporteer een back-up voor de zekerheid.', 'error');
      return this.#queue;
    }
    this.#queue = this.#queue
      .then(() => p.save(snap, seq))
      .catch(() => ui.toast('Opslaan is mislukt. Exporteer een back-up voor de zekerheid.', 'error'));
    return this.#queue;
  }
}

export const store = new AppStore();
