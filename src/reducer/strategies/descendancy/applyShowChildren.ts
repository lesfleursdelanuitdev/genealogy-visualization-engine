/**
 * Action: SHOW_CHILDREN(P) — show P's children.
 * Below the cap: the whole chart gets one more generation (displayDepth / currentDepth + 1).
 * At the cap (T18): P's children appear in place, one more row for P's branch only. The root
 * and the depth stay as they are.
 * Both push a "Show children" history entry with P as the trigger.
 */

import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";
import type { GraphSnapshot } from "../../../graph";
import { pushHistory } from "../../pushHistory";
import { clampDepth } from "./applySetCurrentDepth";
import { initialLetters } from "../../personText";

function viewState(state: TreeState): ViewState {
  return state.viewState as ViewState;
}

function triggerDisplay(graph: GraphSnapshot, personId: string) {
  const p = graph.people.get(personId);
  const fullName = (p ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() : null) || personId;
  const initials = p ? initialLetters(p) : "?";
  return { triggerPersonFullName: fullName, triggerPersonInitials: (initials || "?").toUpperCase() };
}

export function applyShowChildren(
  state: TreeState,
  personId: string,
  atMaxDepth: boolean,
  currentDepth: number | undefined,
  graph: GraphSnapshot
): TreeState {
  const vs = viewState(state);
  let newViewState: ViewState;

  if (!atMaxDepth) {
    const nextDepth = clampDepth((currentDepth ?? 0) + 1);
    newViewState = { ...vs, displayDepth: nextDepth, currentDepth: nextDepth };
  } else {
    const shown = vs.showChildrenOf ?? [];
    if (shown.includes(personId)) return state;
    newViewState = { ...vs, showChildrenOf: [...shown, personId] };
  }

  const hist = pushHistory(state, state.rootId, newViewState, "Show children", personId, triggerDisplay(graph, personId));
  return { ...state, viewState: newViewState, ...hist };
}
