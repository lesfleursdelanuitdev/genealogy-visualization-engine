/**
 * Descendancy-specific action types.
 * Handled by the descendancy strategy reducer; core reducer delegates to it.
 */

import type { SiblingView } from "../../../types";

export type DescendancyAction =
  | { type: "REVEAL_SPOUSE"; personId: string; spouseId: string }
  | { type: "CLOSE_SPOUSE"; spouseId: string }
  | { type: "REVEAL_ALL_SPOUSES" }
  | { type: "CLOSE_ALL_SPOUSES" }
  | { type: "CLOSE_LINKED_UNION"; personId: string }
  | { type: "SHOW_SIBLINGS"; personId: string }
  | { type: "SET_SIBLING_VIEW_FROM_API"; siblingView: SiblingView }
  | { type: "PARENTS"; personId: string }
  | { type: "DRAWER_SELECT"; personId: string; spouseId: string }
  | { type: "DRAWER_SELECT_ALL"; personId: string }
  | { type: "CLOSE_ALL_SPOUSES_FOR_PERSON"; personId: string }
  | { type: "SHOW_CHILDREN"; personId: string; atMaxDepth: boolean; currentDepth?: number }
  | { type: "SET_CURRENT_DEPTH"; depth: number }
  | { type: "PAN_TO_PERSON"; personId: string }
  | { type: "COLLAPSE_SUBTREE"; personId: string }
  | { type: "EXPAND_SUBTREE"; personId: string };

export const DESCENDANCY_ACTION_TYPES: DescendancyAction["type"][] = [
  "REVEAL_SPOUSE",
  "CLOSE_SPOUSE",
  "REVEAL_ALL_SPOUSES",
  "CLOSE_ALL_SPOUSES",
  "CLOSE_LINKED_UNION",
  "SHOW_SIBLINGS",
  "SET_SIBLING_VIEW_FROM_API",
  "PARENTS",
  "DRAWER_SELECT",
  "DRAWER_SELECT_ALL",
  "CLOSE_ALL_SPOUSES_FOR_PERSON",
  "SHOW_CHILDREN",
  "SET_CURRENT_DEPTH",
  "PAN_TO_PERSON",
  "COLLAPSE_SUBTREE",
  "EXPAND_SUBTREE",
];
