import type { TreeState } from "../../types";
import type { DescendancyAction } from "./types";
import { applyRevealSpouse } from "./applyRevealSpouse";
import { applyCloseSpouse } from "./applyCloseSpouse";
import { applyRevealAllSpouses } from "./applyRevealAllSpouses";
import { applyCloseAllSpouses } from "./applyCloseAllSpouses";
import { applyCloseLinkedUnion } from "./applyCloseLinkedUnion";
import { applyShowSiblings } from "./applyShowSiblings";
import { applySetSiblingViewFromApi } from "./applySetSiblingViewFromApi";
import { applyParents } from "./applyParents";
import { applyDrawerSelect } from "./applyDrawerSelect";
import { applyDrawerSelectAll } from "./applyDrawerSelectAll";
import { applyCloseAllSpousesForPerson } from "./applyCloseAllSpousesForPerson";
import { applyShowChildren } from "./applyShowChildren";
import { applySetCurrentDepth } from "./applySetCurrentDepth";
import { applyPanToPerson } from "./applyPanToPerson";
import { applyCollapseSubtree } from "./applyCollapseSubtree";
import { applyExpandSubtree } from "./applyExpandSubtree";

type Handler = (state: TreeState, action: DescendancyAction) => TreeState;

const handlers: Record<DescendancyAction["type"], Handler> = {
  REVEAL_SPOUSE: (s, a) => applyRevealSpouse(s, (a as Extract<DescendancyAction, { type: "REVEAL_SPOUSE" }>).personId, (a as Extract<DescendancyAction, { type: "REVEAL_SPOUSE" }>).spouseId),
  CLOSE_SPOUSE: (s, a) => applyCloseSpouse(s, (a as Extract<DescendancyAction, { type: "CLOSE_SPOUSE" }>).spouseId),
  REVEAL_ALL_SPOUSES: (s) => applyRevealAllSpouses(s),
  CLOSE_ALL_SPOUSES: (s) => applyCloseAllSpouses(s),
  CLOSE_LINKED_UNION: (s, a) => applyCloseLinkedUnion(s, (a as Extract<DescendancyAction, { type: "CLOSE_LINKED_UNION" }>).personId),
  SHOW_SIBLINGS: (s, a) => applyShowSiblings(s, (a as Extract<DescendancyAction, { type: "SHOW_SIBLINGS" }>).personId),
  SET_SIBLING_VIEW_FROM_API: (s, a) =>
    applySetSiblingViewFromApi(s, (a as Extract<DescendancyAction, { type: "SET_SIBLING_VIEW_FROM_API" }>).siblingView),
  PARENTS: (s, a) => applyParents(s, (a as Extract<DescendancyAction, { type: "PARENTS" }>).personId),
  DRAWER_SELECT: (s, a) => {
    const d = a as Extract<DescendancyAction, { type: "DRAWER_SELECT" }>;
    return applyDrawerSelect(s, d.personId, d.spouseId);
  },
  DRAWER_SELECT_ALL: (s, a) => {
    const d = a as Extract<DescendancyAction, { type: "DRAWER_SELECT_ALL" }>;
    return applyDrawerSelectAll(s, d.personId);
  },
  CLOSE_ALL_SPOUSES_FOR_PERSON: (s, a) => {
    const d = a as Extract<DescendancyAction, { type: "CLOSE_ALL_SPOUSES_FOR_PERSON" }>;
    return applyCloseAllSpousesForPerson(s, d.personId);
  },
  SHOW_CHILDREN: (s, a) => {
    const d = a as Extract<DescendancyAction, { type: "SHOW_CHILDREN" }>;
    return applyShowChildren(s, d.personId, d.atMaxDepth, d.currentDepth);
  },
  SET_CURRENT_DEPTH: (s, a) =>
    applySetCurrentDepth(s, (a as Extract<DescendancyAction, { type: "SET_CURRENT_DEPTH" }>).depth),
  PAN_TO_PERSON: (s, a) =>
    applyPanToPerson(s, (a as Extract<DescendancyAction, { type: "PAN_TO_PERSON" }>).personId),
  COLLAPSE_SUBTREE: (s, a) =>
    applyCollapseSubtree(s, (a as Extract<DescendancyAction, { type: "COLLAPSE_SUBTREE" }>).personId),
  EXPAND_SUBTREE: (s, a) =>
    applyExpandSubtree(s, (a as Extract<DescendancyAction, { type: "EXPAND_SUBTREE" }>).personId),
};

export function reduceDescendancy(
  state: TreeState,
  action: DescendancyAction
): TreeState {
  const handler = handlers[action.type];
  return handler ? handler(state, action) : state;
}
