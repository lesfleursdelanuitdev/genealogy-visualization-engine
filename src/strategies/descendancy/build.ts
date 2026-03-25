/**
 * Descendancy build facade and helpers: buildView, countDescendants, clearDescendantCountCache.
 * Uses the generic buildTree from chart root with descendancy strategy and +N badge at max depth.
 */

import { getAllChildrenOf } from "../../testdata";
import { DEFAULT_MAX_DEPTH } from "../../constants";
import type { ViewState } from "../../types";
import { buildTree, type BuildTreeResult } from "../../builder/build";
import { DescendancyViewStrategy } from "./DescendancyViewStrategy";

const descendantCountCache = new Map<string, number>();

export function clearDescendantCountCache(): void {
  descendantCountCache.clear();
}

export function countDescendants(
  personId: string,
  visited = new Set<string>()
): number {
  if (visited.has(personId)) return 0;
  const cached = descendantCountCache.get(personId);
  if (cached !== undefined) return cached;
  visited.add(personId);
  const childIds = getAllChildrenOf(personId);
  const count = childIds.reduce((sum, id) => sum + 1 + countDescendants(id, visited), 0);
  descendantCountCache.set(personId, count);
  return count;
}

/**
 * Build descendancy chart: (rootId, viewState, maxDepth) → { root, maxDepthRendered }.
 * Uses generic buildTree with DescendancyViewStrategy and countDescendants for +N at max depth.
 */
export function buildView(
  rootId: string,
  viewState: ViewState = {},
  maxDepth: number = DEFAULT_MAX_DEPTH
): BuildTreeResult {
  const effectiveDepth = viewState.currentDepth ?? viewState.displayDepth ?? maxDepth;
  const strategy = new DescendancyViewStrategy(viewState, effectiveDepth);
  return buildTree(rootId, strategy, {
    maxDepth: effectiveDepth,
    getHiddenCount: countDescendants,
  });
}
