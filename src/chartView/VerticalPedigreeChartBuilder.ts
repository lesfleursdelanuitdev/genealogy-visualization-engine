import type { BuildTreeResult } from "../builder/build";
import type { FamilyTreeBuilder } from "../builder/FamilyTreeBuilder";
import type { ViewStrategyDescriptor } from "../strategies/ViewStrategyDescriptor";
import type { ViewState } from "../types";
import type { ChartViewBuildAdapter } from "./ChartViewBuildAdapter";
import { verticalPedigreeDescriptor } from "../strategies/verticalPedigree/verticalPedigreeDescriptor";
import { PedigreeChartBuilder } from "./PedigreeChartBuilder";

/**
 * Same ancestor graph as {@link PedigreeChartBuilder}; layout and descriptor are vertical (upward).
 */
export class VerticalPedigreeChartBuilder implements ChartViewBuildAdapter {
  readonly strategyName = "vertical_pedigree" as const;
  private readonly inner: PedigreeChartBuilder;

  constructor(dataBuilder: FamilyTreeBuilder) {
    this.inner = new PedigreeChartBuilder(dataBuilder);
  }

  getDescriptor(): ViewStrategyDescriptor {
    return verticalPedigreeDescriptor;
  }

  getDataBuilder(): FamilyTreeBuilder {
    return this.inner.getDataBuilder();
  }

  buildTreeResult(rootId: string, viewState: ViewState, maxDepth: number): BuildTreeResult {
    return this.inner.buildTreeResult(rootId, viewState, maxDepth);
  }
}
