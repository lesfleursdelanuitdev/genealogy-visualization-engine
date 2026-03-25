import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";
import { getPeople } from "../../../testdata";
import { getSpousesOf } from "../../../builder/currentBuilder";
import { pushHistory } from "../../pushHistory";

function viewState(state: TreeState): ViewState {
  return state.viewState as ViewState;
}

function getFullName(personId: string): string {
  const person = getPeople().get(personId);
  if (!person) return personId;
  return `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() || personId;
}

/** Reveal all spouses for one person (from drawer "Open all"). */
export function applyDrawerSelectAll(
  state: TreeState,
  personId: string
): TreeState {
  const vs = state.viewState as ViewState;
  const nextRevealed = new Map(vs.revealedUnions ?? []);
  const allSpouseIds = getSpousesOf(personId).map(({ spouseId }) => spouseId);
  if (allSpouseIds.length > 0) nextRevealed.set(personId, allSpouseIds);
  const newViewState = { ...vs, revealedUnions: nextRevealed };
  const personName = getFullName(personId);
  const person = getPeople().get(personId);
  const initials = person
    ? ((person.firstName?.trim() || "")[0] ?? "") + ((person.lastName?.trim() || "")[0] ?? "")
    : "?";
  const actionLabel = `Open all partners of ${personName}`;
  const hist = pushHistory(state, state.rootId, newViewState, actionLabel, personId, {
    triggerPersonId: personId,
    triggerPersonFullName: personName,
    triggerPersonInitials: (initials || "?").toUpperCase(),
  });
  return { ...state, viewState: newViewState, ...hist };
}
