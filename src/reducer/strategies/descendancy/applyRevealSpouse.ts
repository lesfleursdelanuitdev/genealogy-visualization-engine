import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";
import { pushHistory } from "../../pushHistory";
import { getPersonDisplay } from "../../getPersonDisplay";
import { withoutFamilyUnitScope } from "./familyUnitScope";
import type { GraphSnapshot } from "../../../graph";

function vs(s: TreeState): ViewState {
  return s.viewState as ViewState;
}

export function applyRevealSpouse(
  state: TreeState,
  personId: string,
  spouseId: string,
  graph: GraphSnapshot
): TreeState {
  const v = vs(state);
  const nextRevealed = new Map(v.revealedUnions ?? []);
  const existing = nextRevealed.get(personId) ?? [];
  if (!existing.includes(spouseId)) nextRevealed.set(personId, [...existing, spouseId]);
  const newViewState = { ...withoutFamilyUnitScope(v), revealedUnions: nextRevealed };
  const { fullName, initials } = getPersonDisplay(graph, personId);
  const hist = pushHistory(state, state.rootId, newViewState, "Show partner", personId, {
    triggerPersonId: personId,
    triggerPersonFullName: fullName,
    triggerPersonInitials: initials,
  });
  return { ...state, viewState: newViewState, ...hist };
}
