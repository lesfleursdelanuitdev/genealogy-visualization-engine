import type { BuildTreeResult } from "../builder/build";
import type { GraphSnapshot } from "../graph";
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

  constructor(readonly graph: GraphSnapshot) {
    this.inner = new PedigreeChartBuilder(graph);
  }

  getDescriptor(): ViewStrategyDescriptor {
    return verticalPedigreeDescriptor;
  }

  buildTreeResult(rootId: string, viewState: ViewState, maxDepth: number): BuildTreeResult {
    return this.inner.buildTreeResult(rootId, viewState, maxDepth);
  }
}
