import type { StrategyReducerEntry } from "../registry";
import { registerStrategyReducer } from "../registry";
import { getInitialViewState } from "./getInitialViewState";
import { reduceDescendancy } from "./reducer";
import { DESCENDANCY_ACTION_TYPES } from "./types";

const NAME = "descendancy";

export function registerDescendancyReducer(): void {
  registerStrategyReducer(NAME, {
    getInitialViewState,
    reduce: reduceDescendancy as StrategyReducerEntry["reduce"],
  });
}

export { getInitialViewState, reduceDescendancy };
export { isAllSpousesRevealed } from "./applyRevealAllSpouses";
export type { DescendancyAction } from "./types";
export { DESCENDANCY_ACTION_TYPES };
