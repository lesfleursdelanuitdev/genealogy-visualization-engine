/**
 * T47 (adoptive parents first), T48 (real family shapes) and T49 (repeats are shadows), on
 * the invented-name fixtures in test/fixtures/families.ts.
 */
import { describe, it, expect } from "vitest";
import { graphOf, reduce, emptyState, buildDescendancy, person, type Graph } from "./helpers/graph";
import { adoptedCousins, fatherAndDaughter, sisterInLawsNiece } from "./fixtures/families";
import {
  createChartSession,
  countAncestors,
  countDescendants,
  isContainer,
  parentFamilySwitch,
  NormalUnionNode,
  PersonNode,
  UnionNode,
  type ChartNode,
  type ChartViewStrategyName,
  type TreeState,
  type ViewState,
} from "../src";

const vs = (s: TreeState) => s.viewState as ViewState;

/** Every card a renderer draws, in build order: a container's card once (its first union's left). */
function drawnCards(root: ChartNode): Array<{ id: string; shadow: boolean }> {
  const out: Array<{ id: string; shadow: boolean }> = [];
  const card = (p: PersonNode) => out.push({ id: p.content.id, shadow: p.content._isShadow === true });
  const visit = (n: ChartNode, ownerDrawn: boolean) => {
    if (n instanceof PersonNode) {
      const container = isContainer(n);
      if (!container) card(n);
      n.children.forEach((c, i) => visit(c, !(container && i === 0)));
      return;
    }
    if (n instanceof UnionNode) {
      if (!ownerDrawn) card(n.left);
      if (n.right) card(n.right);
      for (const c of n.children) visit(c, false);
    }
  };
  visit(root, false);
  return out;
}

/** Full (non-shadow) cards per person: T49 allows at most one. */
function fullCardsPerPerson(root: ChartNode): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of drawnCards(root)) if (!c.shadow) m.set(c.id, (m.get(c.id) ?? 0) + 1);
  return m;
}

/** Couple rows: [principal, partner, children] for each normal union, in build order. */
function coupleRows(root: ChartNode): Array<[string, string | undefined, string[]]> {
  const out: Array<[string, string | undefined, string[]]> = [];
  const visit = (n: ChartNode) => {
    if (n instanceof NormalUnionNode) {
      out.push([n.principalId, n.right?.content.id, n.children.map((c) => (c as PersonNode).content.id)]);
    }
    for (const c of n.children) visit(c);
  };
  visit(root);
  return out;
}

/** Ancestor-chart cards in build order (father first), with generation and shadow flag. */
function ancestorCards(root: ChartNode): Array<{ id: string; gen: number; shadow: boolean }> {
  const out: Array<{ id: string; gen: number; shadow: boolean }> = [];
  const visit = (p: PersonNode, gen: number) => {
    out.push({ id: p.content.id, gen, shadow: p.content._isShadow === true });
    const u = p.children[0];
    if (u instanceof NormalUnionNode) {
      visit(u.left, gen + 1);
      if (u.right) visit(u.right, gen + 1);
    }
  };
  visit(root as PersonNode, 0);
  return out;
}

function parentsShown(g: Graph, rootId: string, viewState: ViewState = {}, strategy: ChartViewStrategyName = "pedigree") {
  const { root } = createChartSession({ graph: g, viewState, options: { strategy, maxDepth: 4 } }).buildTree(rootId);
  const u = (root as PersonNode).children[0] as NormalUnionNode;
  return [u.left.content.id, u.right?.content.id];
}

const allPartners = (g: Graph, rootId: string) => vs(reduce(g, emptyState(rootId), { type: "REVEAL_ALL_SPOUSES" }));

// ─── T48 (a) ────────────────────────────────────────────────────────────────

describe("(a) a man marries his sister-in-law's niece", () => {
  it("from his parents: each son's row has his own wife", () => {
    const g = graphOf(sisterInLawsNiece());
    const rows = coupleRows(buildDescendancy(g, "@A1@", allPartners(g, "@A1@")).root);
    expect(rows).toEqual([
      ["@A1@", "@A2@", ["@A3@", "@A4@"]],
      ["@A3@", "@A10@", []], // Max + Nora
      ["@A4@", "@A7@", []], // Ben + Ana
    ]);
  });

  it("from her grandparents: Nora's row has Max, under Rita + João", () => {
    const g = graphOf(sisterInLawsNiece());
    const rows = coupleRows(buildDescendancy(g, "@A5@", allPartners(g, "@A5@")).root);
    expect(rows).toEqual([
      ["@A5@", "@A6@", ["@A7@", "@A8@"]],
      ["@A7@", "@A4@", []], // Ana + Ben
      ["@A8@", "@A9@", ["@A10@"]], // Rita + João
      ["@A10@", "@A3@", []], // Nora + Max
    ]);
  });
});

