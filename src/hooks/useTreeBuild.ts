"use client";

import { useMemo } from "react";
import { DEFAULT_MAX_DEPTH } from "../constants";
import { descendancyDescriptor } from "../strategies/descendancy/descriptor";
import { PersonNode } from "../nodes";
import type { ChartNode } from "../nodes";
import type { ViewState } from "../types";
import type { FamilyTreeBuilder } from "../builder";

const DEBUG_BUILDER = process.env.NEXT_PUBLIC_DEBUG_DESCENDANCY === "true";

export interface UseTreeBuildOptions {
  effectiveRootId: string;
  viewState: ViewState;
  maxDepth: number;
  descendancyDataKey: number;
  /** When set, tree is built via builder.buildView. When null, a placeholder root is returned (show loading/error in UI). */
  builder?: FamilyTreeBuilder | null;
  /** Effective person card height when display settings hide photo/dates. Omit or pass 0 to use default PERSON_HEIGHT. */
  effectivePersonHeight?: number;
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
  descendancyDataKey,
  builder,
  effectivePersonHeight,
}: UseTreeBuildOptions): TreeBuildResult {
  return useMemo(() => {
    const currentDepth = viewState.currentDepth ?? viewState.displayDepth ?? maxDepth;
    let rootNode: ChartNode;
    let maxDepthRendered: number;
    if (builder != null) {
      const result = builder.buildView(effectiveRootId, viewState, maxDepth);
      rootNode = result.root;
      maxDepthRendered = result.maxDepthRendered;
    } else {
      rootNode = placeholderRoot(effectiveRootId);
      maxDepthRendered = 0;
    }
    console.log("[FamilyTreeBuilder] useTreeBuild", {
      source: builder != null ? "builder.buildView" : "placeholder (no builder)",
      effectiveRootId,
      "max depth (fixed global)": DEFAULT_MAX_DEPTH,
      "current depth (from state or dropdown)": currentDepth,
      "rendered depth": maxDepthRendered,
    });
    const strategy = builder?.getCurrentStrategy() ?? descendancyDescriptor;
    const layoutOptions =
      effectivePersonHeight != null && effectivePersonHeight > 0
        ? { personHeight: effectivePersonHeight }
        : undefined;
    strategy.layout(rootNode, layoutOptions);
    strategy.markUnions?.(rootNode);
    const b = strategy.getBounds(rootNode, layoutOptions);
    const padding = strategy.constants.PADDING;
    return {
      root: rootNode,
      baseX: -b.minX + padding,
      baseY: padding,
      bounds: b,
      maxDepthRendered,
    };
  }, [effectiveRootId, viewState, maxDepth, descendancyDataKey, builder, effectivePersonHeight]);
}
