/**
 * Descendancy build facade and helpers: buildView, countDescendants.
 * Uses the generic buildTree from chart root with descendancy strategy and +N badge at max depth.
 */

import { DEFAULT_MAX_DEPTH } from "../../constants";
import type { ViewState } from "../../types";
import type { GraphSnapshot } from "../../graph";
import { buildTree, type BuildTreeResult } from "../../builder/build";
import { DescendancyViewStrategy } from "./DescendancyViewStrategy";

/**
 * Memoised counts, one cache per snapshot. A snapshot never changes, so the cache lives
 * exactly as long as the data it describes (before: one module-wide cache cleared on fetch).
 */
const descendantCountCache = new WeakMap<GraphSnapshot, Map<string, number>>();

function cacheFor(graph: GraphSnapshot): Map<string, number> {
  let cache = descendantCountCache.get(graph);
  if (!cache) {
    cache = new Map();
    descendantCountCache.set(graph, cache);
  }
  return cache;
}

/** Number of descendants of `personId` in `graph`, for the "+N" badge at the depth limit. */
export function countDescendants(
  graph: GraphSnapshot,
  personId: string,
  visited = new Set<string>()
): number {
  if (visited.has(personId)) return 0;
  const cache = cacheFor(graph);
  const cached = cache.get(personId);
  if (cached !== undefined) return cached;
  visited.add(personId);
  const childIds = graph.childrenOf(personId);
  const count = childIds.reduce((sum, id) => sum + 1 + countDescendants(graph, id, visited), 0);
  cache.set(personId, count);
  return count;
}

/**
 * Build descendancy chart: (graph, rootId, viewState, maxDepth) → { root, maxDepthRendered }.
 * Uses generic buildTree with DescendancyViewStrategy and countDescendants for +N at max depth.
 */
export function buildView(
  graph: GraphSnapshot,
  rootId: string,
  viewState: ViewState = {},
  maxDepth: number = DEFAULT_MAX_DEPTH
): BuildTreeResult {
  const effectiveDepth = viewState.currentDepth ?? viewState.displayDepth ?? maxDepth;
  const strategy = new DescendancyViewStrategy(viewState, effectiveDepth);
  return buildTree(rootId, strategy, {
    graph,
    maxDepth: effectiveDepth,
    getHiddenCount: (personId) => countDescendants(graph, personId),
  });
}
