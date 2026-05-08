/**
 * Initial state for the tree reducer. Requires strategy reducers to be registered first.
 */

import type { TreeState } from "./types";
import type { ViewState } from "../types";
import { DEFAULT_MAX_DEPTH, DEFAULT_ROOT_XREF } from "../constants";
import { getStrategyReducer } from "./strategies/registry";

export type CreateInitialStateOptions = {
  /** Seed `viewState.currentDepth` (clamped 1..DEFAULT_MAX_DEPTH) for URL deep links. */
  initialCurrentDepth?: number | null;
  /** Pedigree / vertical pedigree: `famc` query — family xref for root’s FAMC line. */
  initialPedigreeFamcFamilyXref?: string | null;
};

export function createInitialState(
  strategyName: string,
  rootId?: string,
  options?: CreateInitialStateOptions | null
): TreeState {
  const strategy = getStrategyReducer(strategyName);
  let viewState: ViewState = strategy?.getInitialViewState() ?? {};
  const d = options?.initialCurrentDepth;
  if (d != null && Number.isFinite(d)) {
    const clamped = Math.min(Math.max(Math.floor(d), 1), DEFAULT_MAX_DEPTH);
    viewState = { ...viewState, currentDepth: clamped };
  }
  const famc = options?.initialPedigreeFamcFamilyXref?.trim();
  const isPed =
    strategyName === "pedigree" ||
    strategyName === "vertical_pedigree" ||
    strategyName === "fan_chart";
  if (isPed && famc) {
    viewState = { ...viewState, pedigreeFamcFamilyXref: famc };
  }
  const initialRootId = rootId?.trim() || DEFAULT_ROOT_XREF;
  return {
    strategyName,
    rootId: initialRootId,
    viewState,
    history: [
      {
        rootId: initialRootId,
        viewState,
        actionLabel: "Initial view",
        strategyName,
      },
    ],
    historyIndex: 0,
  };
}
