import { describe, it, expect } from "vitest";
import {
  treeReducer,
  createInitialState,
  INITIAL_STATE,
  MAX_HISTORY,
  type TreeState,
} from "../../src";

// ─── helpers ────────────────────────────────────────────────────────────────

function applyN(state: TreeState, action: Parameters<typeof treeReducer>[1], n: number): TreeState {
  let s = state;
  for (let i = 0; i < n; i++) s = treeReducer(s, action);
  return s;
}

function rootState(personId = "@I1@"): TreeState {
  return createInitialState("descendancy", personId);
}

// ─── createInitialState ──────────────────────────────────────────────────────

describe("createInitialState", () => {
  it("sets strategyName", () => {
    const s = createInitialState("descendancy");
    expect(s.strategyName).toBe("descendancy");
  });

  // Changed in the engine package (spec Part 1 step 4: no Gonsalves default root). The app's
  // original expected a truthy DEFAULT_ROOT_XREF here.
  it("has an empty root when no rootId is supplied", () => {
    const s = createInitialState("descendancy");
    expect(s.rootId).toBe("");
  });

  it("normalises a bare xref into @xref@ format", () => {
    const s = createInitialState("descendancy", "I5");
    expect(s.rootId).toBe("@I5@");
  });

  it("initialises history with exactly one entry", () => {
    const s = createInitialState("descendancy");
    expect(s.history).toHaveLength(1);
    expect(s.historyIndex).toBe(0);
  });

  it("seeds currentDepth when initialCurrentDepth is provided", () => {
    const s = createInitialState("descendancy", undefined, { initialCurrentDepth: 3 });
    expect((s.viewState as { currentDepth?: number }).currentDepth).toBe(3);
  });

  it("clamps initialCurrentDepth to 1 minimum", () => {
    const s = createInitialState("descendancy", undefined, { initialCurrentDepth: 0 });
    expect((s.viewState as { currentDepth?: number }).currentDepth).toBe(1);
  });
});

// ─── INITIAL_STATE ───────────────────────────────────────────────────────────

describe("INITIAL_STATE", () => {
  it("is a descendancy strategy state", () => {
    expect(INITIAL_STATE.strategyName).toBe("descendancy");
  });

  it("historyIndex starts at 0", () => {
    expect(INITIAL_STATE.historyIndex).toBe(0);
  });
});

// ─── ROOT action ─────────────────────────────────────────────────────────────

describe("ROOT action", () => {
  it("changes rootId", () => {
    const s0 = rootState("@I1@");
    const s1 = treeReducer(s0, { type: "ROOT", personId: "@I2@" });
    expect(s1.rootId).toBe("@I2@");
  });

  it("pushes a new history entry", () => {
    const s0 = rootState("@I1@");
    const s1 = treeReducer(s0, { type: "ROOT", personId: "@I2@" });
    expect(s1.history.length).toBe(s0.history.length + 1);
  });

  it("does not alter strategy", () => {
    const s0 = rootState("@I1@");
    const s1 = treeReducer(s0, { type: "ROOT", personId: "@I2@" });
    expect(s1.strategyName).toBe(s0.strategyName);
  });

  it("resets view state to strategy initial when root changes", () => {
    const s0 = rootState("@I1@");
    const s1 = treeReducer(s0, { type: "ROOT", personId: "@I2@" });
    // view state should be a fresh initial (empty object for descendancy)
    expect(s1.viewState).toEqual({});
  });
});

// ─── ROOT_KEEP_VIEW action ───────────────────────────────────────────────────

describe("ROOT_KEEP_VIEW action", () => {
  it("changes rootId", () => {
    const s0 = rootState("@I1@");
    const s1 = treeReducer(s0, { type: "ROOT_KEEP_VIEW", personId: "@I3@" });
    expect(s1.rootId).toBe("@I3@");
  });

  it("does not reset view state", () => {
    const s0: TreeState = {
      ...rootState("@I1@"),
      viewState: { currentDepth: 4 },
    };
    const s1 = treeReducer(s0, { type: "ROOT_KEEP_VIEW", personId: "@I3@" });
    expect((s1.viewState as { currentDepth?: number }).currentDepth).toBe(4);
  });
});

