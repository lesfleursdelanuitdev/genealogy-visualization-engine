/**
 * Engine issues found by the renderer's slice 1 (viz-react docs/extraction-plan.md §9), R1–R2.
 * R3–R5 (pan and zoom) are in test/touch.test.ts.
 */
import { describe, it, expect } from "vitest";
import { graphOf, reduce, emptyState, buildDescendancy, person, union } from "./helpers/graph";
import { NormalUnionNode, PersonNode, type TreeState, type ViewState } from "../src";

const vs = (s: TreeState) => s.viewState as ViewState;

describe("R1: a partner appears once per person", () => {
  // A and B have two FAM records (@F1@ with child C, @F2@ with child D); A also married E.
  const twoFams = () =>
    graphOf({
      people: ["A", "B", "C", "D", "E", "G"].map((id) => person(id)),
      unions: [union("@F1@", "A", "B", ["C"]), union("@F2@", "A", "B", ["D"]), union("@F3@", "A", "E", ["G"])],
    });

  function rowsOf(state: TreeState) {
    const { root } = buildDescendancy(twoFams(), state.rootId, vs(state));
    return (root as PersonNode).children
      .filter((c): c is NormalUnionNode => c instanceof NormalUnionNode)
      .map((u) => [u.right?.content.id, u.children.map((c) => (c as PersonNode).content.id)]);
  }

  it("Toggle all partners lists each partner once", () => {
    const s1 = reduce(twoFams(), emptyState("A"), { type: "REVEAL_ALL_SPOUSES" });
    expect(vs(s1).revealedUnions?.get("A")).toEqual(["B", "E"]);
  });

  it("Show all (drawer) lists each partner once", () => {
    const s1 = reduce(twoFams(), emptyState("A"), { type: "DRAWER_SELECT_ALL", personId: "A" });
    expect(vs(s1).revealedUnions?.get("A")).toEqual(["B", "E"]);
  });

  it("a couple with two FAM records is drawn as two separate unions, one per family", () => {
    const s1 = reduce(twoFams(), emptyState("A"), { type: "REVEAL_ALL_SPOUSES" });
    expect(rowsOf(s1)).toEqual([
      ["B", ["C"]],
      ["B", ["D"]],
      ["E", ["G"]],
    ]);
  });

  it("a partner listed twice in a saved view state is still drawn once per family", () => {
    expect(rowsOf(emptyState("A", { revealedUnions: new Map([["A", ["B", "B"]]]) }))).toEqual([
      ["B", ["C"]],
      ["B", ["D"]],
    ]);
  });
});

describe("R2: collapsing and expanding push labelled History entries (T28)", () => {
  const family = () =>
    graphOf({
      people: [person("R", "Rita", "Lopes"), person("S", "Sam", "Lopes"), person("C", "Cal", "Lopes"), person("P", "Pia", "Reis")],
      unions: [union("@F1@", "S", "R", ["C"]), union("@F0@", "", "P", ["R"])],
    });

  it("Hide descendants of X / Show descendants of X", () => {
    const g = family();
    const s1 = reduce(g, emptyState("R"), { type: "COLLAPSE_SUBTREE", personId: "C" });
    expect(s1.history[1]).toMatchObject({
      actionLabel: "Hide descendants of Cal Lopes",
      triggerPersonId: "C",
      triggerPersonFullName: "Cal Lopes",
      triggerPersonInitials: "CL",
    });
    const s2 = reduce(g, s1, { type: "EXPAND_SUBTREE", personId: "C" });
    expect(s2.history[2]).toMatchObject({ actionLabel: "Show descendants of Cal Lopes", triggerPersonId: "C" });
    expect(vs(s2).collapsedSubtrees).toBeUndefined();
    const back = reduce(g, s2, { type: "BACK" });
    expect(vs(back).collapsedSubtrees).toEqual(["C"]);
  });

  it("Hide ancestors of X / Show ancestors of X", () => {
    const g = family();
    const s0: TreeState = { ...emptyState("C"), strategyName: "pedigree" };
    const s1 = reduce(g, s0, { type: "PEDIGREE_COLLAPSE_ANCESTORS", personId: "R" });
    expect(s1.history[1]).toMatchObject({
      actionLabel: "Hide ancestors of Rita Lopes",
      triggerPersonId: "R",
      strategyName: "pedigree",
    });
    const s2 = reduce(g, s1, { type: "PEDIGREE_CLEAR_ANCESTOR_COLLAPSE" });
    expect(s2.history[2]).toMatchObject({ actionLabel: "Show ancestors of Rita Lopes", triggerPersonId: "R" });
    expect(vs(s2).pedigreeAncestorCollapsePersonId).toBeNull();
  });

  it("an action that changes nothing adds no entry", () => {
    const g = family();
    const s1 = reduce(g, emptyState("R"), { type: "COLLAPSE_SUBTREE", personId: "C" });
    expect(reduce(g, s1, { type: "COLLAPSE_SUBTREE", personId: "C" })).toBe(s1);
    expect(reduce(g, emptyState("R"), { type: "EXPAND_SUBTREE", personId: "C" }).history).toHaveLength(1);
    const ped: TreeState = { ...emptyState("C"), strategyName: "pedigree" };
    expect(reduce(g, ped, { type: "PEDIGREE_CLEAR_ANCESTOR_COLLAPSE" })).toBe(ped);
  });
});
