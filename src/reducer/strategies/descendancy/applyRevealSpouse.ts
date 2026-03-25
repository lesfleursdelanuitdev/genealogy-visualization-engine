import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";
import { pushHistory } from "../../pushHistory";
import { getPersonDisplay } from "../../getPersonDisplay";

function vs(s: TreeState): ViewState {
  return s.viewState as ViewState;
}

export function applyRevealSpouse(
  state: TreeState,
  personId: string,
  spouseId: string
): TreeState {
  const v = vs(state);
  const nextRevealed = new Map(v.revealedUnions ?? []);
  const existing = nextRevealed.get(personId) ?? [];
  if (!existing.includes(spouseId)) nextRevealed.set(personId, [...existing, spouseId]);
  const newViewState = { ...v, revealedUnions: nextRevealed };
  const { fullName, initials } = getPersonDisplay(personId);
  const hist = pushHistory(state, state.rootId, newViewState, "Show partner", personId, {
    triggerPersonId: personId,
    triggerPersonFullName: fullName,
    triggerPersonInitials: initials,
  });
  return { ...state, viewState: newViewState, ...hist };
}
