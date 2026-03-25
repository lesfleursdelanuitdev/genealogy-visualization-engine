import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";
import { getPeople } from "../../../testdata";
import { pushHistory } from "../../pushHistory";

function viewState(state: TreeState): ViewState {
  return state.viewState as ViewState;
}

function getFullName(personId: string): string {
  const person = getPeople().get(personId);
  if (!person) return personId;
  return `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() || personId;
}

export function applyDrawerSelect(
  state: TreeState,
  personId: string,
  spouseId: string
): TreeState {
  const vs = state.viewState as ViewState;
  const nextRevealed = new Map(vs.revealedUnions ?? []);
  const existing = nextRevealed.get(personId) ?? [];
  if (!existing.includes(spouseId)) nextRevealed.set(personId, [...existing, spouseId]);
  const newViewState = { ...vs, revealedUnions: nextRevealed };
  const personName = getFullName(personId);
  const spouseName = getFullName(spouseId);
  const person = getPeople().get(personId);
  const initials = person
    ? ((person.firstName?.trim() || "")[0] ?? "") + ((person.lastName?.trim() || "")[0] ?? "")
    : "?";
  const actionLabel = `Select partner of ${personName}: ${spouseName}`;
  const hist = pushHistory(state, state.rootId, newViewState, actionLabel, personId, {
    triggerPersonId: personId,
    triggerPersonFullName: personName,
    triggerPersonInitials: (initials || "?").toUpperCase(),
  });
  return { ...state, viewState: newViewState, ...hist };
}
