import type { BuildTreeResult } from "../builder/build";
import type { GraphSnapshot } from "../graph";
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

  constructor(readonly graph: GraphSnapshot) {
    this.inner = new PedigreeChartBuilder(graph);
  }

  getDescriptor(): ViewStrategyDescriptor {
    return fanChartDescriptor;
  }

  buildTreeResult(rootId: string, viewState: ViewState, maxDepth: number): BuildTreeResult {
    return this.inner.buildTreeResult(rootId, viewState, maxDepth);
  }
}
