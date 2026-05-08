import type { StrategyReducerEntry } from "../registry";
import { registerStrategyReducer } from "../registry";
import { getInitialViewState } from "./getInitialViewState";
import { reducePedigree } from "./reducePedigree";

const NAME = "pedigree";

export function registerPedigreeReducer(): void {
  registerStrategyReducer(NAME, {
    getInitialViewState,
    reduce: reducePedigree as StrategyReducerEntry["reduce"],
  });
}

export { getInitialViewState, reducePedigree };
