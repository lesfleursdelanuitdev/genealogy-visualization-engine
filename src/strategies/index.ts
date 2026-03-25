/**
 * View strategies for the chart. Each strategy defines how the tree is built
 * (which union nodes to create, traversal direction). Layout is strategy-specific
 * (descendancy = top-down; pedigree = bottom-up or side, TBD).
 */

export type { ViewStrategy, BuildContext } from "./ViewStrategy";
export type { ViewStrategyDescriptor, ConnectorHelpers, BuildStrategyOptions, Bounds, StrategyConstants } from "./ViewStrategyDescriptor";
export { DescendancyViewStrategy } from "./descendancy";
export { PedigreeViewStrategy } from "./pedigree";
