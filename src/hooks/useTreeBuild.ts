"use client";

import { useMemo } from "react";
import { DEFAULT_MAX_DEPTH } from "../constants";
import { descendancyDescriptor } from "../strategies/descendancy/descriptor";
import { PersonNode } from "../nodes";
import type { ChartNode } from "../nodes";
import type { ViewState } from "../types";
import type { LayoutBoundsOptions } from "../strategies/ViewStrategyDescriptor";
import type { ChartViewBuildAdapter } from "../chartView/ChartViewBuildAdapter";
import { layoutChart } from "../session/createChartSession";
import { chartSwitchLayoutBegin, chartSwitchLayoutEnd } from "../debug/chartSwitchTiming";

import { DEBUG_DESCENDANCY as DEBUG_BUILDER } from "../env";

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
  /** Horizontal pedigree: edge-to-edge horizontal gap (px) between generation columns (c.x width); omit to use engine default. */
  pedigreeGenerationGap?: number;
  /** Horizontal pedigree: when true, g=1 uses the full gap to leave room for root siblings. */
  showRootSiblings?: boolean;
  /** Width of a person card in px (default PERSON_WIDTH = 330). Affects pedigree column spacing. */
  personWidth?: number;
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
  pedigreeGenerationGap,
  showRootSiblings,
  personWidth,
}: UseTreeBuildOptions): TreeBuildResult {
  return useMemo(() => {
    const currentDepth = viewState.currentDepth ?? viewState.displayDepth ?? maxDepth;
    const built =
      chartAdapter != null
        ? chartAdapter.buildTreeResult(effectiveRootId, viewState, maxDepth)
        : { root: placeholderRoot(effectiveRootId), maxDepthRendered: 0 };
    const maxDepthRendered = built.maxDepthRendered;
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
    if (typeof pedigreeGenerationGap === "number" && Number.isFinite(pedigreeGenerationGap)) {
      layoutOptions.pedigreeGenerationGap = pedigreeGenerationGap;
    }
    if (showRootSiblings) {
      layoutOptions.showRootSiblings = true;
    }
    if (typeof personWidth === "number" && Number.isFinite(personWidth) && personWidth > 0) {
      layoutOptions.personWidth = personWidth;
    }
    const layoutOpts = Object.keys(layoutOptions).length > 0 ? layoutOptions : undefined;
    chartSwitchLayoutBegin();
    try {
      const chart = layoutChart(strategy, built, layoutOpts);
      return {
        root: chart.root,
        baseX: chart.baseX,
        baseY: chart.baseY,
        bounds: chart.bounds,
        maxDepthRendered: chart.maxDepthRendered,
      };
    } finally {
      chartSwitchLayoutEnd();
    }
  }, [effectiveRootId, viewState, maxDepth, chartDataKey, chartAdapter, effectivePersonHeight, parentPairGap, pedigreeGenerationGap, showRootSiblings, personWidth]);
}
