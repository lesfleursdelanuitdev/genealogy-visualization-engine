/**
 * Core view-state patches for horizontal / vertical pedigree (famc, ancestor collapse).
 */

import type { TreeState } from "./types";
import type { ViewState } from "../types";
import type { GraphSnapshot } from "../graph";
import { pushHistory } from "./pushHistory";
import { getPersonDisplay } from "./getPersonDisplay";
import { chosenParentFamilyId, parentFamilyToClimb } from "../graph/queries";

/** A history entry for an ancestor-collapse change, with `personId` as the trigger (T28). */
function withEntry(state: TreeState, newViewState: ViewState, label: string, personId: string, graph: GraphSnapshot): TreeState {
  const { fullName, initials } = getPersonDisplay(graph, personId);
  const hist = pushHistory(state, state.rootId, newViewState, `${label} ${fullName}`, personId, {
    triggerPersonId: personId,
    triggerPersonFullName: fullName,
    triggerPersonInitials: initials,
  });
  return { ...state, viewState: newViewState, ...hist };
}

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

function setRootFamc(state: TreeState, familyXref: string | null): TreeState {
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

function setPersonFamc(state: TreeState, personId: string, familyXref: string | null): TreeState {
  if (!isPedigreeStrategy(state.strategyName)) return state;
  const v = vs(state);
  const pid = normPedigreeXref(personId);
  const rootKey = normPedigreeXref(state.rootId);
  const overrides = { ...(v.pedigreeFamcOverrides ?? {}) };
  const famNorm =
    familyXref != null && String(familyXref).trim() !== "" ? String(familyXref).trim() : null;

  if (pid === rootKey) {
    return setRootFamc(state, famNorm);
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

/** Hide the ancestors above `personId`; pushes "Hide ancestors of X". */
export function applyPedigreeCollapseAncestors(state: TreeState, personId: string, graph: GraphSnapshot): TreeState {
  if (!isPedigreeStrategy(state.strategyName)) return state;
  const v = vs(state);
  if (v.pedigreeAncestorCollapsePersonId === personId) return state;
  return withEntry(state, { ...v, pedigreeAncestorCollapsePersonId: personId }, "Hide ancestors of", personId, graph);
}

/** Show the hidden ancestors again; pushes "Show ancestors of X" for the person who was collapsed. */
export function applyPedigreeClearAncestorCollapse(state: TreeState, graph: GraphSnapshot): TreeState {
  if (!isPedigreeStrategy(state.strategyName)) return state;
  const v = vs(state);
  const collapsed = v.pedigreeAncestorCollapsePersonId;
  if (!collapsed) return state;
  return withEntry(state, { ...v, pedigreeAncestorCollapsePersonId: null }, "Show ancestors of", collapsed, graph);
}

const KIND_WORD: Record<string, string> = { birth: "birth ", adopted: "adoptive ", foster: "foster " };

/**
 * The card's "2 families" switch (T45, T47): when the family shown above `personId` changes,
 * push "Show birth parents of X" / "Show adoptive parents of X" / …; when it doesn't, nothing
 * changes and no entry is added.
 */
function withFamilyEntry(before: TreeState, after: TreeState, personId: string, graph: GraphSnapshot): TreeState {
  if (after === before) return before;
  const isRoot = normPedigreeXref(before.rootId) === personId;
  const shownBefore = parentFamilyToClimb(graph, personId, chosenParentFamilyId(vs(before), personId, isRoot));
  const shownAfter = parentFamilyToClimb(graph, personId, chosenParentFamilyId(vs(after), personId, isRoot));
  if (shownBefore?.id === shownAfter?.id) return before;
  const kind = shownAfter?.children.find((c) => c.id === personId)?.pedi;
  const word = kind == null ? "" : KIND_WORD[kind] ?? `${kind} `;
  return withEntry(before, vs(after), `Show ${word}parents of`, personId, graph);
}

/** Choose the root's parent family (PEDIGREE_SET_FAMC_FAMILY_XREF). */
export function applyPedigreeSetFamcFamilyXref(
  state: TreeState,
  familyXref: string | null,
  graph: GraphSnapshot
): TreeState {
  return withFamilyEntry(state, setRootFamc(state, familyXref), normPedigreeXref(state.rootId), graph);
}

/** Choose a person's parent family (PEDIGREE_SET_FAMC_FOR_PERSON): the card's switch. */
export function applyPedigreeSetFamcForPerson(
  state: TreeState,
  personId: string,
  familyXref: string | null,
  graph: GraphSnapshot
): TreeState {
  return withFamilyEntry(state, setPersonFamc(state, personId, familyXref), normPedigreeXref(personId), graph);
}
