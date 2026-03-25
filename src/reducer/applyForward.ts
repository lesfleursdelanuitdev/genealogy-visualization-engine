/**
 * Action: FORWARD — navigate to next history entry.
 */

import type { TreeState } from "./types";

export function applyForward(state: TreeState): TreeState {
  if (state.historyIndex >= state.history.length - 1) return state;
  const historyIndex = state.historyIndex + 1;
  const entry = state.history[historyIndex];
  if (!entry) return state;
  return {
    ...state,
    historyIndex,
    rootId: entry.rootId,
    viewState: entry.viewState,
  };
}
