/**
 * Tree reducer: core actions (ROOT, BACK, FORWARD, NAVIGATE_TO_INDEX) here;
 * strategy-specific actions delegated to reducer/strategies/<name>.
 */

import type { TreeAction, TreeState } from "./types";
import { isCoreAction, CORE_ACTION_TYPES } from "./types";
import { DESCENDANCY_ACTION_TYPES } from "./strategies/descendancy/types";
import { coreHandlers } from "./handlers";
import { getStrategyReducer } from "./strategies/registry";
import { createInitialState } from "./initialState";
import { registerDescendancyReducer } from "./strategies/descendancy";

registerDescendancyReducer();

export const INITIAL_STATE: TreeState = createInitialState("descendancy");

/** All action types accepted by the tree reducer (core + strategy). Log on app load for debugging. */
export function getAllActionTypes(): string[] {
  return [...CORE_ACTION_TYPES, ...DESCENDANCY_ACTION_TYPES];
}

export function treeReducer(
  state: TreeState = INITIAL_STATE,
  action: TreeAction
): TreeState {
  if (isCoreAction(action)) {
    const handler = coreHandlers[action.type];
    return handler ? handler(state, action) : state;
  }
  const strategy = getStrategyReducer(state.strategyName);
  if (strategy) {
    return strategy.reduce(state, action);
  }
  return state;
}

export { createInitialState } from "./initialState";
export { isAllSpousesRevealed } from "./strategies/descendancy";
export type { TreeState, TreeAction, HistoryEntry, CoreAction } from "./types";
export type { DescendancyAction } from "./strategies/descendancy/types";
