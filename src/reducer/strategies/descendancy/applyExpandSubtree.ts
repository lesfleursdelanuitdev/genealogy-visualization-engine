/**
 * Action: EXPAND_SUBTREE — show this person's descendants again. Pushes "Show descendants of X" (T28).
 */

import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";
import type { GraphSnapshot } from "../../../graph";
import { pushHistory } from "../../pushHistory";
import { getPersonDisplay } from "../../getPersonDisplay";

export function applyExpandSubtree(state: TreeState, personId: string, graph: GraphSnapshot): TreeState {
  const v = state.viewState as ViewState;
  const list = v.collapsedSubtrees ?? [];
  if (!list.includes(personId)) return state;
  const rest = list.filter((id) => id !== personId);
  const newViewState: ViewState = { ...v, collapsedSubtrees: rest.length > 0 ? rest : undefined };
  const { fullName, initials } = getPersonDisplay(graph, personId);
  const hist = pushHistory(state, state.rootId, newViewState, `Show descendants of ${fullName}`, personId, {
    triggerPersonId: personId,
    triggerPersonFullName: fullName,
    triggerPersonInitials: initials,
  });
  return { ...state, viewState: newViewState, ...hist };
}
