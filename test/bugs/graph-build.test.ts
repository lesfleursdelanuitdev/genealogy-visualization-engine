/**
 * Audit bugs in the graph indexes and the descendancy build.
 * IDs follow docs/v0.1.0-progress.md ("Bug list").
 */
import { describe, it, expect } from "vitest";
import { knownBug } from "../helpers/bugs";
import { wideFamily } from "../helpers/fixtures";
import {
  graphOf,
  buildDescendancy,
  hiddenCounter,
  spousesOf,
  person,
  union,
  cardsIn,
  personIdsIn,
  childIdsOfUnion,
} from "../helpers/graph";

describe("H3: descendancy build cost", () => {
  // Fixed by the GraphSnapshot refactor (indexes built once, not copied per person).
  it(
    "[H3 fixed] builds 6,826 people with every partner revealed in under 300 ms (linear, not quadratic)",
    () => {
      const { fixture, revealedUnions } = wideFamily(4, 6);
      expect(fixture.people.length).toBe(6826);
      const g = graphOf(fixture);

      const start = performance.now();
      const { root } = buildDescendancy(g, "p0", { revealedUnions }, 7);
      const elapsed = performance.now() - start;

      expect(new Set(personIdsIn(root)).size).toBe(6826);
      expect(elapsed).toBeLessThan(300);
    },
    30_000
  );
});

describe("H4: unknown partners", () => {
  // Two families whose father is unknown. The wire format sends husb "" for both.
  const g = () =>
    graphOf({
      people: [person("M1", "Mary"), person("M2", "Martha"), person("C1"), person("C2")],
      unions: [union("@F1@", "", "M1", ["C1"]), union("@F2@", "", "M2", ["C2"])],
    });

  it("[H4 fixed] gives each family its own unknown partner, not one shared person", () => {
    const graph = g();
    const [m1Partner] = spousesOf(graph, "M1");
    const [m2Partner] = spousesOf(graph, "M2");
    expect(m1Partner.spouseId).not.toBe(m2Partner.spouseId);
  });

  it("[H4 fixed] the unknown partner of one family has no other families", () => {
    const graph = g();
    const [m1Partner] = spousesOf(graph, "M1");
    expect(spousesOf(graph, m1Partner.spouseId)).toHaveLength(1);
  });
});

describe("B04: two FAM records for the same couple", () => {
  knownBug("B04", "shows the children of both families when the partner is revealed", () => {
    const g = graphOf({
      people: [person("H"), person("W"), person("A"), person("B")],
      unions: [union("@F1@", "H", "W", ["A"]), union("@F2@", "H", "W", ["B"])],
    });
    const { root } = buildDescendancy(g, "H", { revealedUnions: new Map([["H", ["W"]]]) });
    const ids = personIdsIn(root);
    expect(ids).toContain("A");
    expect(ids).toContain("B");
  });

  it("shows both families' children when the partner is not revealed (catch-all)", () => {
    const g = graphOf({
      people: [person("H"), person("W"), person("A"), person("B")],
      unions: [union("@F1@", "H", "W", ["A"]), union("@F2@", "H", "W", ["B"])],
    });
    const ids = personIdsIn(buildDescendancy(g, "H").root);
    expect(ids).toContain("A");
    expect(ids).toContain("B");
  });
});

describe("B05: +N hidden descendant counts", () => {
  // R has children A and B. Their children C and D (cousins) marry and have E; E has F.
  // R's descendants are A, B, C, D, E, F; D's are E and F.
  const cousins = () =>
    graphOf({
      people: ["R", "Rs", "A", "As", "B", "Bs", "C", "D", "E", "Es", "F"].map((id) => person(id)),
      unions: [
        union("@F1@", "R", "Rs", ["A", "B"]),
        union("@F2@", "A", "As", ["C"]),
        union("@F3@", "B", "Bs", ["D"]),
        union("@F4@", "C", "D", ["E"]),
        union("@F5@", "E", "Es", ["F"]),
      ],
    });

  it("counts D's descendants as 2 when D is counted first", () => {
    expect(hiddenCounter(cousins())("D")).toBe(2);
  });

  knownBug("B05", "counts each descendant once under pedigree collapse", () => {
    expect(hiddenCounter(cousins())("R")).toBe(6);
  });

  knownBug("B05", "gives the same count for a person whatever was counted before", () => {
    const count = hiddenCounter(cousins());
    count("R");
    expect(count("D")).toBe(2);
  });
});

describe("B10: depth cap", () => {
  knownBug("B10", "a revealed partner row at the depth cap does not add a generation below the cap", () => {
    const g = graphOf({
      people: ["R", "S", "C", "D", "E"].map((id) => person(id)),
      unions: [union("@F1@", "R", "S", ["C"]), union("@F2@", "C", "D", ["E"])],
    });
    const revealedUnions = new Map([
      ["R", ["S"]],
      ["C", ["D"]],
    ]);
    const { root, maxDepthRendered } = buildDescendancy(g, "R", { revealedUnions }, 1);
    expect(cardsIn(root).filter((c) => c.generation > 1)).toEqual([]);
    expect(maxDepthRendered).toBeLessThanOrEqual(1);
  });
});

describe("S4 (suspected): sibling order", () => {
  it("lays out a family's children in the file's CHIL order", () => {
    const g = graphOf({
      people: ["H", "W", "c3", "c1", "c2"].map((id) => person(id)),
      unions: [union("@F1@", "H", "W", ["c3", "c1", "c2"])],
    });
    const { root } = buildDescendancy(g, "H", { revealedUnions: new Map([["H", ["W"]]]) });
    expect(childIdsOfUnion(root, "W")).toEqual(["c3", "c1", "c2"]);
  });

  it("orders hidden-partner children family by family, each in CHIL order", () => {
    const g = graphOf({
      people: ["H", "W1", "W2", "a2", "a1", "b1"].map((id) => person(id)),
      unions: [union("@F1@", "H", "W1", ["a2", "a1"]), union("@F2@", "H", "W2", ["b1"])],
    });
    const { root } = buildDescendancy(g, "H");
    const childRow = cardsIn(root)
      .filter((c) => c.generation === 1)
      .map((c) => c.id);
    expect(childRow).toEqual(["a2", "a1", "b1"]);
  });
});
