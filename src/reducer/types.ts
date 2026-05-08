/**
 * State and action types for the tree reducer.
 * Core actions (ROOT, BACK, FORWARD, NAVIGATE_TO_INDEX) are handled by the root reducer.
 * Strategy-specific actions are delegated to reducer/strategies/<name>.
 */

import type { DescendancyAction } from "./strategies/descendancy/types";

export interface HistoryEntry {
  rootId: string;
  viewState: unknown;
  /** Chart mode when this entry was recorded (for BACK/FORWARD). Omitted in older sessions. */
  strategyName?: string;
  /** Human-readable action for this entry, e.g. "Toggle all partners", "Show parents & siblings of …". */
  actionLabel?: string;
  /** When the action changed the root (e.g. Show parents & siblings), the person who triggered it; display uses this for initials. */
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
  | { type: "ROOT"; personId: string; pedigreeFamcFamilyXref?: string | null }
  | { type: "ROOT_KEEP_VIEW"; personId: string }
  | { type: "SET_VIEW_STRATEGY"; strategyName: string; pedigreeFamcFamilyXref?: string | null }
  | { type: "BACK" }
  | { type: "FORWARD" }
  | { type: "NAVIGATE_TO_INDEX"; index: number }
  | { type: "CLEAR_HISTORY" }
  | { type: "RESTORE_HISTORY"; history: HistoryEntry[]; historyIndex: number }
  | { type: "PEDIGREE_SET_FAMC_FAMILY_XREF"; familyXref: string | null }
  | { type: "PEDIGREE_SET_FAMC_FOR_PERSON"; personId: string; familyXref: string | null }
  | { type: "PEDIGREE_COLLAPSE_ANCESTORS"; personId: string }
  | { type: "PEDIGREE_CLEAR_ANCESTOR_COLLAPSE" };

export type TreeAction = CoreAction | DescendancyAction;

export const CORE_ACTION_TYPES: CoreAction["type"][] = [
  "ROOT",
  "ROOT_KEEP_VIEW",
  "SET_VIEW_STRATEGY",
  "BACK",
  "FORWARD",
  "NAVIGATE_TO_INDEX",
  "CLEAR_HISTORY",
  "RESTORE_HISTORY",
  "PEDIGREE_SET_FAMC_FAMILY_XREF",
  "PEDIGREE_SET_FAMC_FOR_PERSON",
  "PEDIGREE_COLLAPSE_ANCESTORS",
  "PEDIGREE_CLEAR_ANCESTOR_COLLAPSE",
];

export function isCoreAction(action: { type: string }): action is CoreAction {
  return CORE_ACTION_TYPES.includes(action.type as CoreAction["type"]);
}
