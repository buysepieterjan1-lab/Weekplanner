export class IcsError extends Error {}

export interface IcsEvent {
  /** eigenschap → waarde (ontdaan van escapes); parameters na ';' worden genegeerd */
  props: Record<string, string>;
}

/** Gevouwen regels terug samenvoegen (RFC 5545 §3.1): CRLF/LF gevolgd door spatie of tab. */
export function unfold(text: string): string[] {
  return text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
}

/** Escapes ongedaan maken: \n → nieuwe regel, \, \; \\ → teken zelf. */
export function unescapeText(s: string): string {
  return s.replace(/\\([\\;,nN])/g,(_, c: string) => (c === 'n' || c === 'N' ? '\n' : c));
}

export function parseIcs(text: string): IcsEvent[] {
  const lines = unfold(text.replace(/^﻿/, ''));
  if (!lines.some(l => l.trim() === 'BEGIN:VCALENDAR')) throw new IcsError('Dit is geen .ics-agendabestand.');
  const events: IcsEvent[] = [];
  let cur: Record<string, string> | null = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT') { if (cur) events.push({ props: cur }); cur = null; continue; }
    if (!cur) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const name = line.slice(0, idx).split(';')[0].toUpperCase();
    cur[name] = unescapeText(line.slice(idx + 1));
  }
  if (cur) throw new IcsError('Het bestand is onvolledig (een afspraak wordt niet afgesloten).');
  return events;
}