// ─── T48 (b) and (c) ────────────────────────────────────────────────────────

describe("(b) + (c) adopted boy, adopted niece, sisters", () => {
  const file = () => graphOf(adoptedCousins());

  it("descendants of Lia's biological grandparents: Lia full once (adopted by her aunt), shadow once", () => {
    const g = file();
    const { root } = buildDescendancy(g, "@I50@", allPartners(g, "@I50@"));
    const lia = drawnCards(root).filter((c) => c.id === "@I41@");
    expect(lia).toEqual([
      { id: "@I41@", shadow: false }, // under Inês + Olav (built first)
      { id: "@I41@", shadow: true }, // under Rui + Sara
    ]);
    expect(coupleRows(root)).toEqual([
      ["@I50@", "@I51@", ["@I30@", "@I31@"]],
      ["@I30@", "@I22@", ["@I41@"]], // Inês + Olav adopt Lia
      ["@I31@", "@I32@", ["@I41@", "@I42@"]], // Rui + Sara: Lia (shadow), Clara
      ["@I42@", "@I11@", ["@I60@"]], // Clara + Tomás → Duarte
    ]);
    expect([...fullCardsPerPerson(root).values()].every((n) => n === 1)).toBe(true);
  });

  it("+N counts Lia once", () => {
    const g = file();
    expect(countDescendants(g, "@I50@")).toBe(5); // Inês, Rui, Lia, Clara, Duarte
    const { root } = buildDescendancy(g, "@I50@", allPartners(g, "@I50@"), 1);
    const kids = ((root as PersonNode).children[0] as NormalUnionNode).children as PersonNode[];
    expect(kids.map((k) => [k.content.id, k.content._hiddenCount])).toEqual([
      ["@I30@", 1], // Lia
      ["@I31@", 3], // Lia, Clara, Duarte
    ]);
  });

  it("from the adoptive grandparents: each partner in the right row", () => {
    const g = file();
    expect(coupleRows(buildDescendancy(g, "@I20@", allPartners(g, "@I20@")).root)).toEqual([
      ["@I20@", "@I21@", ["@I11@", "@I22@", "@I23@"]],
      ["@I11@", "@I42@", ["@I60@"]], // Tomás + Clara
      ["@I22@", "@I30@", ["@I41@"]], // Olav + Inês → Lia
    ]);
  });

  for (const strategy of ["pedigree", "vertical_pedigree", "fan_chart"] as const) {
    it(`${strategy}: Lia and Tomás show their adoptive parents first (T47)`, () => {
      expect(parentsShown(file(), "@I41@", {}, strategy)).toEqual(["@I22@", "@I30@"]);
      expect(parentsShown(file(), "@I11@", {}, strategy)).toEqual(["@I20@", "@I21@"]);
    });
  }

  it("the card's switch: two families, their kinds, and which one is shown", () => {
    const g = file();
    expect(parentFamilySwitch(g, "@I41@", {}, { isRoot: true })).toEqual({
      families: [
        { familyId: "@F31@", kind: "birth" },
        { familyId: "@F30@", kind: "adopted" },
      ],
      shownFamilyId: "@F30@",
    });
    const { root } = createChartSession({ graph: g, options: { strategy: "pedigree" } }).buildTree("@I60@");
    const tomas = ((root as PersonNode).children[0] as NormalUnionNode).left;
    expect(tomas.parentFamilies?.shownFamilyId).toBe("@F20@");
    expect(tomas.parentFamilies?.families).toHaveLength(2);
    const clara = ((root as PersonNode).children[0] as NormalUnionNode).right!;
    expect(clara.parentFamilies).toBeUndefined(); // one family: no switch
  });

  it("flipping the switch shows the birth parents, with a History entry, and back", () => {
    const g = file();
    const s0: TreeState = { ...emptyState("@I41@"), strategyName: "pedigree" };
    const s1 = reduce(g, s0, { type: "PEDIGREE_SET_FAMC_FOR_PERSON", personId: "@I41@", familyXref: "@F31@" });
    expect(s1.history[1]).toMatchObject({ actionLabel: "Show birth parents of Lia Moura", triggerPersonId: "@I41@" });
    expect(parentsShown(g, "@I41@", vs(s1))).toEqual(["@I31@", "@I32@"]);
    expect(parentFamilySwitch(g, "@I41@", vs(s1), { isRoot: true }).shownFamilyId).toBe("@F31@");
    const s2 = reduce(g, s1, { type: "PEDIGREE_SET_FAMC_FOR_PERSON", personId: "@I41@", familyXref: "@F30@" });
    expect(s2.history[2].actionLabel).toBe("Show adoptive parents of Lia Moura");
    expect(parentsShown(g, "@I41@", vs(s2))).toEqual(["@I22@", "@I30@"]);
    expect(reduce(g, s2, { type: "PEDIGREE_SET_FAMC_FOR_PERSON", personId: "@I41@", familyXref: "@F30@" })).toBe(s2);
  });

  it("Tomás's switch in his son's chart shows his birth mother and an unknown father", () => {
    const g = file();
    const s0: TreeState = { ...emptyState("@I60@"), strategyName: "pedigree" };
    const s1 = reduce(g, s0, { type: "PEDIGREE_SET_FAMC_FOR_PERSON", personId: "@I11@", familyXref: "@F10@" });
    expect(s1.history[1].actionLabel).toBe("Show birth parents of Tomás Vale");
    const { root } = createChartSession({ graph: g, viewState: vs(s1), options: { strategy: "pedigree" } }).buildTree("@I60@");
    const tomas = ((root as PersonNode).children[0] as NormalUnionNode).left;
    const parents = tomas.children[0] as NormalUnionNode;
    expect(parents.left.content).toMatchObject({ firstName: "Unknown", lastName: "father", _unknownPlaceholder: true });
    expect(parents.right?.content.id).toBe("@I10@");
  });

  it("Duarte's ancestors end, with no false pedigree collapse", () => {
    const g = file();
    const cards = ancestorCards(createChartSession({ graph: g, options: { strategy: "pedigree", maxDepth: 6 } }).buildTree("@I60@").root);
    expect(cards.filter((c) => c.shadow)).toEqual([]);
    expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length);
    expect(countAncestors(g, "@I60@")).toBe(8); // Tomás, Clara, Henrik, Greta, Rui, Sara, Abel, Berta
  });
});

