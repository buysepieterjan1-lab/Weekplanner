import type { Block } from '../model/types';
import { diffDays, type DateKey } from '../time/dates';
import { parseIcsUtc, utcToBrussels } from '../time/tz';
import { parseIcs, IcsError, type IcsEvent } from './parse';

const COURSE = /^([A-Z]\d{6}[A-Z])\.\s*(.+?)(?:\s+(GR\d+))?\s*$/;
const EXAM = /schriftelijke evaluatie|vaardigheidstest|\btest\b|examen/i;
export const HWEEK_NOTE = 'HWeek: week met exameninfo, geen gewone les.';

interface Course { code: string; name: string; group?: string }

export interface ParsedSummary {
  courses: Course[];
  types: string[];
  hweek?: string;
}

export function parseSummary(summary: string): ParsedSummary {
  const parts = summary.split(/\s*,\s*/).map(p => p.trim()).filter(Boolean);
  const courses: Course[] = [];
  const types: string[] = [];
  let hweek: string | undefined;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (/^HWeek\b/i.test(p)) { hweek = parts.slice(i).join(', '); break; }
    const m = COURSE.exec(p);
    if (m) courses.push({ code: m[1], name: m[2].replace(/\s+/g, ' ').trim(), ...(m[3] ? { group: m[3] } : {}) });
    else types.push(p);
  }
  return { courses, types, hweek };
}

export function categoryFor(p: ParsedSummary): 'overig' | 'examen' | 'lessen' {
  if (p.hweek) return 'overig';
  if (EXAM.test(p.types.join(', '))) return 'examen';
  return 'lessen';
}

/** "Lokaal 0.9A. Boekentoren. Campus …" → "Lokaal 0.9A" (+n bij meerdere zalen) */
export function shortLocation(location: string): string {
  const rooms = location.split(/\s*;\s*|\n/).map(s => s.trim()).filter(Boolean);
  if (!rooms.length) return '';
  const first = rooms[0].split(/\.\s/)[0].trim();
  return rooms.length > 1 ? `${first} +${rooms.length - 1}` : first;
}

export interface ImportResult {
  eventCount: number;
  blocks: Block[];
  examCount: number;
}

/**
 * Lees een TimeEdit-export. Gooit IcsError bij een ongeldig bestand, zodat er niets wordt vervangen.
 * Enkel afspraken t/m `endDate` komen erin.
 */
export function importTimeEdit(text: string, endDate: DateKey): ImportResult {
  const events = parseIcs(text);
  if (!events.length) throw new IcsError('Er staan geen afspraken in dit bestand.');
  const parsed = events.map((ev, i) => ({ ev, sum: parseSummary(ev.props.SUMMARY ?? ''), i }));
  // Hoe vaak komt elk vak voor? Bij meerdere vakken in één afspraak kiezen we het vak dat het vaakst voorkomt (= jouw vak).
  const freq = new Map<string, number>();
  for (const p of parsed) for (const code of new Set(p.sum.courses.map(c => c.code))) freq.set(code, (freq.get(code) ?? 0) + 1);

  const blocks: Block[] = [];
  for (const { ev, sum, i } of parsed) {
    const b = toBlock(ev, sum, freq, i);
    if (b.date <= endDate) blocks.push(b);
  }
  return { eventCount: events.length, blocks, examCount: blocks.filter(b => b.categoryId === 'examen').length };
}

function toBlock(ev: IcsEvent, sum: ParsedSummary, freq: Map<string, number>, index: number): Block {
  const p = ev.props;
  const s = parseIcsUtc(p.DTSTART ?? ''), e = parseIcsUtc(p.DTEND ?? '');
  const label = p.SUMMARY ? `"${p.SUMMARY.slice(0, 60)}"` : `nummer ${index + 1}`;
  if (s == null || e == null) throw new IcsError(`Afspraak ${label} heeft geen geldige begin- of eindtijd.`);
  const a = utcToBrussels(s), z = utcToBrussels(e);
  const end = z.minutes + 1440 * diffDays(a.date, z.date);
  if (end <= a.minutes) throw new IcsError(`Afspraak ${label} eindigt vóór het begin.`);
  if (end - a.minutes > 1440) throw new IcsError(`Afspraak ${label} duurt langer dan 24 uur.`);

  let title: string;
  const notes: string[] = [];
  if (sum.hweek) {
    title = sum.hweek;
    notes.push(HWEEK_NOTE);
  } else if (sum.courses.length) {
    const main = [...sum.courses].sort((x, y) => (freq.get(y.code) ?? 0) - (freq.get(x.code) ?? 0))[0];
    title = main.name;
    const groups = [...new Set(sum.courses.filter(c => c.code === main.code && c.group).map(c => c.group!))];
    const line = [sum.types.join(', '), groups.join(', ')].filter(Boolean).join(' · ');
    if (line) notes.push(line);
    const others = [...new Set(sum.courses.filter(c => c.code !== main.code).map(c => c.name))];
    if (others.length) notes.push(`Samen met: ${others.join(', ')}`);
  } else {
    title = sum.types.join(', ') || 'Les';
  }

  const descLines = (p.DESCRIPTION ?? '').split('\n').map(l => l.trim()).filter(Boolean).filter(l => !/^ID \d+$/.test(l));
  const info = descLines.filter(l => /[.!?]$/.test(l));
  const teachers = descLines.filter(l => !/[.!?]$/.test(l));
  notes.push(...info);

  const location = (p.LOCATION ?? '').split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('; ');
  const uid = p.UID ?? `idx-${index}`;
  return {
    id: `ics-${uid}`,
    title, date: a.date, start: a.minutes, end,
    categoryId: categoryFor(sum), location, notes: notes.join('\n'),
    ...(teachers.length ? { teachers } : {}),
    repeat: { kind: 'none' }, source: 'ics', icsUid: uid,
  };
}
