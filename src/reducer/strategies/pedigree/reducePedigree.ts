import type { TreeAction, TreeState } from "../../types";
import { applySetCurrentDepth } from "../descendancy/applySetCurrentDepth";
import { applyPanToPerson } from "../descendancy/applyPanToPerson";

/**
 * Pedigree-specific reducer: depth and pan match descendancy helpers; other actions no-op.
 */
export function reducePedigree(state: TreeState, action: TreeAction): TreeState {
  switch (action.type) {
    case "SET_CURRENT_DEPTH":
      return applySetCurrentDepth(state, action.depth);
    case "PAN_TO_PERSON":
      return applyPanToPerson(state, action.personId);
    default:
      return state;
  }
}
