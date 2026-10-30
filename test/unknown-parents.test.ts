/**
 * Unknown parents are per-family placeholders flagged _unknownPlaceholder (H4), and every
 * birth-family lookup uses the snapshot's one rule (T20).
 */
import { describe, it, expect } from "vitest";
import { graphOf, reduce, emptyState, buildPedigree, person, union } from "./helpers/graph";
import { NormalUnionNode, PersonNode, type ViewState } from "../src";

describe("unknown parents", () => {
  // C's father is unknown in @F1@ (husb ""); mother M.
  const fatherless = () =>
    graphOf({
      people: [person("M", "Mia"), person("C", "Cal")],
      unions: [union("@F1@", "", "M", ["C"])],
    });

  it("Show parents on the root makes the known mother the root", () => {
    const s1 = reduce(fatherless(), emptyState("C"), { type: "PARENTS", personId: "C" });
    expect(s1.rootId).toBe("M");
    expect((s1.viewState as ViewState).revealedUnions?.get("M")).toEqual(["@F1@:unknown-husb"]);
  });

  it("a real person called Unknown is not skipped as a placeholder", () => {
    const g = graphOf({
      people: [person("U", "Unknown", "Smith"), person("M"), person("C")],
      unions: [union("@F1@", "U", "M", ["C"])],
    });
    expect(reduce(g, emptyState("C"), { type: "PARENTS", personId: "C" }).rootId).toBe("U");
  });

  it("the pedigree shows an 'Unknown father' card for the placeholder", () => {
    const { root } = buildPedigree(fatherless(), "C");
    const parents = (root as PersonNode).children[0] as NormalUnionNode;
    expect(parents.left.content).toMatchObject({ firstName: "Unknown", lastName: "father", _unknownPlaceholder: true });
    expect(parents.right?.content.id).toBe("M");
  });

  it("Show parents follows the birth-family rule: the first birth family, not the last", () => {
    const g = graphOf({
      people: ["A", "B", "D", "E", "C"].map((id) => person(id)),
      unions: [union("@F1@", "A", "B", ["C"]), union("@F2@", "D", "E", ["C"])],
    });
    expect(reduce(g, emptyState("C"), { type: "PARENTS", personId: "C" }).rootId).toBe("A");
    const { root } = buildPedigree(g, "C");
    expect(((root as PersonNode).children[0] as NormalUnionNode).left.content.id).toBe("A");
  });
});
