import type { StrategyReducerEntry } from "../registry";
import { registerStrategyReducer } from "../registry";
import { getInitialViewState } from "../pedigree/getInitialViewState";
import { reducePedigree } from "../pedigree/reducePedigree";

const NAME = "fan_chart";

export function registerFanChartReducer(): void {
  registerStrategyReducer(NAME, {
    getInitialViewState,
    reduce: reducePedigree as StrategyReducerEntry["reduce"],
  });
}
