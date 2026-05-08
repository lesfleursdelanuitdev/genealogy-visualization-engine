import type { StrategyReducerEntry } from "../registry";
import { registerStrategyReducer } from "../registry";
import { getInitialViewState } from "../pedigree/getInitialViewState";
import { reducePedigree } from "../pedigree/reducePedigree";

const NAME = "vertical_pedigree";

/** Same view-state rules as LTR pedigree. */
export function registerVerticalPedigreeReducer(): void {
  registerStrategyReducer(NAME, {
    getInitialViewState,
    reduce: reducePedigree as StrategyReducerEntry["reduce"],
  });
}
