/**
 * Action: SET_CURRENT_DEPTH — set current depth (e.g. from depth dropdown).
 * Updates viewState.currentDepth and clears displayDepth so the build uses the selected depth.
 * The depth is clamped to 1..DEFAULT_MAX_DEPTH (B10).
 */

import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";
import { DEFAULT_MAX_DEPTH } from "../../../constants";

export function clampDepth(depth: number): number {
  if (!Number.isFinite(depth)) return DEFAULT_MAX_DEPTH;
  return Math.min(Math.max(Math.floor(depth), 1), DEFAULT_MAX_DEPTH);
}

export function applySetCurrentDepth(state: TreeState, depth: number): TreeState {
  const vs = state.viewState as ViewState;
  const currentDepth = clampDepth(depth);
  if (vs.currentDepth === currentDepth && vs.displayDepth === undefined) return state;
  return { ...state, viewState: { ...vs, currentDepth, displayDepth: undefined } };
}