// ─── T49 (d) ────────────────────────────────────────────────────────────────

describe("(d) a man has a son with his daughter (T49)", () => {
  const file = () => graphOf(fatherAndDaughter());
  const martinsPartners: ViewState = { revealedUnions: new Map([["@K1@", ["@K2@", "@K4@"]]]) }; // initialPartners "root"

  it("descendants from Martin: Wilma and Dora are his partners; Dora and Sven repeat as shadows", () => {
    const { root } = createChartSession({ graph: file(), viewState: martinsPartners }).buildChart("@K1@");
    expect(coupleRows(root)).toEqual([
      ["@K1@", "@K2@", ["@K3@", "@K4@", "@K5@"]],
      ["@K1@", "@K4@", ["@K6@"]],
    ]);
    const cards = drawnCards(root);
    expect(cards.filter((c) => c.id === "@K4@")).toEqual([
      { id: "@K4@", shadow: false }, // Dora as Martin + Wilma's child (her children under her)
      { id: "@K4@", shadow: true }, // Dora as Martin's partner
    ]);
    expect(cards.filter((c) => c.id === "@K6@")).toEqual([
      { id: "@K6@", shadow: false }, // Sven under Dora
      { id: "@K6@", shadow: true }, // Sven under Martin + Dora
    ]);
    expect([...fullCardsPerPerson(root).values()].every((n) => n === 1)).toBe(true);
  });

  it("Toggle all partners, then Dora's partner from her card: shadows only, it ends, counts stay", () => {
    const g = file();
    let s = reduce(g, emptyState("@K1@", martinsPartners), { type: "REVEAL_ALL_SPOUSES" });
    s = reduce(g, s, { type: "REVEAL_SPOUSE", personId: "@K4@", spouseId: "@K1@" });
    const build = () => createChartSession({ graph: g, viewState: vs(s) }).buildChart("@K1@").root;
    const first = drawnCards(build());
    expect(drawnCards(build())).toEqual(first); // deterministic
    expect([...fullCardsPerPerson(build()).values()].every((n) => n === 1)).toBe(true);
    expect(first.filter((c) => c.id === "@K1@")).toEqual([
      { id: "@K1@", shadow: false },
      { id: "@K1@", shadow: true }, // Martin as Dora's partner
    ]);
    // Toggling again and again neither loops nor grows the chart.
    for (let i = 0; i < 10; i++) {
      s = reduce(g, s, { type: "CLOSE_SPOUSE", personId: "@K4@", spouseId: "@K1@" });
      s = reduce(g, s, { type: "REVEAL_SPOUSE", personId: "@K4@", spouseId: "@K1@" });
    }
    expect(drawnCards(build())).toEqual(first);
    expect(countDescendants(g, "@K1@")).toBe(4); // Ada, Dora, Carl, Sven
  });

  for (const strategy of ["pedigree", "vertical_pedigree", "fan_chart"] as const) {
    it(`${strategy} for Sven: Martin is father and maternal grandfather; the second is a shadow`, () => {
      const { root } = createChartSession({ graph: file(), options: { strategy, maxDepth: 6 } }).buildTree("@K6@");
      expect(ancestorCards(root)).toEqual([
        { id: "@K6@", gen: 0, shadow: false },
        { id: "@K1@", gen: 1, shadow: false },
        { id: "@K7@", gen: 2, shadow: false },
        { id: "@K8@", gen: 2, shadow: false },
        { id: "@K4@", gen: 1, shadow: false },
        { id: "@K1@", gen: 2, shadow: true }, // no parents above the shadow
        { id: "@K2@", gen: 2, shadow: false },
      ]);
    });
  }

  it("+N counts Martin once", () => {
    expect(countAncestors(file(), "@K6@")).toBe(5); // Martin, Dora, Peter, Paula, Wilma
    const { root } = createChartSession({ graph: file(), options: { strategy: "pedigree", maxDepth: 1 } }).buildTree("@K6@");
    const parents = (root as PersonNode).children[0] as NormalUnionNode;
    expect(parents.left.content._hiddenCount).toBe(2); // Peter, Paula
    expect(parents.right?.content._hiddenCount).toBe(4); // Martin, Wilma, Peter, Paula: Martin once
  });

  it("History labels read sensibly", () => {
    const g = file();
    const steps: Array<[Parameters<typeof reduce>[2], string]> = [
      [{ type: "REVEAL_ALL_SPOUSES" }, "Toggle all partners"],
      [{ type: "REVEAL_SPOUSE", personId: "@K4@", spouseId: "@K1@" }, "Show partner"],
      [{ type: "CLOSE_SPOUSE", personId: "@K4@", spouseId: "@K1@" }, "Close partner"],
      [{ type: "COLLAPSE_SUBTREE", personId: "@K4@" }, "Hide descendants of Dora Kerr"],
      [{ type: "EXPAND_SUBTREE", personId: "@K4@" }, "Show descendants of Dora Kerr"],
      [{ type: "SET_VIEW_STRATEGY", strategyName: "pedigree" }, "Pedigree view"],
      [{ type: "ROOT", personId: "@K6@" }, "Make Sven Kerr root"],
      [{ type: "PEDIGREE_COLLAPSE_ANCESTORS", personId: "@K4@" }, "Hide ancestors of Dora Kerr"],
      [{ type: "PEDIGREE_CLEAR_ANCESTOR_COLLAPSE" }, "Show ancestors of Dora Kerr"],
    ];
    let s = emptyState("@K1@");
    for (const [action, label] of steps) {
      s = reduce(g, s, action);
      expect(s.history[s.historyIndex].actionLabel).toBe(label);
    }
    expect(s.history[2]).toMatchObject({ triggerPersonFullName: "Dora Kerr", triggerPersonInitials: "DK" });
  });
});

