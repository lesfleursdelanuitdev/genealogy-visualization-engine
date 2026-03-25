/**
 * Action: EXPAND_SUBTREE — show this person's descendants again.
 */

import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";

function vs(s: TreeState): ViewState {
  return s.viewState as ViewState;
}

export function applyExpandSubtree(state: TreeState, personId: string): TreeState {
  const v = vs(state);
  const list = (v.collapsedSubtrees ?? []).filter((id) => id !== personId);
  const newViewState: ViewState = { ...v, collapsedSubtrees: list.length > 0 ? list : undefined };
  return { ...state, viewState: newViewState };
}
