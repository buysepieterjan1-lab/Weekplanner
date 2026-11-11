export interface Span { start: number; end: number }
export interface Placed<T> { item: T; lane: number; lanes: number }

/**
 * Overlappende blokken naast elkaar: per cluster van overlappende blokken krijgt elk blok
 * de eerste vrije kolom; alle blokken in een cluster delen hetzelfde aantal kolommen.
 */
export function layoutDay<T extends Span>(items: T[]): Placed<T>[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Placed<T>[] = [];
  let cluster: Placed<T>[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    const lanes = laneEnds.length;
    for (const p of cluster) p.lanes = lanes;
    out.push(...cluster);
    cluster = [];
    laneEnds = [];
  };
  for (const it of sorted) {
    if (cluster.length && it.start >= clusterEnd) { flush(); clusterEnd = -Infinity; }
    let lane = laneEnds.findIndex(e => e <= it.start);
    if (lane < 0) { lane = laneEnds.length; laneEnds.push(it.end); } else laneEnds[lane] = it.end;
    cluster.push({ item: it, lane, lanes: 0 });
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  if (cluster.length) flush();
  return out;
}
