/**
 * GraphSnapshot: the engine's one input, `{ people, unions }` for the whole file, with the
 * derived indexes built once (refactor plan phase 1).
 */
import { describe, it, expect } from "vitest";
import {
  createGraphSnapshot,
  unknownPartnerId,
  isUnknownPartnerId,
  buildTree,
  DescendancyViewStrategy,
  PersonNode,
  UnionNode,
  type GraphInput,
} from "../src";
import { person, union } from "./helpers/graph";

// John + Mary → Ann (birth), Bob (adopted); John + Kate → Cid. Ann is also adopted by Kate + Lee.
const input = (): GraphInput => ({
  people: ["john", "mary", "kate", "lee", "ann", "bob", "cid"].map((id) => person(id)),
  unions: [
    union("@F1@", "john", "mary", ["ann", { id: "bob", pedi: "adopted" }]),
    union("@F2@", "john", "kate", ["cid"]),
    union("@F3@", "lee", "kate", [{ id: "ann", pedi: "adopted" }]),
  ],
});

describe("createGraphSnapshot", () => {
  it("indexes people by id", () => {
    const g = createGraphSnapshot(input());
    expect(g.people.get("ann")?.firstName).toBe("ann");
    expect(g.people.size).toBe(7);
  });

  it("indexes unions by id and lists them in input order", () => {
    const g = createGraphSnapshot(input());
    expect(g.unionById.get("@F2@")?.wife).toBe("kate");
    expect(g.unions.map((u) => u.id)).toEqual(["@F1@", "@F2@", "@F3@"]);
  });

  it("gives a union without an id the id husb-wife", () => {
    const g = createGraphSnapshot({
      people: [person("a"), person("b")],
      unions: [{ husb: "a", wife: "b", children: [] }],
    });
    expect(g.unions[0].id).toBe("a-b");
    expect(g.unionById.get("a-b")?.husb).toBe("a");
  });

  it("lists a person's unions as a partner, in input order", () => {
    const g = createGraphSnapshot(input());
    expect(g.unionsOf("john").map((u) => u.id)).toEqual(["@F1@", "@F2@"]);
    expect(g.unionsOf("kate").map((u) => u.id)).toEqual(["@F2@", "@F3@"]);
    expect(g.unionsOf("ann")).toEqual([]);
  });

  it("lists the unions a person is a child of", () => {
    const g = createGraphSnapshot(input());
    expect(g.parentUnionsOf("ann").map((u) => u.id)).toEqual(["@F1@", "@F3@"]);
    expect(g.parentUnionsOf("john")).toEqual([]);
  });

  it("picks the birth family as a child's birth union, else the first family", () => {
    const g = createGraphSnapshot(input());
    expect(g.birthUnionByChild.get("ann")?.id).toBe("@F1@");
    expect(g.birthUnionByChild.get("bob")?.id).toBe("@F1@"); // adopted only: first family
    const adoptedFirst = createGraphSnapshot({
      people: [],
      unions: [union("@FA@", "a1", "a2", [{ id: "c", pedi: "adopted" }]), union("@FB@", "b1", "b2", ["c"])],
    });
    expect(adoptedFirst.birthUnionByChild.get("c")?.id).toBe("@FB@");
  });

  it("lists a person's children across all their unions, once each", () => {
    const g = createGraphSnapshot({
      people: [],
      unions: [union("@F1@", "h", "w1", ["a", "b"]), union("@F2@", "h", "w2", ["b", "c"])],
    });
    expect(g.childrenOf("h")).toEqual(["a", "b", "c"]);
  });

  it("lists a person's partners with the union they share", () => {
    const g = createGraphSnapshot(input());
    expect(g.spousesOf("kate").map((s) => [s.spouseId, s.union.id])).toEqual([
      ["john", "@F2@"],
      ["lee", "@F3@"],
    ]);
  });

  it("adds an Unknown person for a partner id that is not in people", () => {
    const g = createGraphSnapshot({ people: [person("w")], unions: [union("@F1@", "ghost", "w", [])] });
    expect(g.people.get("ghost")).toMatchObject({ id: "ghost", firstName: "Unknown", lastName: "" });
  });

  it("does not change the input", () => {
    const i = input();
    const before = JSON.stringify(i);
    createGraphSnapshot(i);
    expect(JSON.stringify(i)).toBe(before);
  });
});

