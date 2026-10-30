/**
 * Tree reducer: core actions (ROOT, BACK, FORWARD, NAVIGATE_TO_INDEX) here;
 * strategy-specific actions delegated to reducer/strategies/<name>.
 *
 * The reducer reads people and unions only from the graph it is given: pass it as the third
 * argument, or bind it once with createTreeReducer(graph) for React's useReducer.
 */

import type { TreeAction, TreeState } from "./types";
import { isCoreAction } from "./types";
import { coreHandlers } from "./handlers";
import { getStrategyReducer } from "./strategies/registry";
import { createInitialState } from "./initialState";
import { registerDescendancyReducer } from "./strategies/descendancy";
import { registerPedigreeReducer } from "./strategies/pedigree";
import { registerVerticalPedigreeReducer } from "./strategies/verticalPedigree";
import { registerFanChartReducer } from "./strategies/fanChart";
import { EMPTY_GRAPH, type GraphSnapshot } from "../graph";

registerDescendancyReducer();
registerPedigreeReducer();
registerVerticalPedigreeReducer();
registerFanChartReducer();

export const INITIAL_STATE: TreeState = createInitialState("descendancy");

/**
 * Next state for `action`. `graph` is the chart's data; without it, actions that need people
 * or unions (show parents, reveal all partners, …) find nothing and change nothing.
 */
export function treeReducer(
  state: TreeState = INITIAL_STATE,
  action: TreeAction,
  graph: GraphSnapshot = EMPTY_GRAPH
): TreeState {
  if (isCoreAction(action)) {
    const handler = coreHandlers[action.type];
    return handler ? handler(state, action, graph) : state;
  }
  const strategy = getStrategyReducer(state.strategyName);
  if (strategy) {
    return strategy.reduce(state, action, graph);
  }
  return state;
}

/** A `(state, action) => state` reducer bound to one chart's graph (for useReducer). */
export function createTreeReducer(graph: GraphSnapshot): (state: TreeState, action: TreeAction) => TreeState {
  return (state, action) => treeReducer(state, action, graph);
}

export { createInitialState } from "./initialState";
export { isAllSpousesRevealed } from "./strategies/descendancy";
export type { TreeState, TreeAction, HistoryEntry, CoreAction } from "./types";
export type { DescendancyAction } from "./strategies/descendancy/types";
