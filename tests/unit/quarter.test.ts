import { describe, it, expect } from 'vitest';
import { snap, snapRange, placeBlock, hm, parseHm, formatDuration } from '../../src/lib/time/quarter';

describe('afronden op kwartieren', () => {
  it('snap', () => {
    expect(snap(7)).toBe(0);
    expect(snap(8)).toBe(15);
    expect(snap(422)).toBe(420);
    expect(snap(843)).toBe(840);
  });
  it('bereik 07:00 tot 14:00 (ook omgekeerd gesleept)', () => {
    expect(snapRange(421, 838)).toEqual({ start: 420, end: 840 });
    expect(snapRange(838, 421)).toEqual({ start: 420, end: 840 });
  });
  it('minstens één kwartier en binnen de dag', () => {
    expect(snapRange(600, 603)).toEqual({ start: 600, end: 615 });
    expect(snapRange(1435, 1440)).toEqual({ start: 1425, end: 1440 });
    expect(placeBlock(1430, 60)).toEqual({ start: 1380, end: 1440 });
    expect(placeBlock(-20, 20)).toEqual({ start: 0, end: 20 });
  });
  it('tijden', () => {
    expect(hm(420)).toBe('07:00');
    expect(parseHm('14:00')).toBe(840);
    expect(parseHm('24:00')).toBe(1440);
    expect(parseHm('25:00')).toBeNull();
  });
  it('duur in uur en minuten', () => {
    expect(formatDuration(90)).toBe('1 uur 30 min');
    expect(formatDuration(120)).toBe('2 uur');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(975)).toBe('16 uur 15 min');
    expect(formatDuration(0)).toBe('0 min');
  });
});
