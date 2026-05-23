import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";
import { withoutFamilyUnitScope } from "./familyUnitScope";

function vs(s: TreeState): ViewState {
  return s.viewState as ViewState;
}

export function applyCloseSpouse(state: TreeState, spouseId: string): TreeState {
  const v = vs(state);
  const next = new Map(v.revealedUnions ?? []);
  let ownerKey: string | null = null;
  for (const [key, ids] of next) {
    if (ids.includes(spouseId)) {
      ownerKey = key;
      break;
    }
  }
  if (!ownerKey) return state;
  const filtered = (next.get(ownerKey) ?? []).filter((id) => id !== spouseId);
  if (filtered.length === 0) next.delete(ownerKey);
  else next.set(ownerKey, filtered);

  // Clean up any phantom reverse entry spouseId→[ownerKey] left by a prior REVEAL_ALL_SPOUSES.
  const reverseList = next.get(spouseId);
  if (reverseList) {
    const reverseFiltered = reverseList.filter((id) => id !== ownerKey);
    if (reverseFiltered.length === 0) next.delete(spouseId);
    else next.set(spouseId, reverseFiltered);
  }
  const scope = v.familyUnitScope;
  const clearScope =
    scope != null &&
    ownerKey === scope.personId &&
    (scope.spouseId === spouseId || filtered.length === 0);
  const base = clearScope ? withoutFamilyUnitScope(v) : v;
  return { ...state, viewState: { ...base, revealedUnions: next } };
}
