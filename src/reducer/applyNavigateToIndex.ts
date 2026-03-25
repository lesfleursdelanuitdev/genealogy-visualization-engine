/**
 * Action: NAVIGATE_TO_INDEX — jump to a specific history entry by index.
 */

import type { TreeState } from "./types";

export function applyNavigateToIndex(state: TreeState, index: number): TreeState {
  if (index < 0 || index >= state.history.length) return state;
  const entry = state.history[index];
  return {
    ...state,
    historyIndex: index,
    rootId: entry.rootId,
    viewState: entry.viewState,
  };
}
