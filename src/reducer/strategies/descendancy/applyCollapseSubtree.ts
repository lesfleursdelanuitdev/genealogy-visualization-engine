/**
 * Action: COLLAPSE_SUBTREE — hide this person's descendants in the tree.
 */

import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";

function vs(s: TreeState): ViewState {
  return s.viewState as ViewState;
}

export function applyCollapseSubtree(state: TreeState, personId: string): TreeState {
  const v = vs(state);
  const set = new Set(v.collapsedSubtrees ?? []);
  set.add(personId);
  const newViewState: ViewState = { ...v, collapsedSubtrees: [...set] };
  return { ...state, viewState: newViewState };
}
