import type { TreeAction, TreeState } from "../../types";
import type { GraphSnapshot } from "../../../graph";
import { applySetCurrentDepth } from "../descendancy/applySetCurrentDepth";
import { applyPanToPerson } from "../descendancy/applyPanToPerson";
import { applyShowAncestors } from "./applyShowAncestors";

/**
 * Pedigree-specific reducer: depth and pan match descendancy helpers; other actions no-op.
 */
export function reducePedigree(state: TreeState, action: TreeAction, graph: GraphSnapshot): TreeState {
  switch (action.type) {
    case "SET_CURRENT_DEPTH":
      return applySetCurrentDepth(state, action.depth);
    case "PAN_TO_PERSON":
      return applyPanToPerson(state, action.personId, graph);
    case "SHOW_HIDDEN":
      return applyShowAncestors(state, action.personId, graph);
    default:
      return state;
  }
}
