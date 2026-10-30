/**
 * Chart sessions (refactor phase 3): each chart owns its graph through
 * createChartSession({ graph, viewState, options }); nothing is shared through module state.
 */
import { describe, it, expect } from "vitest";
import {
  createChartSession,
  createGraphSnapshot,
  createTreeReducer,
  treeReducer,
  PersonNode,
  UnionNode,
  NormalUnionNode,
  PADDING,
  PERSON_HEIGHT,
  VERTICAL_GAP,
  type GraphInput,
  type TreeState,
  type ViewState,
} from "../src";
import { person, union, emptyState } from "./helpers/graph";

// Ann + Ben → Cal; Cal's parents are Ann and Ben; Ann's parents are Dee and Eli.
const family = (): GraphInput => ({
  people: [person("ann", "Ann"), person("ben", "Ben"), person("cal", "Cal"), person("dee", "Dee"), person("eli", "Eli")],
  unions: [union("@F1@", "ben", "ann", ["cal"]), union("@F0@", "eli", "dee", ["ann"])],
});

const revealBen: ViewState = { revealedUnions: new Map([["ann", ["ben"]]]) };

function rootPerson(root: unknown): PersonNode {
  expect(root).toBeInstanceOf(PersonNode);
  return root as PersonNode;
}

describe("createChartSession", () => {
  it("builds a descendancy tree from { people, unions }", () => {
    const session = createChartSession({ graph: family(), viewState: revealBen });
    const { root } = session.buildTree("ann");
    expect(rootPerson(root).content.firstName).toBe("Ann");
    const u = root.children[0] as UnionNode;
    expect(u.right?.content.id).toBe("ben");
    expect(u.children.map((c) => (c as PersonNode).content.id)).toEqual(["cal"]);
  });

  it("uses a snapshot it is given as is, so sessions can share one", () => {
    const graph = createGraphSnapshot(family());
    expect(createChartSession({ graph }).graph).toBe(graph);
  });

  it("defaults to the descendancy chart and an empty view state", () => {
    const session = createChartSession({ graph: family() });
    expect(session.strategyName).toBe("descendancy");
    expect(session.viewState).toEqual({});
  });

  it("builds the ancestors for the pedigree, vertical pedigree and fan charts", () => {
    for (const strategy of ["pedigree", "vertical_pedigree", "fan_chart"] as const) {
      const session = createChartSession({ graph: family(), options: { strategy } });
      const { root } = session.buildTree("ann");
      const parents = rootPerson(root).children[0] as NormalUnionNode;
      expect([parents.left.content.id, parents.right?.content.id], strategy).toEqual(["eli", "dee"]);
    }
  });

  it("buildChart lays the tree out and measures it", () => {
    const session = createChartSession({ graph: family(), viewState: revealBen, options: { maxDepth: 3 } });
    const chart = session.buildChart("ann");
    const child = (chart.root.children[0] as UnionNode).children[0];
    expect(child.y).toBe(PERSON_HEIGHT + VERTICAL_GAP);
    expect(chart.bounds.maxX).toBeGreaterThan(chart.bounds.minX);
    expect(chart.baseX).toBe(-chart.bounds.minX + PADDING);
    expect(chart.baseY).toBe(PADDING);
    expect(chart.maxDepthRendered).toBe(1);
  });

  it("passes layout options to the layout", () => {
    const session = createChartSession({
      graph: family(),
      viewState: revealBen,
      options: { layout: { personHeight: 100 } },
    });
    const chart = session.buildChart("ann");
    const child = (chart.root.children[0] as UnionNode).children[0];
    expect(child.y).toBe(100 + VERTICAL_GAP);
  });

  it("passes maxDepth to the build", () => {
    // No partner revealed: a revealed row at the cap still goes one deeper (bug B10).
    const capped = (maxDepth: number) => createChartSession({ graph: family(), options: { maxDepth } });
    expect(capped(0).buildTree("ann").maxDepthRendered).toBe(0);
    expect(capped(1).buildTree("ann").maxDepthRendered).toBe(1);
  });

  it("two sessions on different graphs build independently, in any order", () => {
    const a = createChartSession({ graph: { people: [person("x", "Xena")], unions: [] } });
    const b = createChartSession({ graph: { people: [person("x", "Xavier")], unions: [] } });
    expect(rootPerson(b.buildTree("x").root).content.firstName).toBe("Xavier");
    expect(rootPerson(a.buildTree("x").root).content.firstName).toBe("Xena");
    expect(rootPerson(b.buildChart("x").root).content.firstName).toBe("Xavier");
  });
});

describe("reducer bound to a graph", () => {
  const start = (): TreeState => emptyState("ann");

  it("createTreeReducer(graph) reads that graph", () => {
    const reduce = createTreeReducer(createGraphSnapshot(family()));
    const next = reduce(start(), { type: "REVEAL_ALL_SPOUSES" });
    expect((next.viewState as ViewState).revealedUnions?.get("ann")).toEqual(["ben"]);
  });

  it("treeReducer(state, action, graph) reads the graph passed in", () => {
    const next = treeReducer(start(), { type: "ROOT", personId: "cal" }, createGraphSnapshot(family()));
    expect(next.history[next.historyIndex].rootPersonFullName).toBe("Cal Test");
  });

  it("two reducers on different graphs do not see each other's data", () => {
    const reduceA = createTreeReducer(createGraphSnapshot(family()));
    createTreeReducer(createGraphSnapshot({ people: [person("ann", "Other")], unions: [] }));
    const next = reduceA(start(), { type: "ROOT", personId: "ann" });
    expect(next.history[next.historyIndex].rootPersonFullName).toBe("Ann Test");
  });

  it("without a graph, actions that need one leave the state unchanged", () => {
    const s0 = start();
    expect(treeReducer(s0, { type: "PARENTS", personId: "ann" })).toBe(s0);
  });
});
