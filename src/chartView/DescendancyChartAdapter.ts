import type { BuildTreeResult } from "../builder/build";
import type { FamilyTreeBuilder } from "../builder/FamilyTreeBuilder";
import type { ViewStrategyDescriptor } from "../strategies/ViewStrategyDescriptor";
import { descendancyDescriptor } from "../strategies/descendancy";
import type { ViewState } from "../types";
import type { ChartViewBuildAdapter } from "./ChartViewBuildAdapter";

/** Descendancy mode: delegates build to {@link FamilyTreeBuilder.buildView} with strategy `descendancy`. */
export class DescendancyChartAdapter implements ChartViewBuildAdapter {
  readonly strategyName = "descendancy" as const;

  constructor(private readonly dataBuilder: FamilyTreeBuilder) {}

  getDescriptor(): ViewStrategyDescriptor {
    return descendancyDescriptor;
  }

  buildTreeResult(rootId: string, viewState: ViewState, maxDepth: number): BuildTreeResult {
    return this.dataBuilder.buildView(rootId, viewState, maxDepth, "descendancy");
  }

  getDataBuilder(): FamilyTreeBuilder {
    return this.dataBuilder;
  }
}
