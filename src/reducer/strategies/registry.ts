import type { TreeState } from "../types";
import type { GraphSnapshot } from "../../graph";

export interface StrategyReducerEntry {
  getInitialViewState: () => unknown;
  reduce: (s: TreeState, a: { type: string }, graph: GraphSnapshot) => TreeState;
}

const registry = new Map<string, StrategyReducerEntry>();

export function registerStrategyReducer(name: string, entry: StrategyReducerEntry): void {
  registry.set(name, entry);
}

export function getStrategyReducer(name: string): StrategyReducerEntry | undefined {
  return registry.get(name);
}
