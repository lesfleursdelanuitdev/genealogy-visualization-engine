import type { BuildTreeResult } from "../builder/build";
import type { GraphSnapshot } from "../graph";
import type { ViewStrategyDescriptor } from "../strategies/ViewStrategyDescriptor";
import type { ViewState } from "../types";
import type { ChartViewStrategyName } from "./chartViewStrategyName";

/**
 * One chart view mode over one graph: produces a built tree + descriptor for layout/connectors/bounds.
 * Each {@link ChartViewStrategyName} maps to exactly one adapter implementation.
 */
export interface ChartViewBuildAdapter {
  readonly strategyName: ChartViewStrategyName;

  /** The people and unions this adapter builds from. */
  readonly graph: GraphSnapshot;

  /** Layout, bounds, connectors, constants for this chart type. */
  getDescriptor(): ViewStrategyDescriptor;

  /** Build chart nodes from current reducer view state and depth cap. */
  buildTreeResult(rootId: string, viewState: ViewState, maxDepth: number): BuildTreeResult;
}
