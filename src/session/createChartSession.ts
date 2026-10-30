/**
 * Chart sessions: the app-facing entry point (refactor plan phases 0 and 3).
 *
 *   graph ({ people, unions } or a GraphSnapshot) + view state + options
 *     → session.buildTree(rootId)   nodes, no positions
 *     → session.buildChart(rootId)  nodes laid out, unions marked, bounds measured
 *
 * A session holds everything it reads. There is no module-level "current" graph, so any
 * number of charts (a page chart and a modal chart, say) can build side by side.
 * Sessions are cheap: make a new one whenever the view state or options change. Build the
 * GraphSnapshot once per file and pass it in, so its indexes are shared, not rebuilt.
 */

import type { BuildTreeResult } from "../builder/build";
import { DEFAULT_MAX_DEPTH } from "../constants";
import { createChartAdapter } from "../chartView/createChartAdapter";
import type { ChartViewStrategyName } from "../chartView/chartViewStrategyName";
import { createGraphSnapshot, type GraphInput, type GraphSnapshot } from "../graph";
import type { ChartNode } from "../nodes";
import type { Bounds, LayoutBoundsOptions, ViewStrategyDescriptor } from "../strategies/ViewStrategyDescriptor";
import type { ViewState } from "../types";

export interface ChartSessionOptions {
  /** Chart type. Default "descendancy". */
  strategy?: ChartViewStrategyName;
  /** Generation cap for the build. Default {@link DEFAULT_MAX_DEPTH}. */
  maxDepth?: number;
  /** Card size and pedigree spacing, used by layout and bounds. */
  layout?: LayoutBoundsOptions;
}

export interface ChartSessionInit {
  /** The whole file's people and unions, or a snapshot already built from them. */
  graph: GraphSnapshot | GraphInput;
  /** What the user has opened (reducer `state.viewState`). Default `{}`. */
  viewState?: ViewState;
  options?: ChartSessionOptions;
}

/** A built and laid-out chart: what a renderer draws. */
export interface ChartLayout {
  root: ChartNode;
  bounds: Bounds;
  /** Offset that puts the chart's left edge at PADDING: draw at translate(baseX + pan.x, baseY + pan.y). */
  baseX: number;
  baseY: number;
  /** Deepest generation built (0 = root only). */
  maxDepthRendered: number;
}

export interface ChartSession {
  readonly graph: GraphSnapshot;
  readonly viewState: ViewState;
  readonly strategyName: ChartViewStrategyName;
  readonly maxDepth: number;
  readonly layoutOptions: LayoutBoundsOptions | undefined;
  /** Layout, bounds, connectors and constants for this chart type. */
  readonly descriptor: ViewStrategyDescriptor;
  buildTree(rootId: string): BuildTreeResult;
  buildChart(rootId: string): ChartLayout;
}

export function isGraphSnapshot(graph: GraphSnapshot | GraphInput): graph is GraphSnapshot {
  return typeof (graph as Partial<GraphSnapshot>).unionsOf === "function";
}

/** Lay out a built tree with a chart type's descriptor and measure it. Mutates node positions. */
export function layoutChart(
  descriptor: ViewStrategyDescriptor,
  built: BuildTreeResult,
  layoutOptions?: LayoutBoundsOptions
): ChartLayout {
  const { root, maxDepthRendered } = built;
  descriptor.layout(root, layoutOptions);
  descriptor.markUnions?.(root);
  const bounds = descriptor.getBounds(root, layoutOptions);
  const padding = descriptor.constants.PADDING;
  return { root, bounds, baseX: -bounds.minX + padding, baseY: padding, maxDepthRendered };
}

export function createChartSession(init: ChartSessionInit): ChartSession {
  const graph = isGraphSnapshot(init.graph) ? init.graph : createGraphSnapshot(init.graph);
  const viewState = init.viewState ?? {};
  const strategyName = init.options?.strategy ?? "descendancy";
  const maxDepth = init.options?.maxDepth ?? DEFAULT_MAX_DEPTH;
  const layoutOptions = init.options?.layout;
  const adapter = createChartAdapter(strategyName, graph);
  const descriptor = adapter.getDescriptor();

  const buildTree = (rootId: string): BuildTreeResult => adapter.buildTreeResult(rootId, viewState, maxDepth);

  return Object.freeze({
    graph,
    viewState,
    strategyName,
    maxDepth,
    layoutOptions,
    descriptor,
    buildTree,
    buildChart: (rootId: string): ChartLayout => layoutChart(descriptor, buildTree(rootId), layoutOptions),
  });
}
