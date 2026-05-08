/** View strategies that have a dedicated chart builder + reducer registration. */
export type ChartViewStrategyName =
  | "descendancy"
  | "pedigree"
  | "vertical_pedigree"
  | "fan_chart";

export const CHART_VIEW_STRATEGIES: ChartViewStrategyName[] = [
  "descendancy",
  "pedigree",
  "vertical_pedigree",
  "fan_chart",
];

export function isChartViewStrategyName(s: string): s is ChartViewStrategyName {
  return (
    s === "descendancy" ||
    s === "pedigree" ||
    s === "vertical_pedigree" ||
    s === "fan_chart"
  );
}
