/**
 * Descriptor for a chart view strategy. Everything needed for a view (build, layout, connectors)
 * is available from builder.viewStrategies[name] or builder.getCurrentStrategy().
 */

import type { ChartNode } from "../nodes";
import type { ViewStrategy } from "./ViewStrategy";
import type { ViewState } from "../types";

/** Options passed when creating a build strategy (matches FamilyTreeBuildOptions). */
export interface BuildStrategyOptions {
  viewState?: ViewState;
  maxDepth?: number;
}

/** Connector geometry and visibility for drawing lines. */
export interface ConnectorHelpers {
  hasIncomingConnector(node: ChartNode): boolean;
  incomingX(node: ChartNode): number;
  incomingY(node: ChartNode): number;
  outgoingX(node: ChartNode): number;
  outgoingY(node: ChartNode): number;
  /** PersonNode whose children are all union nodes (same depth). Used for connector logic. */
  isContainer?(node: ChartNode): boolean;
}

/** Options for layout and bounds when person card height varies by display settings. */
export interface LayoutBoundsOptions {
  personHeight?: number;
}

/** Bounding box of the laid-out tree. */
export interface Bounds {
  minX: number;
  maxX: number;
  maxY: number;
}

/** Strategy-specific dimensions/constants (padding, card size, etc.). Discoverable via descriptor.constants. */
export interface StrategyConstants {
  PADDING: number;
  PERSON_WIDTH?: number;
  PERSON_HEIGHT?: number;
  CONNECTOR_WIDTH?: number;
  DIAMOND_SIZE?: number;
  GAP?: number;
  VERTICAL_GAP?: number;
  SIBLING_COLORS?: Record<string, string>;
}

/**
 * Full strategy descriptor: build, layout, connectors, bounds, and constants.
 * Stored in builder.viewStrategies[name]; use builder.getCurrentStrategy() for the current view.
 */
export interface ViewStrategyDescriptor {
  /** Create the build strategy (union nodes, recursion) for the given options. */
  createBuildStrategy(opts: BuildStrategyOptions): ViewStrategy;

  /** Optional: at max depth, return count for +N badge. */
  getHiddenCount?: (personId: string) => number;

  /** Assign x, y, _computedWidth to the tree. Called after build. */
  layout(root: ChartNode, options?: LayoutBoundsOptions): void;

  /** Optional: mark primary/secondary unions (e.g. for connector styling). */
  markUnions?(root: ChartNode): void;

  /** Connector geometry and visibility for drawing lines. */
  connectors: ConnectorHelpers;

  /** Optional: return connector helpers that use the given person height (for dynamic card height). */
  getConnectors?(personHeight: number): ConnectorHelpers;

  /** Compute bounding box of the laid-out tree. */
  getBounds(root: ChartNode, options?: LayoutBoundsOptions): Bounds;

  /** Strategy-specific constants (padding, dimensions) for viewport and UI. */
  constants: StrategyConstants;

  /** Optional: default view state for this strategy (used by tree reducer ROOT and initial state). */
  getInitialViewState?: () => unknown;
}
