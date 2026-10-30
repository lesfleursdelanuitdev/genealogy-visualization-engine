/**
 * Small graph fixtures and one place that knows how to run the engine on them.
 *
 * The bug repros call these helpers instead of the engine API directly, so when the API
 * changes (GraphSnapshot, chart sessions) only this file changes, not the repros.
 */
import {
  createGraphSnapshot,
  createChartSession,
  countDescendants,
  treeReducer,
  PersonNode,
  UnionNode,
  type ChartNode,
  type DescendancyPerson,
  type UnionRecord,
  type ViewState,
  type TreeState,
  type TreeAction,
  type ChartViewBuildAdapter,
  type GraphSnapshot,
  type BuildTreeResult,
} from "../../src";

export interface GraphFixture {
  people: DescendancyPerson[];
  unions: UnionRecord[];
}

/** Opaque handle to a loaded graph; what it is depends on the engine API under test. */
export type Graph = GraphSnapshot;

export function person(
  id: string,
  firstName: string = id,
  lastName = "Test",
  extra: Partial<DescendancyPerson> = {}
): DescendancyPerson {
  return { id, firstName, lastName, birthYear: null, deathYear: null, photoUrl: null, ...extra };
}

export function union(
  id: string,
  husb: string,
  wife: string,
  children: Array<string | { id: string; pedi: string }> = []
): UnionRecord {
  return {
    id,
    husb,
    wife,
    children: children.map((c) => (typeof c === "string" ? { id: c, pedi: "birth" } : c)),
  };
}

export function graphOf(fixture: GraphFixture): Graph {
  return createGraphSnapshot(fixture);
}

export function buildDescendancy(
  g: Graph,
  rootId: string,
  viewState: ViewState = {},
  maxDepth = 6
): BuildTreeResult {
  return createChartSession({ graph: g, viewState, options: { strategy: "descendancy", maxDepth } }).buildTree(rootId);
}

export function buildPedigree(
  g: Graph,
  rootId: string,
  viewState: ViewState = {},
  depth = 4
): BuildTreeResult {
  return createChartSession({ graph: g, viewState, options: { strategy: "pedigree", maxDepth: depth } }).buildTree(rootId);
}

/** Run one reducer action with `g` as the chart's graph. */
export function reduce(g: Graph, state: TreeState, action: TreeAction): TreeState {
  return treeReducer(state, action, g);
}

/** "+N hidden descendants" counter as one chart build sees it (one cache for all calls). */
export function hiddenCounter(g: Graph): (personId: string) => number {
  return (personId) => countDescendants(g, personId);
}

export function spousesOf(g: Graph, personId: string): readonly { spouseId: string; union: UnionRecord }[] {
  return g.spousesOf(personId);
}

export function personOf(g: Graph, personId: string): DescendancyPerson | undefined {
  return g.people.get(personId);
}

// ─── reading built trees ───────────────────────────────────────────────────

/** Every person card in a built tree, with its generation (0 = root row). */
export function cardsIn(root: ChartNode): Array<{ id: string; generation: number; shadow: boolean }> {
  const out: Array<{ id: string; generation: number; shadow: boolean }> = [];
  const visit = (node: ChartNode, generation: number): void => {
    if (node instanceof PersonNode) {
      out.push({ id: node.content.id, generation, shadow: node.content._isShadow === true });
      // A person whose children are all unions keeps those unions on its own row.
      const container = node.children.length > 0 && node.children.every((c) => c instanceof UnionNode);
      for (const c of node.children) visit(c, container ? generation : generation + 1);
      return;
    }
    if (node instanceof UnionNode) {
      for (const side of [node.left, node.right]) {
        if (side) out.push({ id: side.content.id, generation, shadow: side.content._isShadow === true });
      }
      for (const c of node.children) visit(c, generation + 1);
    }
  };
  visit(root, 0);
  return out;
}

export function personIdsIn(root: ChartNode): string[] {
  return cardsIn(root).map((c) => c.id);
}

/** Child person ids of the root's union with `spouseId`, in layout order (left to right). */
export function childIdsOfUnion(root: ChartNode, spouseId: string): string[] {
  for (const c of root.children) {
    if (c instanceof UnionNode && c.right?.content.id === spouseId) {
      return c.children.filter((n): n is PersonNode => n instanceof PersonNode).map((n) => n.content.id);
    }
  }
  return [];
}

export function emptyState(rootId: string, viewState: ViewState = {}): TreeState {
  return {
    strategyName: "descendancy",
    rootId,
    viewState,
    history: [{ rootId, viewState, strategyName: "descendancy", actionLabel: "Initial view" }],
    historyIndex: 0,
  };
}

/** People map behind a chart adapter returned by useChartViewFetch (empty when none). */
export function peopleOfAdapter(adapter: ChartViewBuildAdapter | null): ReadonlyMap<string, DescendancyPerson> {
  return adapter ? adapter.graph.people : new Map();
}
