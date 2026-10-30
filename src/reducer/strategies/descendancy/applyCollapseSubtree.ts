/**
 * Action: COLLAPSE_SUBTREE — hide this person's descendants. Pushes "Hide descendants of X" (T28).
 */

import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";
import type { GraphSnapshot } from "../../../graph";
import { pushHistory } from "../../pushHistory";
import { getPersonDisplay } from "../../getPersonDisplay";

export function applyCollapseSubtree(state: TreeState, personId: string, graph: GraphSnapshot): TreeState {
  const v = state.viewState as ViewState;
  const list = v.collapsedSubtrees ?? [];
  if (list.includes(personId)) return state;
  const newViewState: ViewState = { ...v, collapsedSubtrees: [...list, personId] };
  const { fullName, initials } = getPersonDisplay(graph, personId);
  const hist = pushHistory(state, state.rootId, newViewState, `Hide descendants of ${fullName}`, personId, {
    triggerPersonId: personId,
    triggerPersonFullName: fullName,
    triggerPersonInitials: initials,
  });
  return { ...state, viewState: newViewState, ...hist };
}
