/**
 * Core action handlers only. Strategy-specific actions are delegated in treeReducer.
 */

import type { TreeAction, TreeState } from "./types";
import { applyRoot } from "./applyRoot";
import { applyRootKeepView } from "./applyRootKeepView";
import { applySetViewStrategy } from "./applySetViewStrategy";
import { applyBack } from "./applyBack";
import { applyForward } from "./applyForward";
import { applyNavigateToIndex } from "./applyNavigateToIndex";
import { applyClearHistory } from "./applyClearHistory";
import { applyRestoreHistory } from "./applyRestoreHistory";
import {
  applyPedigreeClearAncestorCollapse,
  applyPedigreeCollapseAncestors,
  applyPedigreeSetFamcFamilyXref,
  applyPedigreeSetFamcForPerson,
} from "./applyPedigreeViewPatches";

export type Handler = (state: TreeState, action: TreeAction) => TreeState;

export const coreHandlers: Partial<Record<TreeAction["type"], Handler>> = {
  ROOT: (s, a) => {
    const x = a as Extract<TreeAction, { type: "ROOT" }>;
    return applyRoot(s, x.personId, x.pedigreeFamcFamilyXref);
  },
  ROOT_KEEP_VIEW: (s, a) =>
    applyRootKeepView(s, (a as Extract<TreeAction, { type: "ROOT_KEEP_VIEW" }>).personId),
  SET_VIEW_STRATEGY: (s, a) => {
    const x = a as Extract<TreeAction, { type: "SET_VIEW_STRATEGY" }>;
    return applySetViewStrategy(s, x.strategyName, x.pedigreeFamcFamilyXref);
  },
  BACK: (s) => applyBack(s),
  FORWARD: (s) => applyForward(s),
  NAVIGATE_TO_INDEX: (s, a) =>
    applyNavigateToIndex(s, (a as Extract<TreeAction, { type: "NAVIGATE_TO_INDEX" }>).index),
  CLEAR_HISTORY: (s) => applyClearHistory(s),
  RESTORE_HISTORY: (s, a) => {
    const { history, historyIndex } = a as Extract<TreeAction, { type: "RESTORE_HISTORY" }>;
    return applyRestoreHistory(s, history, historyIndex);
  },
  PEDIGREE_SET_FAMC_FAMILY_XREF: (s, a) =>
    applyPedigreeSetFamcFamilyXref(s, (a as Extract<TreeAction, { type: "PEDIGREE_SET_FAMC_FAMILY_XREF" }>).familyXref),
  PEDIGREE_SET_FAMC_FOR_PERSON: (s, a) => {
    const x = a as Extract<TreeAction, { type: "PEDIGREE_SET_FAMC_FOR_PERSON" }>;
    return applyPedigreeSetFamcForPerson(s, x.personId, x.familyXref);
  },
  PEDIGREE_COLLAPSE_ANCESTORS: (s, a) =>
    applyPedigreeCollapseAncestors(
      s,
      (a as Extract<TreeAction, { type: "PEDIGREE_COLLAPSE_ANCESTORS" }>).personId
    ),
  PEDIGREE_CLEAR_ANCESTOR_COLLAPSE: (s) => applyPedigreeClearAncestorCollapse(s),
};
