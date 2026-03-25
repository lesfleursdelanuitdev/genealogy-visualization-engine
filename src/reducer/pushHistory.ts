/**
 * Pure transition helper: compute next history and historyIndex after a navigation.
 * Pass personDisplay to store full names and initials so the history panel can show them
 * even when getPeople() does not have the person at display time.
 */

import { MAX_HISTORY } from "../constants";
import type { TreeState } from "./types";

export interface HistoryPersonDisplay {
  triggerPersonId?: string;
  triggerPersonFullName?: string;
  triggerPersonInitials?: string;
  rootPersonFullName?: string;
  rootPersonInitials?: string;
}

export function pushHistory(
  state: TreeState,
  newRootId: string,
  newViewState: unknown,
  actionLabel: string,
  triggerPersonId?: string,
  personDisplay?: HistoryPersonDisplay
): { history: TreeState["history"]; historyIndex: number } {
  const truncated = state.history.slice(0, state.historyIndex + 1);
  const entry: TreeState["history"][0] = { rootId: newRootId, viewState: newViewState, actionLabel };
  if (triggerPersonId !== undefined) entry.triggerPersonId = triggerPersonId;
  if (personDisplay) {
    if (personDisplay.triggerPersonFullName !== undefined) entry.triggerPersonFullName = personDisplay.triggerPersonFullName;
    if (personDisplay.triggerPersonInitials !== undefined) entry.triggerPersonInitials = personDisplay.triggerPersonInitials;
    if (personDisplay.rootPersonFullName !== undefined) entry.rootPersonFullName = personDisplay.rootPersonFullName;
    if (personDisplay.rootPersonInitials !== undefined) entry.rootPersonInitials = personDisplay.rootPersonInitials;
  }
  const next = [...truncated, entry];
  const history = next.slice(-MAX_HISTORY);
  const historyIndex = history.length - 1;
  return { history, historyIndex };
}
