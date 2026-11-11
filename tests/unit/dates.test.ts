import { describe, it, expect } from 'vitest';
import { addDays, isoWeek, weekday, startOfWeek, canGoNext, clampToEnd, rangeLabel, monthGrid, isDateKey, diffDays, stepKey } from '../../src/lib/time/dates';

describe('datums', () => {
  it('weekdag en weekstart (maandag)', () => {
    expect(weekday('2026-11-09')).toBe(0);
    expect(weekday('2027-02-07')).toBe(6);
    expect(startOfWeek('2027-02-07')).toBe('2027-02-01');
  });
  it('rekent over zomertijdwissel zonder fouten', () => {
    expect(addDays('2027-03-27', 1)).toBe('2027-03-28');
    expect(addDays('2027-03-28', 1)).toBe('2027-03-29');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(diffDays('2027-03-01', '2027-04-01')).toBe(31);
  });
  it('ISO-weeknummers', () => {
    expect(isoWeek('2026-11-11').week).toBe(46);
    expect(isoWeek('2027-01-01')).toEqual({ year: 2026, week: 53 });
    expect(isoWeek('2027-01-04')).toEqual({ year: 2027, week: 1 });
    expect(isoWeek('2027-02-07').week).toBe(5);
  });
  it('weeklabel toont weeknummer en datums', () => {
    expect(rangeLabel('week', '2026-11-11')).toBe('Week 46 · 9 – 15 nov 2026');
    expect(rangeLabel('week', '2026-12-30')).toBe('Week 53 · 28 dec – 3 jan 2027');
  });
  it('eindgrens: navigatie stopt bij 7 februari 2027', () => {
    const end = '2027-02-07';
    expect(canGoNext('day', '2027-02-06', end)).toBe(true);
    expect(canGoNext('day', '2027-02-07', end)).toBe(false);
    expect(canGoNext('week', '2027-01-27', end)).toBe(true);   // week van 1–7 feb bestaat nog
    expect(canGoNext('week', '2027-02-03', end)).toBe(false);
    expect(canGoNext('month', '2027-01-15', end)).toBe(true);
    expect(canGoNext('month', '2027-02-01', end)).toBe(false);
    expect(clampToEnd('2027-03-01', end)).toBe(end);
    expect(stepKey('month', '2027-01-31', 1)).toBe('2027-02-01');
  });
  it('maandraster heeft 42 dagen en start op maandag', () => {
    const g = monthGrid('2027-02-10');
    expect(g).toHaveLength(42);
    expect(g[0]).toBe('2027-02-01');
  });
  it('datumvalidatie', () => {
    expect(isDateKey('2027-02-29')).toBe(false);
    expect(isDateKey('2028-02-29')).toBe(true);
    expect(isDateKey('7/2/2027')).toBe(false);
  });
});
