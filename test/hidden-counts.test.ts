/**
 * T30: "+N" on all four charts. `_hiddenCount` on a card = distinct people hidden beyond it in
 * the chart's direction (descendants, or ancestors for the pedigree, vertical pedigree and fan),
 * at the depth limit or on a collapsed branch. Tapping the chip (SHOW_HIDDEN) shows one more
 * generation for that branch only and pushes a labelled history entry.
 */
import { describe, it, expect } from "vitest";
import {
  graphOf,
  buildDescendancy,
  buildPedigree,
  reduce,
  emptyState,
  person,
  union,
  type GraphFixture,
} from "./helpers/graph";
import {
  countAncestors,
  countDescendants,
  createChartSession,
  NormalUnionNode,
  PersonNode,
  type ChartNode,
  type TreeState,
  type ViewState,
} from "../src";

/** Every person card in a pedigree tree, with generation and hidden count. */
function pedigreeCards(root: ChartNode): Map<string, { gen: number; hidden: number | undefined }> {
  const out = new Map<string, { gen: number; hidden: number | undefined }>();
  const visit = (p: PersonNode, gen: number) => {
    out.set(p.content.id, { gen, hidden: p.content._hiddenCount });
    const u = p.children[0];
    if (u instanceof NormalUnionNode) {
      visit(u.left, gen + 1);
      if (u.right) visit(u.right, gen + 1);
    }
  };
  visit(root as PersonNode, 0);
  return out;
}

// X's parents P + Q. P's parents G1 + G2; Q's parents G1 + G3 (G1 is shared: pedigree collapse).
// G1's parents H1 + H2.
const collapsedPedigree = (): GraphFixture => ({
  people: ["X", "P", "Q", "G1", "G2", "G3", "H1", "H2", "Q2", "P2"].map((id) => person(id)),
  unions: [
    union("@F0@", "P", "Q", ["X"]),
    union("@F1@", "G1", "G2", ["P"]),
    union("@F2@", "G1", "G3", ["Q"]),
    union("@F3@", "H1", "H2", ["G1"]),
  ],
});

describe("ancestor counts", () => {
  it("count each ancestor once under pedigree collapse", () => {
    // P, Q, G1, G2, G3, H1, H2: G1 (and H1, H2 above him) reached twice, counted once.
    expect(countAncestors(graphOf(collapsedPedigree()), "X")).toBe(7);
  });

  it("terminate and count each person once for someone who is their own ancestor", () => {
    const g = graphOf({
      people: ["A", "B", "C"].map((id) => person(id)),
      unions: [union("@F1@", "B", "C", ["A"]), union("@F2@", "A", "C", ["B"])],
    });
    expect(countAncestors(g, "A")).toBe(2); // B and C; A itself is not its own ancestor here
    const { root } = buildPedigree(g, "A", {}, 6);
    expect(pedigreeCards(root).get("A")).toBeDefined();
  });

  it("do not depend on what was counted before", () => {
    const g = graphOf(collapsedPedigree());
    const first = countAncestors(g, "Q");
    countAncestors(g, "X");
    expect(countAncestors(g, "Q")).toBe(first);
    expect(first).toBe(4); // G1, G3, H1, H2
  });

  it("follow a chosen parent family", () => {
    const g = graphOf({
      people: ["C", "B1", "B2", "A1", "A2", "Z"].map((id) => person(id)),
      unions: [
        union("@FB@", "B1", "B2", ["C"]),
        union("@FA@", "A1", "A2", [{ id: "C", pedi: "adopted" }]),
        union("@FZ@", "Z", "", ["A1"]),
      ],
    });
    expect(countAncestors(g, "C")).toBe(2);
    expect(countAncestors(g, "C", { famcOverrides: { C: "@FA@" } })).toBe(3); // A1, A2, Z
  });
});

describe("+N on the ancestor charts", () => {
  it("cards at the depth limit get the number of ancestors beyond them", () => {
    const { root } = buildPedigree(graphOf(collapsedPedigree()), "X", {}, 1);
    const cards = pedigreeCards(root);
    expect(cards.get("P")).toEqual({ gen: 1, hidden: 4 }); // G1, G2, H1, H2
    expect(cards.get("Q")).toEqual({ gen: 1, hidden: 4 }); // G1, G3, H1, H2
    expect(cards.get("X")?.hidden).toBeUndefined();
    expect(cards.has("G1")).toBe(false);
  });

  it("a card with no ancestors beyond it gets 0", () => {
    const { root } = buildPedigree(graphOf(collapsedPedigree()), "X", {}, 6);
    expect(pedigreeCards(root).get("H1")?.hidden).toBeUndefined(); // shown in full: no limit reached
    const capped = buildPedigree(graphOf(collapsedPedigree()), "X", {}, 3);
    expect(pedigreeCards(capped.root).get("H1")).toEqual({ gen: 3, hidden: 0 });
  });

  it("a collapsed branch gets the number of ancestors it hides", () => {
    const { root } = buildPedigree(graphOf(collapsedPedigree()), "X", { pedigreeAncestorCollapsePersonId: "P" }, 6);
    const cards = pedigreeCards(root);
    expect(cards.get("P")?.hidden).toBe(4);
    expect(cards.get("G3")).toBeDefined(); // Q's branch is still open
  });

  it("the vertical pedigree and the fan chart get the same counts", () => {
    for (const strategy of ["vertical_pedigree", "fan_chart"] as const) {
      const session = createChartSession({ graph: collapsedPedigree(), options: { strategy, maxDepth: 1 } });
      expect(pedigreeCards(session.buildTree("X").root).get("P")?.hidden, strategy).toBe(4);
    }
  });
});

