import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { unfold, unescapeText, parseIcs, IcsError } from '../../src/lib/ics/parse';
import { importTimeEdit, parseSummary, shortLocation, HWEEK_NOTE } from '../../src/lib/ics/timeedit';
import { utcToBrussels, parseIcsUtc } from '../../src/lib/time/tz';

const fx = (n: string) => fileURLToPath(new URL(`../fixtures/${n}`, import.meta.url));
const END = '2027-02-07';

const ev = (start: string, end: string, summary: string, extra = '') =>
  `BEGIN:VEVENT\r\nDTSTART:${start}\r\nDTEND:${end}\r\nUID:${start}@t\r\nSUMMARY:${summary}\r\n${extra}END:VEVENT\r\n`;
const cal = (...e: string[]) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${e.join('')}END:VCALENDAR\r\n`;

describe('ICS-basis', () => {
  it('unfold en unescape', () => {
    expect(unfold('A:abc\r\n de\r\n\tf\r\nB:x')).toEqual(['A:abcdef', 'B:x']);
    expect(unescapeText('a\\, b\\; c\\nd\\\\e')).toBe('a, b; c\nd\\e');
  });
  it('weigert een bestand zonder agenda', () => {
    expect(() => parseIcs('hallo')).toThrow(IcsError);
    expect(() => importTimeEdit(cal(), END)).toThrow(/geen afspraken/);
  });
  it('afspraak over middernacht wordt één blok', () => {
    const r = importTimeEdit(cal(ev('20261120T220000Z', '20261121T010000Z', 'F710385A. Economie A\\, nachtles')), END);
    expect(r.blocks[0]).toMatchObject({ date: '2026-11-20', start: 23 * 60, end: 26 * 60 });
  });
  it('weigert de hele import bij een ongeldige afspraak', () => {
    expect(() => importTimeEdit(cal(ev('20261109T080000Z', '20261109T090000Z', 'F710385A. Economie A\\, hoorcollege'), ev('2026-11-10', 'x', 'kapot')), END))
      .toThrow(IcsError);
  });
});

describe('zomer- en wintertijd (Europe/Brussels)', () => {
  it('winter: UTC+1, zomer: UTC+2', () => {
    expect(utcToBrussels(parseIcsUtc('20270105T120000Z')!)).toEqual({ date: '2027-01-05', minutes: 13 * 60 });
    expect(utcToBrussels(parseIcsUtc('20270601T063000Z')!)).toEqual({ date: '2027-06-01', minutes: 8 * 60 + 30 });
  });
  it('rond de wissel op 28 maart 2027', () => {
    expect(utcToBrussels(parseIcsUtc('20270328T005900Z')!).minutes).toBe(1 * 60 + 59);
    expect(utcToBrussels(parseIcsUtc('20270328T010000Z')!).minutes).toBe(3 * 60);
    expect(utcToBrussels(parseIcsUtc('20261025T005900Z')!).minutes).toBe(2 * 60 + 59);
    expect(utcToBrussels(parseIcsUtc('20261025T010000Z')!).minutes).toBe(2 * 60);
  });
  it('UTC-avond wordt de volgende lokale dag', () => {
    expect(utcToBrussels(parseIcsUtc('20261231T233000Z')!)).toEqual({ date: '2027-01-01', minutes: 30 });
  });
  it('import zet tijden juist in winter en zomer', () => {
    const r = importTimeEdit(cal(
      ev('20261109T080000Z', '20261109T093000Z', 'F710385A. Economie A\\, hoorcollege'),
      ev('20270601T063000Z', '20270601T093000Z', 'F710216A. Economie B GR01\\, schriftelijke evaluatie'),
    ), '2027-12-31');
    expect(r.blocks.map(b => [b.date, b.start, b.end])).toEqual([['2026-11-09', 540, 630], ['2027-06-01', 510, 690]]);
  });
});

describe('TimeEdit-mapping', () => {
  it('titel zonder code, groep en type in de notities', () => {
    const r = importTimeEdit(cal(ev('20261109T133000Z', '20261109T153000Z', 'F710255A. Inleiding boekhouden  GR01\\, werkcollege',
      'LOCATION:Auditorium C. Universiteitstraat - Oude Sc\r\n hool. Campus Aula\r\nDESCRIPTION:Docent A \\nDocent B\\nID 1699666\r\n')), END);
    const b = r.blocks[0];
    expect(b).toMatchObject({ title: 'Inleiding boekhouden', categoryId: 'lessen', notes: 'werkcollege · GR01', teachers: ['Docent A', 'Docent B'] });
    expect(b.location).toBe('Auditorium C. Universiteitstraat - Oude School. Campus Aula');
    expect(b.notes).not.toMatch(/1699666/);
  });
  it('HWeek → Overig met eigen titel, ook al staat er "examen" in', () => {
    const s = parseSummary('F710385A. Economie A, hoorcollege, HWeek - Algemene examen infosessie Monitoraat');
    expect(s.hweek).toBe('HWeek - Algemene examen infosessie Monitoraat');
    const r = importTimeEdit(cal(ev('20261110T080000Z', '20261110T090000Z', 'F710385A. Economie A\\, hoorcollege\\, HWeek - Workshops\\, sport en ontspanning 1')), END);
    expect(r.blocks[0]).toMatchObject({ title: 'HWeek - Workshops, sport en ontspanning 1', categoryId: 'overig', notes: HWEEK_NOTE });
  });
  it('examencategorieën', () => {
    for (const t of ['schriftelijke evaluatie', 'vaardigheidstest', 'Test', 'schriftelijke evaluatie met open vragen']) {
      const r = importTimeEdit(cal(ev('20261205T073000Z', '20261205T083000Z', `F710244A. Economisch Frans I\\, ${t}`)), END);
      expect(r.blocks[0].categoryId).toBe('examen');
    }
    const r = importTimeEdit(cal(ev('20261205T073000Z', '20261205T083000Z', 'F710244A. Economisch Frans I\\, Inhaalles')), END);
    expect(r.blocks[0].categoryId).toBe('lessen');
  });
  it('meerdere vakken: het vak dat het vaakst voorkomt wordt de titel', () => {
    const r = importTimeEdit(cal(
      ev('20261116T073000Z', '20261116T083000Z', 'F710243A. Economisch Engels I GR09\\, werkcollege'),
      ev('20261214T073000Z', '20261214T093000Z', 'F710243A. Economisch Engels I\\, F710263A. Engels - niveau I\\, vaardigheidstest'),
      ev('20261214T101500Z', '20261214T113000Z', 'F000390A. Economic English I\\, F710243A. Economisch Engels I\\, vaardigheidstest'),
    ), END);
    expect(r.blocks[1]).toMatchObject({ title: 'Economisch Engels I', categoryId: 'examen', notes: 'vaardigheidstest\nSamen met: Engels - niveau I' });
    expect(r.blocks[2].title).toBe('Economisch Engels I');
  });
  it('korte zaalnaam', () => {
    expect(shortLocation('Auditorium A - Adolphe Quetelet. Tweekerken. Campus Tweekerken')).toBe('Auditorium A - Adolphe Quetelet');
    expect(shortLocation('Lokaal 0.9A. Boekentoren; Lokaal 0.9B. Boekentoren; Lokaal 0.9C. Boekentoren')).toBe('Lokaal 0.9A +2');
    expect(shortLocation('')).toBe('');
  });
});

describe('rooster.ics', () => {
  const file = existsSync(fx('rooster.ics')) ? fx('rooster.ics') : fx('rooster-anon.ics');
  const text = readFileSync(file, 'utf8');
  const r = importTimeEdit(text, END);
  it('213 events, 64 blokken t/m 7 februari 2027, 10 examens', () => {
    expect(r.eventCount).toBe(213);
    expect(r.blocks).toHaveLength(64);
    expect(r.examCount).toBe(10);
  });
  it('geen codes in titels, unieke id\'s, alles binnen de eindgrens', () => {
    expect(r.blocks.every(b => !/[A-Z]\d{6}[A-Z]\./.test(b.title))).toBe(true);
    expect(new Set(r.blocks.map(b => b.id)).size).toBe(64);
    expect(r.blocks.every(b => b.date <= END)).toBe(true);
  });
  it('eerste les: maandag 9 november 09:00–10:30', () => {
    expect(r.blocks[0]).toMatchObject({ title: 'Economie A', date: '2026-11-09', start: 540, end: 630 });
  });
  it('examens tot en met 7 februari', () => {
    const exams = r.blocks.filter(b => b.categoryId === 'examen').map(b => `${b.date} ${b.title}`);
    expect(exams[0]).toBe('2026-12-05 Economisch Frans I');
    expect(exams).toContain('2027-01-05 Wiskunde voor bedrijfskundigen I-A');
    expect(exams.at(-1)).toBe('2027-01-28 Economie A');
  });
  it('alle events tot het einde van het jaar: zomertijd juist', () => {
    const all = importTimeEdit(text, '2099-12-31');
    expect(all.blocks).toHaveLength(213);
    const mens = all.blocks.find(b => b.date === '2027-06-24')!;
    expect(mens.start).toBe(8 * 60 + 30);
  });
});
