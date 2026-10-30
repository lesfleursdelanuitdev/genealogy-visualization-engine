import { buildTree, type BuildTreeResult } from "../builder/build";
import type { GraphSnapshot } from "../graph";
import type { ViewStrategyDescriptor } from "../strategies/ViewStrategyDescriptor";
import { descendancyDescriptor } from "../strategies/descendancy";
import type { ViewState } from "../types";
import type { ChartViewBuildAdapter } from "./ChartViewBuildAdapter";

/** Descendancy mode: the generic {@link buildTree} with the descendancy strategy and +N counts. */
export class DescendancyChartAdapter implements ChartViewBuildAdapter {
  readonly strategyName = "descendancy" as const;

  constructor(readonly graph: GraphSnapshot) {}

  getDescriptor(): ViewStrategyDescriptor {
    return descendancyDescriptor;
  }

  buildTreeResult(rootId: string, viewState: ViewState, maxDepth: number): BuildTreeResult {
    const descriptor = descendancyDescriptor;
    const graph = this.graph;
    const getHiddenCount = descriptor.getHiddenCount;
    return buildTree(rootId, descriptor.createBuildStrategy({ viewState, maxDepth }), {
      graph,
      maxDepth,
      getHiddenCount: getHiddenCount ? (personId) => getHiddenCount(graph, personId) : undefined,
    });
  }
}
