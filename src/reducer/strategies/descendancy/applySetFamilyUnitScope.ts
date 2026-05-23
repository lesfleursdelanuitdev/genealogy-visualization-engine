import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";
import { pushHistory } from "../../pushHistory";
import { getPersonDisplay } from "../../getPersonDisplay";
import { normalizeFamilyUnitScope } from "./familyUnitScope";

function vs(s: TreeState): ViewState {
  return s.viewState as ViewState;
}

export function applySetFamilyUnitScope(
  state: TreeState,
  personId: string,
  spouseId: string,
  familyXref?: string | null
): TreeState {
  const v = vs(state);
  const scope = normalizeFamilyUnitScope(personId, spouseId, familyXref);
  const nextRevealed = new Map(v.revealedUnions ?? []);
  nextRevealed.set(scope.personId, [scope.spouseId]);
  const newViewState: ViewState = {
    ...v,
    revealedUnions: nextRevealed,
    familyUnitScope: scope,
  };
  const { fullName, initials } = getPersonDisplay(scope.personId);
  const spouseDisplay = getPersonDisplay(scope.spouseId);
  const hist = pushHistory(
    state,
    state.rootId,
    newViewState,
    `Family view: ${spouseDisplay.fullName}`,
    scope.personId,
    {
      triggerPersonId: scope.personId,
      triggerPersonFullName: fullName,
      triggerPersonInitials: initials,
    }
  );
  return { ...state, viewState: newViewState, ...hist };
}
