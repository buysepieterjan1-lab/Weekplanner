import { describe, it, expect } from 'vitest';
import { snap, snapRange, placeBlock, hm, parseHm, parseTime, resolveEnd, formatDuration } from '../../src/lib/time/quarter';

describe('afronden op 10 minuten', () => {
  it('snap', () => {
    expect(snap(4)).toBe(0);
    expect(snap(5)).toBe(10);
    expect(snap(424)).toBe(420);
    expect(snap(843)).toBe(840);
    expect(snap(846)).toBe(850);
  });
  it('bereik 07:00 tot 14:00 (ook omgekeerd gesleept)', () => {
    expect(snapRange(421, 838)).toEqual({ start: 420, end: 840 });
    expect(snapRange(838, 421)).toEqual({ start: 420, end: 840 });
  });
  it('minstens 10 minuten en binnen de dag', () => {
    expect(snapRange(600, 603)).toEqual({ start: 600, end: 610 });
    expect(snapRange(1436, 1440)).toEqual({ start: 1430, end: 1440 });
  });
  it('blok plaatsen: mag over middernacht, start vóór 0:00 = vorige dag', () => {
    expect(placeBlock(1384, 60)).toEqual({ start: 1380, end: 1440, dayShift: 0 });
    expect(placeBlock(1410, 60)).toEqual({ start: 1410, end: 1470, dayShift: 0 });
    expect(placeBlock(-60, 480)).toEqual({ start: 1380, end: 1860, dayShift: -1 });
    expect(placeBlock(1500, 30)).toEqual({ start: 60, end: 90, dayShift: 1 });
    expect(placeBlock(721, 30, false)).toEqual({ start: 721, end: 751, dayShift: 0 });
  });
});

describe('tijden', () => {
  it('weergave', () => {
    expect(hm(420)).toBe('07:00');
    expect(hm(1440)).toBe('24:00');
    expect(hm(1860)).toBe('07:00');
    expect(parseHm('14:00')).toBe(840);
    expect(parseHm('24:00')).toBe(1440);
    expect(parseHm('25:00')).toBeNull();
  });
  it('vrij typen', () => {
    for (const [inp, out] of [['12:01', 721], ['12.01', 721], ['12u01', 721], ['12h01', 721], ['1201', 721], ['930', 570],
      ['9', 540], ['9u', 540], ['09:5', 590], [' 7:05 ', 425], ['0', 0], ['24:00', 1440]] as const) {
      expect(parseTime(inp), inp).toBe(out);
    }
    for (const bad of ['', 'abc', '25:00', '12:60', '24:01', '12345', '1:2:3']) expect(parseTime(bad), bad).toBeNull();
  });
  it('einde vóór begin = volgende dag', () => {
    expect(resolveEnd(1380, 420)).toBe(1860);
    expect(resolveEnd(600, 660)).toBe(660);
    expect(resolveEnd(0, 1440)).toBe(1440);
  });
  it('duur in uur en minuten', () => {
    expect(formatDuration(90)).toBe('1 uur 30 min');
    expect(formatDuration(120)).toBe('2 uur');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(975)).toBe('16 uur 15 min');
    expect(formatDuration(0)).toBe('0 min');
  });
});