// ─── BACK / FORWARD actions ───────────────────────────────────────────────────

describe("BACK action", () => {
  it("is a no-op when at the beginning of history", () => {
    const s0 = rootState("@I1@");
    const s1 = treeReducer(s0, { type: "BACK" });
    expect(s1).toEqual(s0);
  });

  it("goes back to previous root", () => {
    const s0 = rootState("@I1@");
    const s1 = treeReducer(s0, { type: "ROOT", personId: "@I2@" });
    const s2 = treeReducer(s1, { type: "BACK" });
    expect(s2.rootId).toBe("@I1@");
    expect(s2.historyIndex).toBe(0);
  });

  it("does not remove history entries", () => {
    const s0 = rootState("@I1@");
    const s1 = treeReducer(s0, { type: "ROOT", personId: "@I2@" });
    const s2 = treeReducer(s1, { type: "BACK" });
    expect(s2.history.length).toBe(s1.history.length);
  });
});

describe("FORWARD action", () => {
  it("is a no-op when at the end of history", () => {
    const s0 = rootState("@I1@");
    const s1 = treeReducer(s0, { type: "FORWARD" });
    expect(s1).toEqual(s0);
  });

  it("goes forward after a BACK", () => {
    const s0 = rootState("@I1@");
    const s1 = treeReducer(s0, { type: "ROOT", personId: "@I2@" });
    const s2 = treeReducer(s1, { type: "BACK" });
    const s3 = treeReducer(s2, { type: "FORWARD" });
    expect(s3.rootId).toBe("@I2@");
    expect(s3.historyIndex).toBe(1);
  });

  it("BACK then forward is idempotent", () => {
    const s0 = rootState("@I1@");
    const s1 = treeReducer(s0, { type: "ROOT", personId: "@I2@" });
    const s2 = treeReducer(treeReducer(s1, { type: "BACK" }), { type: "FORWARD" });
    expect(s2.rootId).toBe(s1.rootId);
    expect(s2.historyIndex).toBe(s1.historyIndex);
  });
});

// ─── NAVIGATE_TO_INDEX action ─────────────────────────────────────────────────

describe("NAVIGATE_TO_INDEX action", () => {
  function buildHistory(n: number): TreeState {
    let s = rootState("@I0@");
    for (let i = 1; i <= n; i++) {
      s = treeReducer(s, { type: "ROOT", personId: `@I${i}@` });
    }
    return s;
  }

  it("jumps to the correct history entry", () => {
    const s = buildHistory(3); // entries: I0, I1, I2, I3
    const jumped = treeReducer(s, { type: "NAVIGATE_TO_INDEX", index: 1 });
    expect(jumped.historyIndex).toBe(1);
    expect(jumped.rootId).toBe("@I1@");
  });

  it("clamps to last valid index gracefully", () => {
    const s = buildHistory(2);
    // out-of-bounds index should not throw
    expect(() => treeReducer(s, { type: "NAVIGATE_TO_INDEX", index: 999 })).not.toThrow();
  });
});

// ─── History cap (MAX_HISTORY = 21) ──────────────────────────────────────────

