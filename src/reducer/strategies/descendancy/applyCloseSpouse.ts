import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";

function vs(s: TreeState): ViewState {
  return s.viewState as ViewState;
}

export function applyCloseSpouse(state: TreeState, spouseId: string): TreeState {
  const next = new Map(vs(state).revealedUnions ?? []);
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
  return { ...state, viewState: { ...vs(state), revealedUnions: next } };
}
