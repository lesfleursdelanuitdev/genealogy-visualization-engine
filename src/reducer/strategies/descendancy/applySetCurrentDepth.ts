/**
 * Action: SET_CURRENT_DEPTH — set current depth (e.g. from depth dropdown).
 * Updates viewState.currentDepth and clears displayDepth so the build uses the selected depth.
 */

import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";

function viewState(state: TreeState): ViewState {
  return state.viewState as ViewState;
}

export function applySetCurrentDepth(state: TreeState, depth: number): TreeState {
  const vs = viewState(state);
  const newViewState: ViewState = {
    ...vs,
    currentDepth: depth,
    displayDepth: undefined,
  };
  return { ...state, viewState: newViewState };
}