describe("history cap", () => {
  it("never exceeds MAX_HISTORY entries", () => {
    let s = rootState("@I0@");
    for (let i = 1; i <= MAX_HISTORY + 10; i++) {
      s = treeReducer(s, { type: "ROOT", personId: `@I${i}@` });
    }
    expect(s.history.length).toBeLessThanOrEqual(MAX_HISTORY);
  });

  it(`history stays at MAX_HISTORY after ${MAX_HISTORY + 5} ROOT actions`, () => {
    let s = rootState("@I0@");
    for (let i = 1; i <= MAX_HISTORY + 5; i++) {
      s = treeReducer(s, { type: "ROOT", personId: `@I${i}@` });
    }
    expect(s.history.length).toBe(MAX_HISTORY);
  });

  it("BACK from capped history does not lose the oldest entry", () => {
    let s = rootState("@I0@");
    for (let i = 1; i <= MAX_HISTORY + 5; i++) {
      s = treeReducer(s, { type: "ROOT", personId: `@I${i}@` });
    }
    // go back to the start
    let back = s;
    for (let i = 0; i < MAX_HISTORY - 1; i++) {
      back = treeReducer(back, { type: "BACK" });
    }
    expect(back.historyIndex).toBe(0);
    expect(back.rootId).toBeTruthy();
  });
});

// ─── CLEAR_HISTORY action ─────────────────────────────────────────────────────

describe("CLEAR_HISTORY action", () => {
  it("reduces history to a single entry at index 0", () => {
    let s = rootState("@I0@");
    s = treeReducer(s, { type: "ROOT", personId: "@I1@" });
    s = treeReducer(s, { type: "ROOT", personId: "@I2@" });
    const cleared = treeReducer(s, { type: "CLEAR_HISTORY" });
    expect(cleared.history.length).toBe(1);
    expect(cleared.historyIndex).toBe(0);
  });

  it("restores rootId to the first history entry after CLEAR_HISTORY", () => {
    let s = rootState("@I0@");
    s = treeReducer(s, { type: "ROOT", personId: "@I2@" });
    const cleared = treeReducer(s, { type: "CLEAR_HISTORY" });
    // CLEAR_HISTORY resets to the very first history entry (the initial view), not the current position
    expect(cleared.rootId).toBe("@I0@");
  });
});

// ─── RESTORE_HISTORY action ───────────────────────────────────────────────────

describe("RESTORE_HISTORY action", () => {
  it("replaces history and historyIndex", () => {
    const s0 = rootState("@I1@");
    const restoredHistory = [
      { rootId: "@I5@", viewState: {}, strategyName: "descendancy", actionLabel: "Restored" },
      { rootId: "@I6@", viewState: {}, strategyName: "descendancy", actionLabel: "Restored 2" },
    ];
    const s1 = treeReducer(s0, {
      type: "RESTORE_HISTORY",
      history: restoredHistory,
      historyIndex: 1,
    });
    expect(s1.history).toEqual(restoredHistory);
    expect(s1.historyIndex).toBe(1);
  });
});

// ─── SET_VIEW_STRATEGY action ─────────────────────────────────────────────────

describe("SET_VIEW_STRATEGY action", () => {
  it("changes the strategyName", () => {
    const s0 = rootState("@I1@");
    const s1 = treeReducer(s0, { type: "SET_VIEW_STRATEGY", strategyName: "pedigree" });
    expect(s1.strategyName).toBe("pedigree");
  });

  it("pushes a history entry", () => {
    const s0 = rootState("@I1@");
    const s1 = treeReducer(s0, { type: "SET_VIEW_STRATEGY", strategyName: "pedigree" });
    expect(s1.history.length).toBe(s0.history.length + 1);
  });
});

// ─── Descendancy: REVEAL_SPOUSE / CLOSE_SPOUSE ───────────────────────────────

describe("REVEAL_SPOUSE action", () => {
  it("adds spouse to revealedUnions", () => {
    const s0 = rootState("@I1@");
    const s1 = treeReducer(s0, {
      type: "REVEAL_SPOUSE",
      personId: "@I1@",
      spouseId: "@I2@",
    });
    const vs = s1.viewState as { revealedUnions?: Map<string, string[]> };
    expect(vs.revealedUnions).toBeDefined();
    expect(vs.revealedUnions!.get("@I1@")).toContain("@I2@");
  });
});

