import type { Block, Category } from '../model/types';
import type { DateKey } from '../time/dates';
import { occurrencesIn } from './occurrences';

export interface CounterRow { category: Category; count: number; minutes: number }

export function countByCategory(
  blocks: Block[], categories: Category[], days: DateKey[], endDate: DateKey, sort: 'count' | 'name',
): CounterRow[] {
  const map = new Map<string, { count: number; minutes: number }>();
  for (const o of occurrencesIn(blocks, days, endDate)) {
    const r = map.get(o.block.categoryId) ?? { count: 0, minutes: 0 };
    r.count += 1;
    r.minutes += o.block.end - o.block.start;
    map.set(o.block.categoryId, r);
  }
  const rows = categories.map(c => ({ category: c, ...(map.get(c.id) ?? { count: 0, minutes: 0 }) }));
  const byName = (a: CounterRow, b: CounterRow) => a.category.name.localeCompare(b.category.name, 'nl');
  return rows.sort(sort === 'count' ? (a, b) => b.count - a.count || b.minutes - a.minutes || byName(a, b) : byName);
}
