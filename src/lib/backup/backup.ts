import type { AppData } from '../model/types';
import { migrate, MigrationError } from '../model/migrate';

export function exportJson(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

/** Lees een back-up. Gooit een fout met Nederlandse uitleg als het bestand niet bruikbaar is. */
export function importJson(text: string): AppData {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new MigrationError('Dit bestand is geen geldige JSON-back-up.'); }
  return migrate(raw);
}

export function backupFileName(today: string): string {
  return `studieplanner-backup-${today}.json`;
}
