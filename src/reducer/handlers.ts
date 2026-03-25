/**
 * Core action handlers only. Strategy-specific actions are delegated in treeReducer.
 */

import type { TreeAction, TreeState } from "./types";
import { applyRoot } from "./applyRoot";
import { applyRootKeepView } from "./applyRootKeepView";
import { applyBack } from "./applyBack";
import { applyForward } from "./applyForward";
import { applyNavigateToIndex } from "./applyNavigateToIndex";
import { applyClearHistory } from "./applyClearHistory";
import { applyRestoreHistory } from "./applyRestoreHistory";

export type Handler = (state: TreeState, action: TreeAction) => TreeState;

export const coreHandlers: Partial<Record<TreeAction["type"], Handler>> = {
  ROOT: (s, a) => applyRoot(s, (a as Extract<TreeAction, { type: "ROOT" }>).personId),
  ROOT_KEEP_VIEW: (s, a) =>
    applyRootKeepView(s, (a as Extract<TreeAction, { type: "ROOT_KEEP_VIEW" }>).personId),
  BACK: (s) => applyBack(s),
  FORWARD: (s) => applyForward(s),
  NAVIGATE_TO_INDEX: (s, a) =>
    applyNavigateToIndex(s, (a as Extract<TreeAction, { type: "NAVIGATE_TO_INDEX" }>).index),
  CLEAR_HISTORY: (s) => applyClearHistory(s),
  RESTORE_HISTORY: (s, a) => {
    const { history, historyIndex } = a as Extract<TreeAction, { type: "RESTORE_HISTORY" }>;
    return applyRestoreHistory(s, history, historyIndex);
  },
};
