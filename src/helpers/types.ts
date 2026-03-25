import type { TreeAction } from "../reducer";
import type { ViewState } from "../types";

export type PersonCardAction =
  | "showSpouses"
  | "showSiblings"
  | "parents"
  | "root"
  | "closeSpouse"
  | "closeLinkedUnion"
  | "expandDown" // Leaf-only down-arrow button; behavior TBD
  | "collapseSubtree"
  | "expandSubtree";

export interface HandlePersonCardActionContext {
  dispatch: (action: TreeAction) => void;
  setDrawerPersonId: (id: string | null) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setToast: (toast: { title: string; parts: { pedi: string; names: string }[] } | null) => void;
  setShowLegendModal: (show: boolean) => void;
  setShowLegendPanel: (show: boolean) => void;
  setRootDisplayNames: (value: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  triggerBlinkBack: () => void;
  settings: { autoLegendModal: boolean };
  /** For expandDown (SHOW_CHILDREN): current depth of the rendered graph (generations shown). */
  currentDepth?: number;
  /** For expandDown (SHOW_CHILDREN): true when current depth >= max depth (fixed global). */
  atMaxDepth?: boolean;
  /** For expandDown (SHOW_CHILDREN): max depth (fixed global), never overridden by current depth. */
  maxDepth?: number;
  /** For expandDown (SHOW_CHILDREN): current root person id (for debug logs). */
  rootId?: string;
  /** Current view state; used by closeSpouse to find partner before panning to them. */
  viewState?: ViewState;
  /** Schedule pan to center on this person after the next tree layout (e.g. after open/close spouse). */
  scheduleCenterOnPerson?: (personId: string) => void;
}
