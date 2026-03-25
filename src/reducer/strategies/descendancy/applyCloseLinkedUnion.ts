import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";

function vs(s: TreeState): ViewState {
  return s.viewState as ViewState;
}

export function applyCloseLinkedUnion(
  state: TreeState,
  personId: string
): TreeState {
  const next = new Map(vs(state).linkedUnions ?? []);
  if (next.has(personId)) {
    next.delete(personId);
  } else {
    for (const [key, entries] of next) {
      const filtered = entries.filter(
        (e) => e.xId !== personId && e.husbId !== personId
      );
      if (filtered.length !== entries.length) {
        if (filtered.length === 0) next.delete(key);
        else next.set(key, filtered);
        break;
      }
    }
  }
  return { ...state, viewState: { ...vs(state), linkedUnions: next } };
}
