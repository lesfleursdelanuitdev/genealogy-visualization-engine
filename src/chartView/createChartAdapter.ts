import type { GraphSnapshot } from "../graph";
import type { ChartViewBuildAdapter } from "./ChartViewBuildAdapter";
import type { ChartViewStrategyName } from "./chartViewStrategyName";
import { DescendancyChartAdapter } from "./DescendancyChartAdapter";
import { PedigreeChartBuilder } from "./PedigreeChartBuilder";
import { VerticalPedigreeChartBuilder } from "./VerticalPedigreeChartBuilder";
import { FanChartBuilder } from "./FanChartBuilder";

/** The adapter for one chart type over one graph. */
export function createChartAdapter(strategyName: ChartViewStrategyName, graph: GraphSnapshot): ChartViewBuildAdapter {
  switch (strategyName) {
    case "pedigree":
      return new PedigreeChartBuilder(graph);
    case "vertical_pedigree":
      return new VerticalPedigreeChartBuilder(graph);
    case "fan_chart":
      return new FanChartBuilder(graph);
    case "descendancy":
      return new DescendancyChartAdapter(graph);
  }
}
