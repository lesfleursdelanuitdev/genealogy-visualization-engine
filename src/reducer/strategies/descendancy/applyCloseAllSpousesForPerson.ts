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

/** Close all revealed spouses for one person (from drawer "Close all"). */
export function applyCloseAllSpousesForPerson(
  state: TreeState,
  personId: string
): TreeState {
  const vs = state.viewState as ViewState;
  const nextRevealed = new Map(vs.revealedUnions ?? []);
  nextRevealed.delete(personId);
  const newViewState = { ...vs, revealedUnions: nextRevealed };
  const personName = getFullName(personId);
  const person = getPeople().get(personId);
  const initials = person
    ? ((person.firstName?.trim() || "")[0] ?? "") + ((person.lastName?.trim() || "")[0] ?? "")
    : "?";
  const actionLabel = `Close all partners of ${personName}`;
  const hist = pushHistory(state, state.rootId, newViewState, actionLabel, personId, {
    triggerPersonId: personId,
    triggerPersonFullName: personName,
    triggerPersonInitials: (initials || "?").toUpperCase(),
  });
  return { ...state, viewState: newViewState, ...hist };
}
