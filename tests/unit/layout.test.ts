import { describe, it, expect } from 'vitest';
import { layoutDay } from '../../src/lib/planner/layout';

const s = (id: string, start: number, end: number) => ({ id, start, end });
const byId = (r: ReturnType<typeof layoutDay<{ id: string; start: number; end: number }>>) =>
  Object.fromEntries(r.map(p => [p.item.id, [p.lane, p.lanes]]));

describe('overlapindeling', () => {
  it('geen overlap → elk blok volle breedte', () => {
    expect(byId(layoutDay([s('a', 0, 60), s('b', 60, 120)]))).toEqual({ a: [0, 1], b: [0, 1] });
  });
  it('twee overlappende blokken naast elkaar', () => {
    expect(byId(layoutDay([s('a', 480, 600), s('b', 540, 660)]))).toEqual({ a: [0, 2], b: [1, 2] });
  });
  it('vrijgekomen kolom wordt hergebruikt binnen een cluster', () => {
    const r = byId(layoutDay([s('a', 480, 720), s('b', 480, 540), s('c', 540, 600), s('d', 590, 610)]));
    expect(r).toEqual({ a: [0, 3], b: [1, 3], c: [1, 3], d: [2, 3] });
  });
  it('aparte clusters krijgen elk hun eigen aantal kolommen', () => {
    const r = byId(layoutDay([s('a', 0, 60), s('b', 30, 90), s('c', 120, 180)]));
    expect(r.c).toEqual([0, 1]);
    expect(r.a[1]).toBe(2);
  });
});
