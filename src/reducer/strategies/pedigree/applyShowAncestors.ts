/**
 * Action: SHOW_HIDDEN on an ancestor chart (T30) — the card's "+N" chip: show its parents, one
 * more generation for that branch only. Pushes a "Show ancestors" history entry.
 */

import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";
import type { GraphSnapshot } from "../../../graph";
import { pushHistory } from "../../pushHistory";
import { getPersonDisplay } from "../../getPersonDisplay";

export function applyShowAncestors(state: TreeState, personId: string, graph: GraphSnapshot): TreeState {
  const v = state.viewState as ViewState;
  const shown = v.showParentsOf ?? [];
  if (shown.includes(personId)) return state;
  const newViewState: ViewState = { ...v, showParentsOf: [...shown, personId] };
  const { fullName, initials } = getPersonDisplay(graph, personId);
  const hist = pushHistory(state, state.rootId, newViewState, "Show ancestors", personId, {
    triggerPersonId: personId,
    triggerPersonFullName: fullName,
    triggerPersonInitials: initials,
  });
  return { ...state, viewState: newViewState, ...hist };
}
