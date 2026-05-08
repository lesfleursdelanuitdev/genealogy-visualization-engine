/**
 * Action: SET_VIEW_STRATEGY — change chart mode (e.g. descendancy vs pedigree), reset view state, keep root.
 */

import type { TreeState } from "./types";
import { pushHistory } from "./pushHistory";
import { getStrategyReducer } from "./strategies/registry";

export function applySetViewStrategy(
  state: TreeState,
  strategyName: string,
  pedigreeFamcFamilyXref?: string | null
): TreeState {
  const strategy = getStrategyReducer(strategyName);
  const base = strategy?.getInitialViewState() ?? {};
  const isPed =
    strategyName === "pedigree" ||
    strategyName === "vertical_pedigree" ||
    strategyName === "fan_chart";
  const famc =
    isPed && pedigreeFamcFamilyXref != null && String(pedigreeFamcFamilyXref).trim() !== ""
      ? String(pedigreeFamcFamilyXref).trim()
      : undefined;
  const newViewState = {
    ...base,
    ...(famc != null ? { pedigreeFamcFamilyXref: famc } : {}),
  };
  const label =
    strategyName === "pedigree"
      ? "Pedigree view"
      : strategyName === "vertical_pedigree"
        ? "Vertical Pedigree view"
        : strategyName === "fan_chart"
          ? "Fan Chart view"
        : strategyName === "descendancy"
          ? "Descendancy view"
          : `View: ${strategyName}`;
  const hist = pushHistory(
    state,
    state.rootId,
    newViewState,
    label,
    undefined,
    undefined,
    strategyName
  );
  return {
    ...state,
    strategyName,
    viewState: newViewState,
    ...hist,
  };
}
