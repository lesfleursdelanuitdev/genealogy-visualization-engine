import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";
import type { GraphSnapshot } from "../../../graph";
import { pushHistory } from "../../pushHistory";
import { withoutFamilyUnitScope } from "./familyUnitScope";
import { initialLetters } from "../../personText";

function viewState(state: TreeState): ViewState {
  return state.viewState as ViewState;
}

function getFullName(graph: GraphSnapshot, personId: string): string {
  const person = graph.people.get(personId);
  if (!person) return personId;
  return `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() || personId;
}

/** Close all revealed spouses for one person (from drawer "Close all"). */
export function applyCloseAllSpousesForPerson(
  state: TreeState,
  personId: string,
  graph: GraphSnapshot
): TreeState {
  const vs = state.viewState as ViewState;
  const nextRevealed = new Map(vs.revealedUnions ?? []);
  // Only this person's row closes (T19); partners' own rows stay (see applyCloseSpouse).
  nextRevealed.delete(personId);
  const base =
    vs.familyUnitScope?.personId === personId ? withoutFamilyUnitScope(vs) : vs;
  const newViewState = { ...base, revealedUnions: nextRevealed };
  const personName = getFullName(graph, personId);
  const person = graph.people.get(personId);
  const initials = person
    ? initialLetters(person)
    : "?";
  const actionLabel = `Close all partners of ${personName}`;
  const hist = pushHistory(state, state.rootId, newViewState, actionLabel, personId, {
    triggerPersonId: personId,
    triggerPersonFullName: personName,
    triggerPersonInitials: (initials || "?").toUpperCase(),
  });
  return { ...state, viewState: newViewState, ...hist };
}
