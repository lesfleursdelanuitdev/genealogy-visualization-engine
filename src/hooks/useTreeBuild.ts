"use client";

import { useMemo } from "react";
import { DEFAULT_MAX_DEPTH } from "../constants";
import { descendancyDescriptor } from "../strategies/descendancy/descriptor";
import { PersonNode } from "../nodes";
import type { ChartNode } from "../nodes";
import type { ViewState } from "../types";
import type { LayoutBoundsOptions } from "../strategies/ViewStrategyDescriptor";
import type { ChartViewBuildAdapter } from "../chartView/ChartViewBuildAdapter";

const DEBUG_BUILDER = process.env.NEXT_PUBLIC_DEBUG_DESCENDANCY === "true";

export interface UseTreeBuildOptions {
  effectiveRootId: string;
  viewState: ViewState;
  maxDepth: number;
  /** Bumps when chart data refetches (same role as former descendancyDataKey). */
  chartDataKey: number;
  /** Per-strategy chart builder; when null, placeholder root until data loads. */
  chartAdapter: ChartViewBuildAdapter | null;
  /** Effective person card height when display settings hide photo/dates. Omit or pass 0 to use default PERSON_HEIGHT. */
  effectivePersonHeight?: number;
  /** Horizontal pedigree: vertical gap (px) between stacked parent cards; omit to use engine default. */
  parentPairGap?: number;
}

export interface TreeBuildResult {
  root: ChartNode;
  baseX: number;
  baseY: number;
  bounds: { minX: number; maxX: number; maxY: number };
  /** Maximum generation index rendered during build (0 = root only, 1 = kids, 2 = grandkids, 3 = great-grandkids). */
  maxDepthRendered: number;
}

function placeholderRoot(rootId: string): ChartNode {
  return new PersonNode({
    id: rootId,
    firstName: "",
    lastName: "",
    birthYear: null,
    deathYear: null,
    photoUrl: null,
  });
}

export function useTreeBuild({
  effectiveRootId,
  viewState,
  maxDepth,
  chartDataKey,
  chartAdapter,
  effectivePersonHeight,
  parentPairGap,
}: UseTreeBuildOptions): TreeBuildResult {
  return useMemo(() => {
    const currentDepth = viewState.currentDepth ?? viewState.displayDepth ?? maxDepth;
    let rootNode: ChartNode;
    let maxDepthRendered: number;
    if (chartAdapter != null) {
      const result = chartAdapter.buildTreeResult(effectiveRootId, viewState, maxDepth);
      rootNode = result.root;
      maxDepthRendered = result.maxDepthRendered;
    } else {
      rootNode = placeholderRoot(effectiveRootId);
      maxDepthRendered = 0;
    }
    if (DEBUG_BUILDER) {
      console.log("[FamilyTreeBuilder] useTreeBuild", {
        source: chartAdapter != null ? chartAdapter.strategyName : "placeholder (no adapter)",
        effectiveRootId,
        "max depth (fixed global)": DEFAULT_MAX_DEPTH,
        "current depth (from state or dropdown)": currentDepth,
        "rendered depth": maxDepthRendered,
      });
    }
    const strategy = chartAdapter?.getDescriptor() ?? descendancyDescriptor;
    const layoutOptions: LayoutBoundsOptions = {};
    if (effectivePersonHeight != null && effectivePersonHeight > 0) {
      layoutOptions.personHeight = effectivePersonHeight;
    }
    if (typeof parentPairGap === "number" && Number.isFinite(parentPairGap)) {
      layoutOptions.parentPairGap = parentPairGap;
    }
    const layoutOpts = Object.keys(layoutOptions).length > 0 ? layoutOptions : undefined;
    strategy.layout(rootNode, layoutOpts);
    strategy.markUnions?.(rootNode);
    const b = strategy.getBounds(rootNode, layoutOpts);
    const padding = strategy.constants.PADDING;
    return {
      root: rootNode,
      baseX: -b.minX + padding,
      baseY: padding,
      bounds: b,
      maxDepthRendered,
    };
  }, [effectiveRootId, viewState, maxDepth, chartDataKey, chartAdapter, effectivePersonHeight, parentPairGap]);
}
