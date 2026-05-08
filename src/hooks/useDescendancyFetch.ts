"use client";

import { DEFAULT_MAX_DEPTH } from "../constants";
import type { SiblingView } from "../types";
import { useChartViewFetch } from "./useChartViewFetch";
import type { FamilyTreeBuilder } from "../builder";

/**
 * @deprecated Prefer {@link useChartViewFetch} with strategy `"descendancy"`.
 * Fetches descendancy (or sibling-view) snapshot and exposes the underlying {@link FamilyTreeBuilder}.
 */
export function useDescendancyFetch(
  rootId: string,
  maxDepth: number = DEFAULT_MAX_DEPTH,
  siblingViewPersonId?: string | null,
  onSiblingViewMeta?: ((siblingView: SiblingView) => void) | null
) {
  const r = useChartViewFetch(
    "descendancy",
    rootId,
    maxDepth,
    siblingViewPersonId,
    onSiblingViewMeta ?? null
  );
  return {
    lastApiRootId: r.lastApiRootId,
    isDescendancyLoading: r.isChartLoading,
    descendancyDataKey: r.chartDataKey,
    builder: (r.chartAdapter?.getDataBuilder() as FamilyTreeBuilder | undefined) ?? null,
  };
}
