/**
 * Descendancy strategy descriptor: build, layout, connectors, bounds, constants.
 * Registered in builder.viewStrategies["descendancy"].
 */

import type { ChartNode } from "../../nodes";
import type { ViewStrategyDescriptor, BuildStrategyOptions, ConnectorHelpers } from "../ViewStrategyDescriptor";
import { DescendancyViewStrategy } from "./DescendancyViewStrategy";
import { layout, markUnions, isContainer } from "./layout";
import {
  getConnectors as getConnectorsImpl,
  hasIncomingConnector,
  incomingX,
  incomingY,
  outgoingX,
  outgoingY,
} from "./connectionPoints";
import { countDescendants } from "./build";
import { getBounds } from "./bounds";
import * as dims from "./constants";
import { getInitialViewState } from "../../reducer/strategies/descendancy/getInitialViewState";
import { DEFAULT_MAX_DEPTH } from "../../constants";

export const descendancyDescriptor: ViewStrategyDescriptor = {
  createBuildStrategy(opts: BuildStrategyOptions) {
    return new DescendancyViewStrategy(
      opts.viewState ?? {},
      opts.maxDepth ?? DEFAULT_MAX_DEPTH
    );
  },

  getHiddenCount: countDescendants,

  layout,

  markUnions,

  connectors: {
    hasIncomingConnector,
    incomingX,
    incomingY,
    outgoingX,
    outgoingY,
    isContainer,
  },

  getConnectors: getConnectorsImpl,

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

/** Default connectors (descendancy) for use when no builder/strategy is set. */
export const defaultConnectors: ConnectorHelpers = descendancyDescriptor.connectors;
