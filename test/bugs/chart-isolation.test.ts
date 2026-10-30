/**
 * H1: one global builder is shared by every chart.
 *
 * Reproduces what the Gonsalves profile page does: the profile chart loads its graph, then a
 * modal opens a second chart with another graph. Each chart has its own adapter, but the
 * build reads the people through the module-level "current builder", which now holds the
 * modal's graph.
 */
import { describe, expect } from "vitest";
import { knownBug } from "../helpers/bugs";
import { person, union } from "../helpers/graph";
import {
  FamilyTreeBuilder,
  DescendancyChartAdapter,
  setCurrentBuilder,
  PersonNode,
  UnionNode,
} from "../../src";

const profileGraph = {
  people: [person("@A1@", "Alice"), person("@A2@", "Arthur"), person("@A3@", "Amy")],
  unions: [union("@FA@", "@A2@", "@A1@", ["@A3@"])],
};
const modalGraph = {
  people: [person("@B1@", "Bruno"), person("@B2@", "Bea")],
  unions: [union("@FB@", "@B1@", "@B2@", [])],
};

describe("H1: charts share one global builder", () => {
  knownBug("H1", "a second chart loading does not change what the first chart builds", () => {
    const profileData = new FamilyTreeBuilder(profileGraph);
    setCurrentBuilder(profileData); // what useChartViewFetch does when the profile chart loads
    const profileChart = new DescendancyChartAdapter(profileData);

    const modalData = new FamilyTreeBuilder(modalGraph);
    setCurrentBuilder(modalData); // the modal chart loads

    const { root } = profileChart.buildTreeResult(
      "@A1@",
      { revealedUnions: new Map([["@A1@", ["@A2@"]]]) },
      4
    );
    expect(root).toBeInstanceOf(PersonNode);
    expect((root as PersonNode).content.firstName).toBe("Alice");
    const unionNode = root.children[0];
    expect(unionNode).toBeInstanceOf(UnionNode);
    expect((unionNode as UnionNode).children.map((c) => (c as PersonNode).content.id)).toEqual(["@A3@"]);
  });
});
