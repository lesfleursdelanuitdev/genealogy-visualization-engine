/**
 * Descendancy "+N hidden descendants" counts, used by the descendancy descriptor at the depth limit.
 */

import type { GraphSnapshot } from "../../graph";

/**
 * Finished counts, one cache per snapshot. A snapshot never changes, and each count is a
 * fresh walk, so a cached value never depends on what was counted before (B05).
 */
const descendantCountCache = new WeakMap<GraphSnapshot, Map<string, number>>();

/**
 * Number of different people who descend from `personId` in `graph`, each counted once even
 * when they descend through two lines (pedigree collapse). The person is not counted.
 */
export function countDescendants(graph: GraphSnapshot, personId: string): number {
  let cache = descendantCountCache.get(graph);
  if (!cache) {
    cache = new Map();
    descendantCountCache.set(graph, cache);
  }
  const cached = cache.get(personId);
  if (cached !== undefined) return cached;

  const seen = new Set<string>([personId]);
  const stack = [...graph.childrenOf(personId)];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const c of graph.childrenOf(id)) if (!seen.has(c)) stack.push(c);
  }
  const count = seen.size - 1;
  cache.set(personId, count);
  return count;
}
