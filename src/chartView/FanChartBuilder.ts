import type { BuildTreeResult } from "../builder/build";
import type { FamilyTreeBuilder } from "../builder/FamilyTreeBuilder";
import type { ViewStrategyDescriptor } from "../strategies/ViewStrategyDescriptor";
import type { ViewState } from "../types";
import type { ChartViewBuildAdapter } from "./ChartViewBuildAdapter";
import { PedigreeChartBuilder } from "./PedigreeChartBuilder";
import { fanChartDescriptor } from "../strategies/fanChart/fanChartDescriptor";

/**
 * Same ancestor graph as pedigree; rendered with fan-chart polar geometry.
 */
export class FanChartBuilder implements ChartViewBuildAdapter {
  readonly strategyName = "fan_chart" as const;
  private readonly inner: PedigreeChartBuilder;

  constructor(dataBuilder: FamilyTreeBuilder) {
    this.inner = new PedigreeChartBuilder(dataBuilder);
  }

  getDescriptor(): ViewStrategyDescriptor {
    return fanChartDescriptor;
  }

  getDataBuilder(): FamilyTreeBuilder {
    return this.inner.getDataBuilder();
  }

  buildTreeResult(rootId: string, viewState: ViewState, maxDepth: number): BuildTreeResult {
    return this.inner.buildTreeResult(rootId, viewState, maxDepth);
  }
}
