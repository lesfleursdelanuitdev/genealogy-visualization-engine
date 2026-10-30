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
import type { ViewState } from "../types";

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
  const base = withoutStalePanTarget(state, action);
  const next = reduceAction(base, action, graph);
  return next === base ? state : next;
}

function reduceAction(state: TreeState, action: TreeAction, graph: GraphSnapshot): TreeState {
  if (isCoreAction(action)) {
    const handler = coreHandlers[action.type];
    return handler ? handler(state, action, graph) : state;
  }
  const strategy = getStrategyReducer(state.strategyName);
  return strategy ? strategy.reduce(state, action, graph) : state;
}

/** Actions that move through history; they restore an entry's view state as it was. */
const HISTORY_MOVES = new Set<TreeAction["type"]>([
  "BACK",
  "FORWARD",
  "NAVIGATE_TO_INDEX",
  "CLEAR_HISTORY",
  "RESTORE_HISTORY",
]);

/**
 * A pan target belongs to its "Pan to person" entry only (S2): before any other action, drop
 * it from the current view so the action's new entry doesn't carry it on. History moves keep
 * it, so going back to that entry pans again.
 */
function withoutStalePanTarget(state: TreeState, action: TreeAction): TreeState {
  if (action.type === "PAN_TO_PERSON" || HISTORY_MOVES.has(action.type)) return state;
  const v = state.viewState as ViewState | null | undefined;
  if (v == null || typeof v !== "object" || v.panToPersonId === undefined) return state;
  const { panToPersonId: _dropped, ...rest } = v;
  return { ...state, viewState: rest };
}

/** A `(state, action) => state` reducer bound to one chart's graph (for useReducer). */
export function createTreeReducer(graph: GraphSnapshot): (state: TreeState, action: TreeAction) => TreeState {
  return (state, action) => treeReducer(state, action, graph);
}

export { createInitialState } from "./initialState";
export { isAllSpousesRevealed } from "./strategies/descendancy";
export type { TreeState, TreeAction, HistoryEntry, CoreAction } from "./types";
export type { DescendancyAction } from "./strategies/descendancy/types";
