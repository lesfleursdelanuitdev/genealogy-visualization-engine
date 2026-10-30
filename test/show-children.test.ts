/**
 * T18: Show children at the depth cap shows that person's children in place, one more row for
 * that branch only, and never re-roots. It pushes a labelled history entry like "Show children"
 * below the cap does.
 */
import { describe, it, expect } from "vitest";
import { graphOf, reduce, emptyState, buildDescendancy, cardsIn, person, union } from "./helpers/graph";
import { createChartSession, DEFAULT_MAX_DEPTH, type ViewState } from "../src";

// R + S → A, B ; A + A2 → A1 (Amy) ; B + B2 → B1 (Bo) ; A1 + X → K (Kit)
const family = () =>
  graphOf({
    people: [
      person("R", "Rita"), person("S", "Sam"), person("A", "Ann"), person("B", "Ben"),
      person("A2", "Al"), person("B2", "Bea"), person("A1", "Amy"), person("B1", "Bo"),
      person("X", "Xan"), person("K", "Kit"),
    ],
    unions: [
      union("@F1@", "R", "S", ["A", "B"]),
      union("@F2@", "A", "A2", ["A1"]),
      union("@F3@", "B", "B2", ["B1"]),
      union("@F4@", "A1", "X", ["K"]),
    ],
  });

const reveal: ViewState = { revealedUnions: new Map([["R", ["S"]]]) };
const vs = (s: { viewState: unknown }) => s.viewState as ViewState;

describe("Show children at the depth cap (T18)", () => {
  it("keeps the root and the depth", () => {
    const s0 = emptyState("R", { ...reveal, currentDepth: 1 });
    const s1 = reduce(family(), s0, { type: "SHOW_CHILDREN", personId: "A", atMaxDepth: true, currentDepth: 1 });
    expect(s1.rootId).toBe("R");
    expect(vs(s1).currentDepth).toBe(1);
    expect(vs(s1).showChildrenOf).toEqual(["A"]);
  });

  it("shows that person's children one row below the cap, and no one else's", () => {
    const g = family();
    const before = cardsIn(buildDescendancy(g, "R", reveal, 1).root).map((c) => c.id);
    expect(before).not.toContain("A1");
    const { root, maxDepthRendered } = buildDescendancy(g, "R", { ...reveal, showChildrenOf: ["A"] }, 1);
    const cards = cardsIn(root);
    expect(cards.find((c) => c.id === "A1")?.generation).toBe(2);
    expect(cards.map((c) => c.id)).not.toContain("B1"); // B's branch stays at the cap
    expect(cards.map((c) => c.id)).not.toContain("K"); // only one more row
    expect(maxDepthRendered).toBe(1); // the depth control still reads the cap
  });

  it("Show children again on a child adds one more row on that branch", () => {
    const { root } = buildDescendancy(family(), "R", { ...reveal, showChildrenOf: ["A", "A1"] }, 1);
    expect(cardsIn(root).find((c) => c.id === "K")?.generation).toBe(3);
  });

  it("drops the +N badge from the person whose children are shown", () => {
    const { root } = buildDescendancy(family(), "R", { ...reveal, showChildrenOf: ["A"] }, 1);
    const find = (id: string) => cardsIn(root).find((c) => c.id === id);
    expect(find("A")).toBeDefined();
    const session = createChartSession({ graph: family(), viewState: { ...reveal, showChildrenOf: ["A"] }, options: { maxDepth: 1 } });
    const r = session.buildTree("R").root;
    const unionRow = r.children[0];
    const a = unionRow.children.find((c) => "content" in c && (c.content as { id?: string }).id === "A");
    const b = unionRow.children.find((c) => "content" in c && (c.content as { id?: string }).id === "B");
    expect((a?.content as { _hiddenCount?: number })._hiddenCount).toBeUndefined();
    expect((b?.content as { _hiddenCount?: number })._hiddenCount).toBe(1);
  });

  it("pushes a labelled 'Show children' entry with the person who asked", () => {
    const s0 = emptyState("R", reveal);
    const s1 = reduce(family(), s0, { type: "SHOW_CHILDREN", personId: "A", atMaxDepth: true, currentDepth: DEFAULT_MAX_DEPTH });
    expect(s1.history).toHaveLength(2);
    expect(s1.history[1]).toMatchObject({
      rootId: "R",
      actionLabel: "Show children",
      triggerPersonId: "A",
      triggerPersonFullName: "Ann Test",
      triggerPersonInitials: "AT",
      strategyName: "descendancy",
    });
  });

  it("asking twice for the same person does not add it twice", () => {
    const g = family();
    const once = reduce(g, emptyState("R", reveal), { type: "SHOW_CHILDREN", personId: "A", atMaxDepth: true });
    const twice = reduce(g, once, { type: "SHOW_CHILDREN", personId: "A", atMaxDepth: true });
    expect(vs(twice).showChildrenOf).toEqual(["A"]);
  });
});
