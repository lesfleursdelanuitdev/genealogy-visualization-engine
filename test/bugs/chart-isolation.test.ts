/**
 * H1: one global builder was shared by every chart (fixed in refactor phases 1 and 3).
 *
 * The Gonsalves profile page loads its chart, then a modal opens a second chart with another
 * graph. Before, each chart had its own adapter but the build and the reducer read people
 * through a module-level "current builder", which then held the modal's graph. Now each chart
 * session and each bound reducer reads only its own graph.
 */
import { describe, it, expect } from "vitest";
import { person, union } from "../helpers/graph";
import {
  createChartSession,
  createGraphSnapshot,
  createTreeReducer,
  PersonNode,
  UnionNode,
  type TreeState,
  type ViewState,
} from "../../src";

const profileGraph = {
  people: [person("@A1@", "Alice"), person("@A2@", "Arthur"), person("@A3@", "Amy")],
  unions: [union("@FA@", "@A2@", "@A1@", ["@A3@"])],
};
const modalGraph = {
  people: [person("@B1@", "Bruno"), person("@B2@", "Bea")],
  unions: [union("@FB@", "@B1@", "@B2@", [])],
};

describe("H1: charts no longer share one global builder", () => {
  it("[H1 fixed] a second chart loading does not change what the first chart builds", () => {
    const profileChart = createChartSession({
      graph: profileGraph,
      viewState: { revealedUnions: new Map([["@A1@", ["@A2@"]]]) },
      options: { maxDepth: 4 },
    });
    const modalChart = createChartSession({ graph: modalGraph }); // the modal chart loads
    modalChart.buildChart("@B1@");

    const { root } = profileChart.buildChart("@A1@");
    expect(root).toBeInstanceOf(PersonNode);
    expect((root as PersonNode).content.firstName).toBe("Alice");
    const unionNode = root.children[0];
    expect(unionNode).toBeInstanceOf(UnionNode);
    expect((unionNode as UnionNode).children.map((c) => (c as PersonNode).content.id)).toEqual(["@A3@"]);
  });

  it("[H1 fixed] a second chart loading does not change what the first chart's reducer sees", () => {
    const profileReducer = createTreeReducer(createGraphSnapshot(profileGraph));
    const state: TreeState = {
      strategyName: "descendancy",
      rootId: "@A1@",
      viewState: {},
      history: [{ rootId: "@A1@", viewState: {}, strategyName: "descendancy" }],
      historyIndex: 0,
    };

    createTreeReducer(createGraphSnapshot(modalGraph)); // the modal chart loads

    const next = profileReducer(state, { type: "REVEAL_ALL_SPOUSES" });
    expect((next.viewState as ViewState).revealedUnions?.get("@A1@")).toEqual(["@A2@"]);
  });
});
