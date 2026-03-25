/**
 * State and action types for the tree reducer.
 * Core actions (ROOT, BACK, FORWARD, NAVIGATE_TO_INDEX) are handled by the root reducer.
 * Strategy-specific actions are delegated to reducer/strategies/<name>.
 */

import type { DescendancyAction } from "./strategies/descendancy/types";

export interface HistoryEntry {
  rootId: string;
  viewState: unknown;
  /** Human-readable action for this entry, e.g. "Toggle all partners", "Show parents". */
  actionLabel?: string;
  /** When the action changed the root (e.g. Show parents), the person who triggered it; display uses this for initials. */
  triggerPersonId?: string;
  /** Stored at push time so history displays correctly even when getPeople() later lacks this person. */
  triggerPersonFullName?: string;
  triggerPersonInitials?: string;
  /** Display for the root (newRootId) when it changed; stored at push time. */
  rootPersonFullName?: string;
  rootPersonInitials?: string;
}

export interface TreeState {
  strategyName: string;
  rootId: string;
  viewState: unknown;
  history: HistoryEntry[];
  historyIndex: number;
}

export type CoreAction =
  | { type: "ROOT"; personId: string }
  | { type: "ROOT_KEEP_VIEW"; personId: string }
  | { type: "BACK" }
  | { type: "FORWARD" }
  | { type: "NAVIGATE_TO_INDEX"; index: number }
  | { type: "CLEAR_HISTORY" }
  | { type: "RESTORE_HISTORY"; history: HistoryEntry[]; historyIndex: number };

export type TreeAction = CoreAction | DescendancyAction;

export const CORE_ACTION_TYPES: CoreAction["type"][] = [
  "ROOT",
  "ROOT_KEEP_VIEW",
  "BACK",
  "FORWARD",
  "NAVIGATE_TO_INDEX",
  "CLEAR_HISTORY",
  "RESTORE_HISTORY",
];

export function isCoreAction(action: { type: string }): action is CoreAction {
  return CORE_ACTION_TYPES.includes(action.type as CoreAction["type"]);
}
