/**
 * Audit bugs in the tree reducer. IDs follow docs/v0.1.0-progress.md ("Bug list").
 */
import { describe, it, expect } from "vitest";
import { graphOf, reduce, emptyState, person, union } from "../helpers/graph";
import { DEFAULT_MAX_DEPTH, type ViewState } from "../../src";

function vs(state: { viewState: unknown }): ViewState {
  return state.viewState as ViewState;
}

// R + S → C1, C2; C1 + D → G
const family = () =>
  graphOf({
    people: ["R", "S", "C1", "C2", "D", "G"].map((id) => person(id, id, "Test")),
    unions: [union("@F1@", "R", "S", ["C1", "C2"]), union("@F2@", "C1", "D", ["G"])],
  });

describe("B03: Show children at the depth cap", () => {
  // Before T18 the reducer "promoted" a person from [husb, wife] of the root's unions at the
  // cap: clicking the root's partner made the partner the root. T18 tests: test/show-children.test.ts.
  it("[B03 fixed] on the root's partner, does not re-root the chart", () => {
    const g = family();
    const s0 = emptyState("R", { revealedUnions: new Map([["R", ["S"]]]) });
    const s1 = reduce(g, s0, { type: "SHOW_CHILDREN", personId: "S", atMaxDepth: true, currentDepth: 6 });
    expect(s1.rootId).toBe("R");
  });

  it("[B03 fixed] does not leave expandDownTopRow behind (nothing reads it)", () => {
    const g = family();
    const s0 = emptyState("R", { revealedUnions: new Map([["R", ["S"]]]) });
    const s1 = reduce(g, s0, { type: "SHOW_CHILDREN", personId: "G", atMaxDepth: true, currentDepth: 6 });
    expect("expandDownTopRow" in vs(s1)).toBe(false);
  });

  it("below the cap, adds one generation and keeps the root", () => {
    const g = family();
    const s1 = reduce(g, emptyState("R"), { type: "SHOW_CHILDREN", personId: "C1", atMaxDepth: false, currentDepth: 2 });
    expect(s1.rootId).toBe("R");
    expect(vs(s1).currentDepth).toBe(3);
  });
});

describe("B09: closing a partner", () => {
  // S is a revealed partner on two rows: A's and B's (S married both).
  const twoRows = () =>
    emptyState("R", {
      revealedUnions: new Map([
        ["A", ["S"]],
        ["B", ["S"]],
      ]),
    });

  it("[B09 fixed] closes S only on the row it was closed from", () => {
    const g = graphOf({
      people: ["R", "A", "B", "S"].map((id) => person(id)),
      unions: [union("@F1@", "A", "S", []), union("@F2@", "B", "S", [])],
    });
    const s1 = reduce(g, twoRows(), { type: "CLOSE_SPOUSE", personId: "B", spouseId: "S" });
    expect(vs(s1).revealedUnions?.get("A")).toEqual(["S"]);
    expect(vs(s1).revealedUnions?.get("B") ?? []).not.toContain("S");
  });

  it("with one partner per row, closes only that partner", () => {
    const g = family();
    const s0 = emptyState("R", { revealedUnions: new Map([["R", ["S", "X"]]]) });
    const s1 = reduce(g, s0, { type: "CLOSE_SPOUSE", personId: "R", spouseId: "S" });
    expect(vs(s1).revealedUnions?.get("R")).toEqual(["X"]);
  });

  it("pushes a labelled 'Close partner' entry for the row's person (T19)", () => {
    const s0 = emptyState("R", { revealedUnions: new Map([["R", ["S"]]]) });
    const s1 = reduce(family(), s0, { type: "CLOSE_SPOUSE", personId: "R", spouseId: "S" });
    expect(s1.history).toHaveLength(2);
    expect(s1.history[1]).toMatchObject({
      actionLabel: "Close partner",
      triggerPersonId: "R",
      triggerPersonFullName: "R Test",
      triggerPersonInitials: "RT",
    });
  });

  it("closing a partner that is not open on that row changes nothing", () => {
    const s0 = emptyState("R", { revealedUnions: new Map([["R", ["S"]]]) });
    expect(reduce(family(), s0, { type: "CLOSE_SPOUSE", personId: "C1", spouseId: "S" })).toBe(s0);
  });
});

describe("B10: depth is clamped", () => {
  it("[B10 fixed] SET_CURRENT_DEPTH 0 becomes 1", () => {
    const s1 = reduce(family(), emptyState("R"), { type: "SET_CURRENT_DEPTH", depth: 0 });
    expect(vs(s1).currentDepth).toBe(1);
  });

  it(`[B10 fixed] SET_CURRENT_DEPTH 99 becomes the cap (${DEFAULT_MAX_DEPTH})`, () => {
    const s1 = reduce(family(), emptyState("R"), { type: "SET_CURRENT_DEPTH", depth: 99 });
    expect(vs(s1).currentDepth).toBe(DEFAULT_MAX_DEPTH);
  });
});

describe("B12: initials", () => {
  const names = () =>
    graphOf({
      people: [
        person("@I1@", "\u{20BB7}野", "Tarō"), // 𠮷 is one character outside the BMP (two UTF-16 units)
        person("@I2@", "Élodie", "Émile"), // É written as E + combining acute
      ],
      unions: [],
    });

  it("[B12 fixed] takes the first character, not half of a UTF-16 pair", () => {
    const s1 = reduce(names(), emptyState("R"), { type: "ROOT", personId: "@I1@" });
    expect(s1.history[s1.historyIndex].rootPersonInitials).toBe("\u{20BB7}T");
  });

  it("[B12 fixed] keeps a combining accent with its letter", () => {
    const s1 = reduce(names(), emptyState("R"), { type: "ROOT", personId: "@I2@" });
    expect(s1.history[s1.historyIndex].rootPersonInitials).toBe("ÉÉ");
  });
});

describe("S1 (suspected): root change keeping the old scope", () => {
  it("[S1 fixed] Show parents on the root drops the old root's family-unit scope", () => {
    const g = graphOf({
      people: ["P", "Q", "R", "S"].map((id) => person(id)),
      unions: [union("@F0@", "P", "Q", ["R"]), union("@F1@", "R", "S", [])],
    });
    const s0 = emptyState("R", {
      revealedUnions: new Map([["R", ["S"]]]),
      familyUnitScope: { personId: "R", spouseId: "S", familyXref: "@F1@" },
    });
    const s1 = reduce(g, s0, { type: "PARENTS", personId: "R" });
    expect(s1.rootId).toBe("P");
    expect(vs(s1).familyUnitScope).toBeUndefined();
  });

  it("ROOT starts the new root with a fresh view (no scope)", () => {
    const s0 = emptyState("R", { familyUnitScope: { personId: "R", spouseId: "S" } });
    const s1 = reduce(family(), s0, { type: "ROOT", personId: "C1" });
    expect(vs(s1).familyUnitScope).toBeUndefined();
  });
});

describe("S2 (suspected): panToPersonId never cleared", () => {
  it("[S2 fixed] the next action after Pan to person does not carry the pan target", () => {
    const g = family();
    const s1 = reduce(g, emptyState("R"), { type: "PAN_TO_PERSON", personId: "C2" });
    expect(vs(s1).panToPersonId).toBe("C2");
    const s2 = reduce(g, s1, { type: "REVEAL_SPOUSE", personId: "R", spouseId: "S" });
    expect(vs(s2).panToPersonId).toBeUndefined();
  });
});
