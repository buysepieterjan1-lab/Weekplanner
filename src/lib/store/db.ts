import Dexie, { type Table } from 'dexie';

/** Opslag op het toestel: IndexedDB (via Dexie), met localStorage als terugval. */
export interface Persistence {
  mode: 'indexeddb' | 'localstorage' | 'geheugen';
  load(): Promise<unknown | null>;
  /** synchrone kopie (meteen, nog vóór de asynchrone opslag); geeft een volgnummer terug */
  mirror(data: unknown): number;
  save(data: unknown, seq: number): Promise<void>;
}

const KEY = 'main';
const LS_KEY = 'studieplanner-data';
/** Synchrone kopie: blijft bewaard ook als de app meteen na een wijziging gesloten wordt. */
const MIRROR_KEY = 'studieplanner-kopie';

interface Row { id: string; data: unknown; savedAt?: number }
interface Mirror { savedAt: number; data: unknown }

function writeMirror(data: unknown, savedAt: number) {
  try { localStorage.setItem(MIRROR_KEY, JSON.stringify({ savedAt, data } satisfies Mirror)); } catch { /* vol of geblokkeerd */ }
}
function readMirror(): Mirror | null {
  try {
    const raw = localStorage.getItem(MIRROR_KEY);
    return raw ? (JSON.parse(raw) as Mirror) : null;
  } catch { return null; }
}

class PlannerDb extends Dexie {
  state!: Table<Row, string>;
  constructor() {
    super('studieplanner');
    this.version(1).stores({ state: 'id' });
  }
}

let seq = 0;

async function tryIndexedDb(): Promise<Persistence | null> {
  try {
    if (typeof indexedDB === 'undefined') return null;
    const db = new PlannerDb();
    await db.open();
    return {
      mode: 'indexeddb',
      async load() {
        const row = await db.state.get(KEY);
        const mirror = readMirror();
        seq = Math.max(seq, row?.savedAt ?? 0, mirror?.savedAt ?? 0);
        if (mirror && (!row || (mirror.savedAt ?? 0) > (row.savedAt ?? 0))) return mirror.data;
        return row?.data ?? null;
      },
      mirror(data) {
        seq = Math.max(Date.now(), seq + 1);
        writeMirror(data, seq);
        return seq;
      },
      async save(data, savedAt) {
        await db.state.put({ id: KEY, data, savedAt });
      },
    };
  } catch {
    return null;
  }
}

function tryLocalStorage(): Persistence | null {
  try {
    const t = '__studieplanner_test__';
    localStorage.setItem(t, '1');
    localStorage.removeItem(t);
    return {
      mode: 'localstorage',
      async load() {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? JSON.parse(raw) : null;
      },
      mirror(data) { localStorage.setItem(LS_KEY, JSON.stringify(data)); return 0; },
      async save() { /* al synchroon bewaard in mirror() */ },
    };
  } catch {
    return null;
  }
}

function memory(): Persistence {
  let mem: unknown = null;
  return { mode: 'geheugen', async load() { return mem; }, mirror(d) { mem = d; return 0; }, async save() {} };
}

export async function openPersistence(): Promise<Persistence> {
  return (await tryIndexedDb()) ?? tryLocalStorage() ?? memory();
}