// Fixture sanity: invented names only.
it("fixtures use invented names", () => {
  const names = [sisterInLawsNiece(), adoptedCousins(), fatherAndDaughter()].flatMap((f) => f.people.map((p) => p.lastName));
  expect(new Set(names)).toEqual(new Set(["Lund", "Costa", "Neves", "Vale", "Brand", "Moura", "Pinto", "Kerr"]));
  expect(person("x").firstName).toBe("x");
});

describe("closing a partner on one row leaves the other person's row (T19, found with T49 (d))", () => {
  const both: ViewState = { revealedUnions: new Map([["@K1@", ["@K2@", "@K4@"]], ["@K4@", ["@K1@"]]]) };

  it("CLOSE_SPOUSE on Dora's row keeps Dora on Martin's row", () => {
    const g = graphOf(fatherAndDaughter());
    const s1 = reduce(g, emptyState("@K1@", both), { type: "CLOSE_SPOUSE", personId: "@K4@", spouseId: "@K1@" });
    expect(vs(s1).revealedUnions?.get("@K1@")).toEqual(["@K2@", "@K4@"]);
    expect(vs(s1).revealedUnions?.has("@K4@")).toBe(false);
  });

  it("Close all partners of Dora keeps Dora on Martin's row", () => {
    const g = graphOf(fatherAndDaughter());
    const s1 = reduce(g, emptyState("@K1@", both), { type: "CLOSE_ALL_SPOUSES_FOR_PERSON", personId: "@K4@" });
    expect(vs(s1).revealedUnions?.get("@K1@")).toEqual(["@K2@", "@K4@"]);
  });
});
