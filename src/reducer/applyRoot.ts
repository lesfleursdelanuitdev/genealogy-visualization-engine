/**
 * Action: ROOT — set root person and reset view state via current strategy.
 */

import type { TreeState } from "./types";
import { pushHistory } from "./pushHistory";
import { getStrategyReducer } from "./strategies/registry";
import { getPersonDisplay } from "./getPersonDisplay";

export function applyRoot(
  state: TreeState,
  personId: string,
  pedigreeFamcFamilyXref?: string | null
): TreeState {
  const strategy = getStrategyReducer(state.strategyName);
  const base = strategy?.getInitialViewState() ?? {};
  const isPed =
    state.strategyName === "pedigree" ||
    state.strategyName === "vertical_pedigree" ||
    state.strategyName === "fan_chart";
  const famc =
    isPed && pedigreeFamcFamilyXref != null && String(pedigreeFamcFamilyXref).trim() !== ""
      ? String(pedigreeFamcFamilyXref).trim()
      : undefined;
  const newViewState = {
    ...base,
    ...(famc != null ? { pedigreeFamcFamilyXref: famc } : {}),
  };
  const { fullName, initials } = getPersonDisplay(personId);
  const actionLabel = `Make ${fullName} root`;
  const hist = pushHistory(state, personId, newViewState, actionLabel, undefined, {
    rootPersonFullName: fullName,
    rootPersonInitials: initials,
  });
  return {
    ...state,
    rootId: personId,
    viewState: newViewState,
    ...hist,
  };
}
