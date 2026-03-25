import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";
import { pushHistory } from "../../pushHistory";

function vs(s: TreeState): ViewState {
  return s.viewState as ViewState;
}

export function applyCloseAllSpouses(state: TreeState): TreeState {
  const v = vs(state);
  const newViewState = { ...v, revealedUnions: new Map<string, string[]>() };
  const hist = pushHistory(state, state.rootId, newViewState, "Toggle all partners");
  return { ...state, viewState: newViewState, ...hist };
}