describe("+N on the descendancy chart", () => {
  // R + S → A, B; A + A2 → A1; A1 + X → K
  const fx = (): GraphFixture => ({
    people: ["R", "S", "A", "B", "A2", "A1", "X", "K"].map((id) => person(id)),
    unions: [union("@F1@", "R", "S", ["A", "B"]), union("@F2@", "A", "A2", ["A1"]), union("@F3@", "A1", "X", ["K"])],
  });
  const reveal: ViewState = { revealedUnions: new Map([["R", ["S"]]]) };

  it("a collapsed branch gets the number of descendants it hides", () => {
    const { root } = buildDescendancy(graphOf(fx()), "R", { ...reveal, collapsedSubtrees: ["A"] }, 6);
    const a = (root.children[0] as NormalUnionNode).children.find((c) => (c as PersonNode).content.id === "A") as PersonNode;
    expect(a.content._hiddenCount).toBe(2);
    expect(a.children).toEqual([]);
  });

  it("tapping the chip on a collapsed branch shows one more generation there", () => {
    const { root } = buildDescendancy(graphOf(fx()), "R", { ...reveal, collapsedSubtrees: ["A"], showChildrenOf: ["A"] }, 6);
    const a = (root.children[0] as NormalUnionNode).children.find((c) => (c as PersonNode).content.id === "A") as PersonNode;
    const a1 = a.children[0] as PersonNode;
    expect(a1.content.id).toBe("A1");
    expect(a1.children).toEqual([]); // one generation only
    expect(a1.content._hiddenCount).toBe(1);
  });
});

describe("tapping the chip (SHOW_HIDDEN)", () => {
  const pedigreeState = (root: string): TreeState => ({ ...emptyState(root), strategyName: "pedigree" });

  it("on an ancestor chart shows that card's parents, one row, and labels the entry", () => {
    const g = graphOf(collapsedPedigree());
    const s1 = reduce(g, pedigreeState("X"), { type: "SHOW_HIDDEN", personId: "P" });
    expect((s1.viewState as ViewState).showParentsOf).toEqual(["P"]);
    expect(s1.history[1]).toMatchObject({ actionLabel: "Show more ancestors", triggerPersonId: "P", strategyName: "pedigree" });
    const cards = pedigreeCards(buildPedigree(g, "X", s1.viewState as ViewState, 1).root);
    expect(cards.get("G1")).toEqual({ gen: 2, hidden: 2 });
    expect(cards.get("G2")).toEqual({ gen: 2, hidden: 0 });
    expect(cards.has("G3")).toBe(false); // Q's branch stays at the limit
    expect(cards.has("H1")).toBe(false); // one row only
  });

  it("on the descendancy chart works like Show children at the cap", () => {
    const g = graphOf({ people: [person("R"), person("C")], unions: [union("@F1@", "R", "", ["C"])] });
    const s1 = reduce(g, emptyState("R"), { type: "SHOW_HIDDEN", personId: "R" });
    expect((s1.viewState as ViewState).showChildrenOf).toEqual(["R"]);
    expect(s1.history[1]).toMatchObject({ actionLabel: "Show children", triggerPersonId: "R" });
  });
});

describe("10,000 people stay fast", () => {
  // 19 generations of up to 1,024 people (10,239 in all); each person's parents are two people of the next
  // generation, so ancestries overlap heavily (pedigree collapse everywhere).
  function crowd(): GraphFixture {
    const people = [];
    const unions = [];
    const width = (g: number) => Math.min(2 ** g, 1024);
    const G = 18;
    for (let g = 0; g <= G; g++) for (let i = 0; i < width(g); i++) people.push(person(`g${g}-${i}`));
    for (let g = 0; g < G; g++) {
      const next = width(g + 1);
      for (let i = 0; i < width(g); i++) {
        unions.push(union(`@F${g}-${i}@`, `g${g + 1}-${(2 * i) % next}`, `g${g + 1}-${(2 * i + 1) % next}`, [`g${g}-${i}`]));
      }
    }
    return { people, unions };
  }

  it("builds a capped pedigree and a capped descendancy with counts in well under a second", () => {
    const fx = crowd();
    expect(fx.people.length).toBe(10_239);
    const g = graphOf(fx);
    const start = performance.now();
    const ped = buildPedigree(g, "g0-0", {}, 4);
    const desc = buildDescendancy(g, "g18-0", {}, 3);
    const elapsed = performance.now() - start;
    expect(pedigreeCards(ped.root).get("g4-0")?.hidden).toBe(countAncestors(g, "g4-0"));
    expect(countAncestors(g, "g0-0")).toBe(10_238); // everyone else, once each
    expect(countDescendants(g, "g18-0")).toBeGreaterThan(1000);
    expect(desc.root).toBeInstanceOf(PersonNode);
    expect(elapsed).toBeLessThan(1000);
  }, 20_000);
});
