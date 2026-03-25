import type { TreeState } from "../../types";
import type { ViewState, SiblingView } from "../../../types";

export function applySetSiblingViewFromApi(
  state: TreeState,
  siblingView: SiblingView
): TreeState {
  const viewState = state.viewState as ViewState;
  return {
    ...state,
    viewState: { ...viewState, siblingView },
  };
}
