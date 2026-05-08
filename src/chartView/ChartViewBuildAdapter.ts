import type { BuildTreeResult } from "../builder/build";
import type { FamilyTreeBuilder } from "../builder/FamilyTreeBuilder";
import type { ViewStrategyDescriptor } from "../strategies/ViewStrategyDescriptor";
import type { ViewState } from "../types";
import type { ChartViewStrategyName } from "./chartViewStrategyName";

/**
 * One chart view mode: produces a built tree + descriptor for layout/connectors/bounds.
 * Each {@link ChartViewStrategyName} maps to exactly one adapter implementation.
 */
export interface ChartViewBuildAdapter {
  readonly strategyName: ChartViewStrategyName;

  /** Layout, bounds, connectors, constants — same shape as {@link FamilyTreeBuilder} strategies. */
  getDescriptor(): ViewStrategyDescriptor;

  /** Build chart nodes from current reducer view state and depth cap. */
  buildTreeResult(rootId: string, viewState: ViewState, maxDepth: number): BuildTreeResult;

  /**
   * Underlying {@link FamilyTreeBuilder} for people/unions (global getters, depth sync).
   * Pedigree and descendancy both register this via {@link setCurrentBuilder}.
   */
  getDataBuilder(): FamilyTreeBuilder;
}
