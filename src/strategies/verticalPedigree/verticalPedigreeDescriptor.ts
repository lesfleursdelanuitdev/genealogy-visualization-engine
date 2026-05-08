/**
 * Vertical pedigree: ancestors grow upward; same build/connectors as LTR pedigree.
 */

import type { ViewStrategyDescriptor, BuildStrategyOptions } from "../ViewStrategyDescriptor";
import { PedigreeViewStrategy } from "../pedigree/PedigreeViewStrategy";
import { layoutVerticalPedigree } from "./verticalPedigreeLayout";
import { markUnions } from "../descendancy/layout";
import { getBounds } from "../descendancy/bounds";
import * as dims from "../descendancy/constants";
import { DEFAULT_MAX_DEPTH } from "../../constants";
import { pedigreeConnectors, getPedigreeConnectors } from "../pedigree/pedigreeConnectionPoints";
import { getInitialViewState } from "../../reducer/strategies/pedigree/getInitialViewState";

export const verticalPedigreeDescriptor: ViewStrategyDescriptor = {
  createBuildStrategy(opts: BuildStrategyOptions) {
    return new PedigreeViewStrategy(opts.viewState ?? {}, opts.maxDepth ?? DEFAULT_MAX_DEPTH);
  },

  layout: layoutVerticalPedigree,

  markUnions,

  connectors: pedigreeConnectors,

  getConnectors: getPedigreeConnectors,

  getBounds,

  constants: {
    PADDING: dims.PADDING,
    PERSON_WIDTH: dims.PERSON_WIDTH,
    PERSON_HEIGHT: dims.PERSON_HEIGHT,
    CONNECTOR_WIDTH: dims.CONNECTOR_WIDTH,
    DIAMOND_SIZE: dims.DIAMOND_SIZE,
    GAP: dims.GAP,
    VERTICAL_GAP: dims.VERTICAL_GAP,
    SIBLING_COLORS: dims.SIBLING_COLORS,
  },

  getInitialViewState,
};
