/**
 * Action: RESTORE_HISTORY — replace history and historyIndex (e.g. from localStorage).
 * Also sets rootId and viewState from the entry at historyIndex.
 */

import type { TreeState } from "./types";

export function applyRestoreHistory(
  state: TreeState,
  history: TreeState["history"],
  historyIndex: number
): TreeState {
  const safeIndex = Math.max(0, Math.min(historyIndex, history.length - 1));
  const entry = history[safeIndex];
  if (!entry) return state;
  return {
    ...state,
    history,
    historyIndex: safeIndex,
    rootId: entry.rootId,
    viewState: entry.viewState ?? state.viewState,
  };
}
