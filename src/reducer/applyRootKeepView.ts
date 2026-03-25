/**
 * Action: ROOT_KEEP_VIEW — set root person but keep current view state (e.g. revealed spouses).
 * Use for "Home" so the tree only pans/zooms to the root; visibility is unchanged.
 */

import type { TreeState } from "./types";
import { pushHistory } from "./pushHistory";
import { getPersonDisplay } from "./getPersonDisplay";

export function applyRootKeepView(state: TreeState, personId: string): TreeState {
  const { fullName, initials } = getPersonDisplay(personId);
  const actionLabel = fullName ? `Go to ${fullName}` : "Go to root";
  const hist = pushHistory(state, personId, state.viewState, actionLabel, undefined, {
    rootPersonFullName: fullName,
    rootPersonInitials: initials,
  });
  return {
    ...state,
    rootId: personId,
    ...hist,
  };
}
