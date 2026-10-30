/**
 * Action: CLOSE_SPOUSE(personId, spouseId) — close `spouseId` on `personId`'s row only (T19,
 * B09: with just a spouse id, a partner open on two rows closed on the first one found).
 * Pushes a "Close partner" history entry, like REVEAL_SPOUSE's "Show partner".
 */

import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";
import type { GraphSnapshot } from "../../../graph";
import { pushHistory } from "../../pushHistory";
import { getPersonDisplay } from "../../getPersonDisplay";
import { withoutFamilyUnitScope } from "./familyUnitScope";

export function applyCloseSpouse(
  state: TreeState,
  personId: string,
  spouseId: string,
  graph: GraphSnapshot
): TreeState {
  const v = state.viewState as ViewState;
  const row = v.revealedUnions?.get(personId) ?? [];
  if (!row.includes(spouseId)) return state;

  const next = new Map(v.revealedUnions ?? []);
  const filtered = row.filter((id) => id !== spouseId);
  if (filtered.length === 0) next.delete(personId);
  else next.set(personId, filtered);

  // The partner's own row (spouseId → [personId]) stays: it is real when both are principals
  // (e.g. a father with a child by his daughter, T49), and REVEAL_ALL_SPOUSES no longer adds
  // phantom reverse entries.
  const scope = v.familyUnitScope;
  const clearScope =
    scope != null && personId === scope.personId && (scope.spouseId === spouseId || filtered.length === 0);
  const base = clearScope ? withoutFamilyUnitScope(v) : v;
  const newViewState: ViewState = { ...base, revealedUnions: next };

  const { fullName, initials } = getPersonDisplay(graph, personId);
  const hist = pushHistory(state, state.rootId, newViewState, "Close partner", personId, {
    triggerPersonId: personId,
    triggerPersonFullName: fullName,
    triggerPersonInitials: initials,
  });
  return { ...state, viewState: newViewState, ...hist };
}