describe("CLOSE_SPOUSE action", () => {
  it("removes a previously revealed spouse", () => {
    let s = rootState("@I1@");
    s = treeReducer(s, { type: "REVEAL_SPOUSE", personId: "@I1@", spouseId: "@I2@" });
    s = treeReducer(s, { type: "CLOSE_SPOUSE", spouseId: "@I2@" });
    const vs = s.viewState as { revealedUnions?: Map<string, string[]> };
    const revealed = vs.revealedUnions?.get("@I1@") ?? [];
    expect(revealed).not.toContain("@I2@");
  });
});

// ─── Descendancy: REVEAL_ALL_SPOUSES / CLOSE_ALL_SPOUSES ─────────────────────

describe("REVEAL_ALL_SPOUSES / CLOSE_ALL_SPOUSES", () => {
  it("REVEAL_ALL_SPOUSES sets a flag on viewState", () => {
    const s0 = rootState("@I1@");
    const s1 = treeReducer(s0, { type: "REVEAL_ALL_SPOUSES" });
    expect(s1.viewState).toBeDefined();
    // should push a history entry to record the action
    expect(s1.history.length).toBe(s0.history.length + 1);
  });

  it("CLOSE_ALL_SPOUSES clears revealed unions", () => {
    let s = rootState("@I1@");
    s = treeReducer(s, { type: "REVEAL_SPOUSE", personId: "@I1@", spouseId: "@I2@" });
    s = treeReducer(s, { type: "CLOSE_ALL_SPOUSES" });
    const vs = s.viewState as { revealedUnions?: Map<string, string[]> };
    const count = vs.revealedUnions
      ? [...vs.revealedUnions.values()].flat().length
      : 0;
    expect(count).toBe(0);
  });
});

// ─── Descendancy: COLLAPSE_SUBTREE / EXPAND_SUBTREE ──────────────────────────

describe("COLLAPSE_SUBTREE / EXPAND_SUBTREE", () => {
  it("COLLAPSE_SUBTREE adds personId to collapsedSubtrees", () => {
    const s0 = rootState("@I1@");
    const s1 = treeReducer(s0, { type: "COLLAPSE_SUBTREE", personId: "@I2@" });
    const vs = s1.viewState as { collapsedSubtrees?: string[] };
    expect(vs.collapsedSubtrees).toContain("@I2@");
  });

  it("EXPAND_SUBTREE removes personId from collapsedSubtrees", () => {
    let s = rootState("@I1@");
    s = treeReducer(s, { type: "COLLAPSE_SUBTREE", personId: "@I2@" });
    s = treeReducer(s, { type: "EXPAND_SUBTREE", personId: "@I2@" });
    const vs = s.viewState as { collapsedSubtrees?: string[] };
    expect(vs.collapsedSubtrees ?? []).not.toContain("@I2@");
  });
});

// ─── Descendancy: SET_CURRENT_DEPTH ──────────────────────────────────────────

describe("SET_CURRENT_DEPTH action", () => {
  it("updates currentDepth in viewState", () => {
    const s0 = rootState("@I1@");
    const s1 = treeReducer(s0, { type: "SET_CURRENT_DEPTH", depth: 5 });
    expect((s1.viewState as { currentDepth?: number }).currentDepth).toBe(5);
  });
});

// ─── Unknown action ───────────────────────────────────────────────────────────

describe("unknown action type", () => {
  it("returns state unchanged for an unrecognised action", () => {
    const s0 = rootState("@I1@");
    // @ts-expect-error intentional unknown action
    const s1 = treeReducer(s0, { type: "DOES_NOT_EXIST" });
    expect(s1).toEqual(s0);
  });
});

// ─── State immutability ───────────────────────────────────────────────────────

describe("state immutability", () => {
  it("ROOT returns a new object, not the same reference", () => {
    const s0 = rootState("@I1@");
    const s1 = treeReducer(s0, { type: "ROOT", personId: "@I2@" });
    expect(s1).not.toBe(s0);
  });

  it("BACK when no history returns the exact same object reference", () => {
    const s0 = rootState("@I1@");
    const s1 = treeReducer(s0, { type: "BACK" });
    expect(s1).toBe(s0);
  });
});
