/**
 * Action: CLEAR_HISTORY — replace history with only the initial view (first entry) and restore to it.
 */

import type { TreeState } from "./types";

export function applyClearHistory(state: TreeState): TreeState {
  const initialEntry = state.history[0];
  const singleEntry = initialEntry ?? {
    rootId: state.rootId,
    viewState: state.viewState,
    actionLabel: "Initial view",
  };
  return {
    ...state,
    history: [singleEntry],
    historyIndex: 0,
    rootId: singleEntry.rootId,
    viewState: singleEntry.viewState ?? state.viewState,
  };
}
