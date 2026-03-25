import type { TreeState } from "../types";

export interface StrategyReducerEntry {
  getInitialViewState: () => unknown;
  reduce: (s: TreeState, a: { type: string }) => TreeState;
}

const registry = new Map<string, StrategyReducerEntry>();

export function registerStrategyReducer(name: string, entry: StrategyReducerEntry): void {
  registry.set(name, entry);
}

export function getStrategyReducer(name: string): StrategyReducerEntry | undefined {
  return registry.get(name);
}
