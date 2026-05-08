/**
 * Core view-state patches for horizontal / vertical pedigree (famc, ancestor collapse).
 */

import type { TreeState } from "./types";
import type { ViewState } from "../types";

function vs(state: TreeState): ViewState {
  return state.viewState as ViewState;
}

function isPedigreeStrategy(strategyName: string): boolean {
  return (
    strategyName === "pedigree" ||
    strategyName === "vertical_pedigree" ||
    strategyName === "fan_chart"
  );
}

function normPedigreeXref(x: string): string {
  const s = String(x).trim();
  if (s === "") return s;
  return s.startsWith("@") ? s : `@${s.replace(/^@|@$/g, "")}@`;
}

export function applyPedigreeSetFamcFamilyXref(
  state: TreeState,
  familyXref: string | null
): TreeState {
  if (!isPedigreeStrategy(state.strategyName)) return state;
  const v = vs(state);
  const norm = familyXref != null && String(familyXref).trim() !== "" ? String(familyXref).trim() : null;
  const rootKey = normPedigreeXref(state.rootId);
  const overrides = { ...(v.pedigreeFamcOverrides ?? {}) };
  if (Object.prototype.hasOwnProperty.call(overrides, rootKey)) {
    delete overrides[rootKey];
  }
  const nextOverrides = Object.keys(overrides).length > 0 ? overrides : undefined;
  const nextVs: ViewState = { ...v, pedigreeFamcFamilyXref: norm };
  if (nextOverrides !== undefined) nextVs.pedigreeFamcOverrides = nextOverrides;
  else delete nextVs.pedigreeFamcOverrides;
  return { ...state, viewState: nextVs };
}

export function applyPedigreeSetFamcForPerson(
  state: TreeState,
  personId: string,
  familyXref: string | null
): TreeState {
  if (!isPedigreeStrategy(state.strategyName)) return state;
  const v = vs(state);
  const pid = normPedigreeXref(personId);
  const rootKey = normPedigreeXref(state.rootId);
  const overrides = { ...(v.pedigreeFamcOverrides ?? {}) };
  const famNorm =
    familyXref != null && String(familyXref).trim() !== "" ? String(familyXref).trim() : null;

  if (pid === rootKey) {
    return applyPedigreeSetFamcFamilyXref(state, famNorm);
  }

  if (famNorm == null) {
    delete overrides[pid];
  } else {
    overrides[pid] = famNorm;
  }
  const nextOverrides = Object.keys(overrides).length > 0 ? overrides : undefined;
  const nextVs: ViewState = { ...v };
  if (nextOverrides !== undefined) nextVs.pedigreeFamcOverrides = nextOverrides;
  else delete nextVs.pedigreeFamcOverrides;
  return { ...state, viewState: nextVs };
}

export function applyPedigreeCollapseAncestors(state: TreeState, personId: string): TreeState {
  if (!isPedigreeStrategy(state.strategyName)) return state;
  const v = vs(state);
  return {
    ...state,
    viewState: { ...v, pedigreeAncestorCollapsePersonId: personId },
  };
}

export function applyPedigreeClearAncestorCollapse(state: TreeState): TreeState {
  if (!isPedigreeStrategy(state.strategyName)) return state;
  const v = vs(state);
  return {
    ...state,
    viewState: { ...v, pedigreeAncestorCollapsePersonId: null },
  };
}
