/**
 * Initial state for the tree reducer. Requires strategy reducers to be registered first.
 */

import type { TreeState } from "./types";
import { DEFAULT_ROOT_XREF } from "../constants";
import { getStrategyReducer } from "./strategies/registry";

export function createInitialState(strategyName: string, rootId?: string): TreeState {
  const strategy = getStrategyReducer(strategyName);
  const viewState = strategy?.getInitialViewState() ?? {};
  const initialRootId = rootId?.trim() || DEFAULT_ROOT_XREF;
  return {
    strategyName,
    rootId: initialRootId,
    viewState,
    history: [{ rootId: initialRootId, viewState, actionLabel: "Initial view" }],
    historyIndex: 0,
  };
}
