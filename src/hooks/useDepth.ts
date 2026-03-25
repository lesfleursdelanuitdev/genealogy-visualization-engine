"use client";

import { useState, useCallback, useEffect } from "react";
import { DEFAULT_MAX_DEPTH } from "../constants";
import type { ViewState } from "../types";
import type { TreeAction } from "../reducer/types";
import type { FamilyTreeBuilder } from "../builder";

export interface UseDepthOptions {
  dispatch: React.Dispatch<TreeAction>;
  viewState: ViewState;
  maxDepthRendered: number;
  builder: FamilyTreeBuilder | null | undefined;
}

export interface UseDepthResult {
  maxDepth: number;
  setMaxDepth: React.Dispatch<React.SetStateAction<number>>;
  effectiveMaxDepth: number;
  effectiveFetchDepth: number;
  handleMaxDepthChange: (newDepth: number) => void;
  currentDepthRendered: number;
  atMaxDepth: boolean;
  displayedDepth: number;
  effectiveCurrentDepth: number;
}

export function useDepth({
  dispatch,
  viewState,
  maxDepthRendered,
  builder,
}: UseDepthOptions): UseDepthResult {
  const [maxDepth, setMaxDepth] = useState(DEFAULT_MAX_DEPTH);

  // Use reducer as source of truth so info/settings panels update when depth changes (e.g. from dropdown or SET_CURRENT_DEPTH).
  const effectiveMaxDepth = Math.min(
    viewState.currentDepth ?? maxDepth,
    DEFAULT_MAX_DEPTH
  );
  const effectiveFetchDepth = Math.max(
    effectiveMaxDepth,
    viewState.displayDepth ?? 0
  );
  const effectiveCurrentDepth =
    viewState.currentDepth ?? viewState.displayDepth ?? maxDepth;

  // Keep local maxDepth in sync when depth is set from reducer (e.g. history or other dispatch).
  useEffect(() => {
    const reducerDepth = viewState.currentDepth;
    if (reducerDepth != null && reducerDepth !== maxDepth) {
      setMaxDepth(reducerDepth);
    }
  }, [viewState.currentDepth, maxDepth]);

  const handleMaxDepthChange = useCallback(
    (newDepth: number) => {
      console.log("[Depth dropdown] current depth changed", {
        "old current depth": maxDepth,
        "new current depth": newDepth,
        "max depth": DEFAULT_MAX_DEPTH,
      });
      dispatch({ type: "SET_CURRENT_DEPTH", depth: newDepth });
      setMaxDepth(newDepth);
    },
    [maxDepth, dispatch]
  );

  // Sync current depth to rendered depth when they differ and we're not in a displayDepth-driven build (e.g. mid–Show children).
  // After re-root or "Show parents", rendered depth may be less or more than current; keep reducer and UI in sync.
  useEffect(() => {
    if (builder == null) return;
    if (maxDepthRendered === 0) return; // no tree built yet
    if (viewState.displayDepth != null) return; // let Show children / displayDepth drive depth for this build
    const current = effectiveCurrentDepth;
    if (maxDepthRendered !== current) {
      console.log(
        "[Depth] Syncing current depth to rendered depth: %d → %d",
        current,
        maxDepthRendered
      );
      dispatch({ type: "SET_CURRENT_DEPTH", depth: maxDepthRendered });
      setMaxDepth(maxDepthRendered);
    }
  }, [
    builder,
    maxDepthRendered,
    effectiveCurrentDepth,
    viewState.displayDepth,
    dispatch,
  ]);

  // When displayDepth was set (e.g. Show children) and we've built that deep, sync maxDepth
  useEffect(() => {
    if (builder == null || viewState.displayDepth == null) return;
    if (maxDepthRendered >= viewState.displayDepth) {
      setMaxDepth(viewState.displayDepth);
    }
  }, [builder, maxDepthRendered, viewState.displayDepth]);

  const currentDepthRendered = maxDepthRendered;
  const atMaxDepth = currentDepthRendered >= DEFAULT_MAX_DEPTH;
  const displayedDepth =
    maxDepthRendered === 0
      ? 1
      : Math.min(effectiveMaxDepth, maxDepthRendered);

  return {
    maxDepth,
    setMaxDepth,
    effectiveMaxDepth,
    effectiveFetchDepth,
    handleMaxDepthChange,
    currentDepthRendered,
    atMaxDepth,
    displayedDepth,
    effectiveCurrentDepth,
  };
}
