/**
 * Action: PAN_TO_PERSON — push a history entry that centers the viewport on the given person.
 */

import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";
import { pushHistory } from "../../pushHistory";
import { getPersonDisplay } from "../../getPersonDisplay";

function vs(s: TreeState): ViewState {
  return s.viewState as ViewState;
}

export function applyPanToPerson(state: TreeState, personId: string): TreeState {
  const v = vs(state);
  const newViewState: ViewState = { ...v, panToPersonId: personId };
  const { fullName, initials } = getPersonDisplay(personId);
  const actionLabel = fullName ? `Pan to person ${fullName}` : "Pan to person";
  const hist = pushHistory(state, state.rootId, newViewState, actionLabel, personId, {
    triggerPersonId: personId,
    triggerPersonFullName: fullName,
    triggerPersonInitials: initials,
  });
  return { ...state, viewState: newViewState, ...hist };
}