describe("buildTree reads only the graph it is given", () => {
  it("builds a descendancy tree from an explicit snapshot", () => {
    const g = createGraphSnapshot(input());
    const strategy = new DescendancyViewStrategy({ revealedUnions: new Map([["john", ["mary"]]]) }, 4);
    const { root } = buildTree("john", strategy, { graph: g, maxDepth: 4 });
    expect(root).toBeInstanceOf(PersonNode);
    const maryUnion = root.children.find((c) => c instanceof UnionNode && c.right?.content.id === "mary");
    expect(maryUnion?.children.map((c) => (c as PersonNode).content.id)).toEqual(["ann", "bob"]);
  });

  it("two snapshots build independently, in any order", () => {
    const a = createGraphSnapshot({ people: [person("x", "Xena")], unions: [] });
    const b = createGraphSnapshot({ people: [person("x", "Xavier")], unions: [] });
    const strategy = new DescendancyViewStrategy({}, 2);
    const fromB = buildTree("x", strategy, { graph: b, maxDepth: 2 }).root as PersonNode;
    const fromA = buildTree("x", strategy, { graph: a, maxDepth: 2 }).root as PersonNode;
    expect(fromA.content.firstName).toBe("Xena");
    expect(fromB.content.firstName).toBe("Xavier");
  });
});

describe("unknown partners (H4)", () => {
  // Two families whose father is unknown, as the Gonsalves wire format sends them (husb "").
  const fatherless = () =>
    createGraphSnapshot({
      people: [person("M1"), person("M2"), person("C1"), person("C2")],
      unions: [union("@F1@", "", "M1", ["C1"]), union("@F2@", "", "M2", ["C2"])],
    });

  it("gives each family its own placeholder: <familyId>:unknown-husb / -wife", () => {
    const g = fatherless();
    expect(g.unionById.get("@F1@")?.husb).toBe("@F1@:unknown-husb");
    expect(g.unionById.get("@F2@")?.husb).toBe("@F2@:unknown-husb");
    expect(unknownPartnerId("@F3@", "wife")).toBe("@F3@:unknown-wife");
  });

  it("adds the placeholder as an Unknown person flagged _unknownPlaceholder", () => {
    const p = fatherless().people.get("@F1@:unknown-husb");
    expect(p).toMatchObject({ firstName: "Unknown", lastName: "", _unknownPlaceholder: true, gender: "Male" });
  });

  it("flags a placeholder the converter already sent, and a partner id missing from people", () => {
    const g = createGraphSnapshot({
      people: [person("W"), person("@F1@:unknown-husb", "Unknown", "")],
      unions: [union("@F1@", "@F1@:unknown-husb", "W", []), union("@F2@", "ghost", "W", [])],
    });
    expect(g.people.get("@F1@:unknown-husb")?._unknownPlaceholder).toBe(true);
    expect(g.people.get("ghost")?._unknownPlaceholder).toBe(true);
    expect(isUnknownPartnerId("@F1@:unknown-husb")).toBe(true);
    expect(isUnknownPartnerId("@I1@")).toBe(false);
  });

  it("does not flag a real person who happens to be called Unknown", () => {
    const g = createGraphSnapshot({ people: [person("@I9@", "Unknown", "")], unions: [] });
    expect(g.people.get("@I9@")?._unknownPlaceholder).toBeUndefined();
  });
});

describe("birth family: one rule (T20)", () => {
  it("is the first family listing the child as birth, in family order", () => {
    const g = createGraphSnapshot({
      people: [],
      unions: [union("@F1@", "a", "b", ["c"]), union("@F2@", "d", "e", ["c"])],
    });
    expect(g.birthUnionByChild.get("c")?.id).toBe("@F1@");
  });

  it("prefers a birth family over an earlier adoptive one, else takes the first family", () => {
    const g = createGraphSnapshot({
      people: [],
      unions: [
        union("@FA@", "a1", "a2", [{ id: "c", pedi: "adopted" }, { id: "d", pedi: "adopted" }]),
        union("@FB@", "b1", "b2", ["c"]),
        union("@FC@", "c1", "c2", [{ id: "d", pedi: "foster" }]),
      ],
    });
    expect(g.birthUnionByChild.get("c")?.id).toBe("@FB@");
    expect(g.birthUnionByChild.get("d")?.id).toBe("@FA@");
  });

  it("follows the FAMC order from the person's record when given", () => {
    const g = createGraphSnapshot({
      people: [],
      unions: [union("@F1@", "a", "b", ["c"]), union("@F2@", "d", "e", ["c"]), union("@F3@", "f", "g", ["c"])],
      famcOrder: new Map([["c", ["@F2@", "@F1@"]]]),
    });
    expect(g.parentUnionsOf("c").map((u) => u.id)).toEqual(["@F2@", "@F1@", "@F3@"]);
    expect(g.birthUnionByChild.get("c")?.id).toBe("@F2@");
  });
});
