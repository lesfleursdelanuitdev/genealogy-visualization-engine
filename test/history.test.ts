/**
 * The history panel (Gonsalves, and the viewer) relies on the reducer's history: one labelled
 * entry per action, BACK / FORWARD / NAVIGATE_TO_INDEX restoring root, chart type and view
 * state, and display names stored at push time. This walks one chart through a session.
 */
import { describe, it, expect } from "vitest";
import {
  createChartSession,
  createGraphSnapshot,
  createInitialState,
  createTreeReducer,
  MAX_HISTORY,
  PersonNode,
  UnionNode,
  type ChartNode,
  type ChartViewStrategyName,
  type TreeAction,
  type TreeState,
  type ViewState,
} from "../src";
import { person, union, cardsIn } from "./helpers/graph";

// Rita + Sam → Cal, Cia ; Cal's child Gus (other parent unknown) ; Rita's parents Pia + Ugo
const graph = createGraphSnapshot({
  people: [
    person("@R@", "Rita", "Lopes"),
    person("@S@", "Sam", "Lopes"),
    person("@C1@", "Cal", "Lopes"),
    person("@C2@", "Cia", "Lopes"),
    person("@G@", "Gus", "Lopes"),
    person("@P@", "Pia", "Reis"),
    person("@U@", "Ugo", "Reis"),
  ],
  unions: [
    union("@F1@", "@S@", "@R@", ["@C1@", "@C2@"]),
    union("@F2@", "@C1@", "", ["@G@"]),
    union("@F0@", "@U@", "@P@", ["@R@"]),
  ],
});
const reduce = createTreeReducer(graph);

/** What the chart shows for a state, at depth cap 1. */
function chart(state: TreeState): { root: ChartNode; ids: string[] } {
  const session = createChartSession({
    graph,
    viewState: state.viewState as ViewState,
    options: { strategy: state.strategyName as ChartViewStrategyName, maxDepth: 1 },
  });
  const { root } = session.buildTree(state.rootId);
  return { root, ids: cardsIn(root).map((c) => c.id) };
}

function entry(state: TreeState) {
  return state.history[state.historyIndex];
}

describe("history through a chart session", () => {
  const steps: Array<{ action: TreeAction; label: string }> = [
    { action: { type: "REVEAL_SPOUSE", personId: "@R@", spouseId: "@S@" }, label: "Show partner" },
    { action: { type: "SHOW_CHILDREN", personId: "@C1@", atMaxDepth: true, currentDepth: 1 }, label: "Show children" },
    { action: { type: "PAN_TO_PERSON", personId: "@G@" }, label: "Pan to person Gus Lopes" },
    { action: { type: "CLOSE_SPOUSE", personId: "@R@", spouseId: "@S@" }, label: "Close partner" },
    { action: { type: "SET_VIEW_STRATEGY", strategyName: "pedigree" }, label: "Pedigree view" },
    { action: { type: "ROOT", personId: "@C1@" }, label: "Make Cal Lopes root" },
  ];

  function run(): TreeState[] {
    const states = [createInitialState("descendancy", "@R@")];
    for (const { action } of steps) states.push(reduce(states[states.length - 1], action));
    return states;
  }

  it("pushes one labelled entry per action, with display names", () => {
    const states = run();
    const last = states[states.length - 1];
    expect(last.history.map((h) => h.actionLabel)).toEqual(["Initial view", ...steps.map((s) => s.label)]);
    expect(last.historyIndex).toBe(steps.length);
    expect(last.history.map((h) => h.strategyName)).toEqual([
      "descendancy", "descendancy", "descendancy", "descendancy", "descendancy", "pedigree", "pedigree",
    ]);
    expect(last.history[1]).toMatchObject({ triggerPersonId: "@R@", triggerPersonFullName: "Rita Lopes", triggerPersonInitials: "RL" });
    expect(last.history[2]).toMatchObject({ triggerPersonId: "@C1@", triggerPersonFullName: "Cal Lopes", triggerPersonInitials: "CL" });
    expect(last.history[6]).toMatchObject({ rootId: "@C1@", rootPersonFullName: "Cal Lopes", rootPersonInitials: "CL" });
  });

  it("each step's chart is what the user asked for", () => {
    const [s0, s1, s2, , s4, s5, s6] = run();
    expect(chart(s0).ids).not.toContain("@S@"); // partner hidden; children under a catch-all
    expect(chart(s1).ids).toContain("@S@");
    expect(chart(s1).ids).not.toContain("@G@"); // Cal is at the cap
    expect(chart(s2).ids).toContain("@G@"); // Show children at the cap: Gus one row deeper
    expect(chart(s4).ids).not.toContain("@S@"); // partner closed again
    const pedigreeRoot = chart(s5).root as PersonNode;
    expect(pedigreeRoot.content.id).toBe("@R@");
    expect((pedigreeRoot.children[0] as UnionNode).left.content.id).toBe("@U@");
    expect((chart(s6).root as PersonNode).content.id).toBe("@C1@");
  });

  it("BACK, FORWARD and NAVIGATE_TO_INDEX restore root, chart type and view", () => {
    const states = run();
    let s = states[states.length - 1];

    s = reduce(s, { type: "BACK" });
    expect(entry(s).actionLabel).toBe("Pedigree view");
    expect(s.strategyName).toBe("pedigree");
    expect(s.rootId).toBe("@R@");
    expect((chart(s).root as PersonNode).content.id).toBe("@R@");

    s = reduce(s, { type: "BACK" });
    expect(entry(s).actionLabel).toBe("Close partner");
    expect(s.strategyName).toBe("descendancy");
    expect(chart(s).ids).not.toContain("@S@");

    s = reduce(s, { type: "BACK" });
    expect(entry(s).actionLabel).toBe("Pan to person Gus Lopes");
    expect((s.viewState as ViewState).panToPersonId).toBe("@G@"); // the entry keeps its pan target
    expect(chart(s).ids).toContain("@S@");

    s = reduce(s, { type: "FORWARD" });
    expect(entry(s).actionLabel).toBe("Close partner");
    expect((s.viewState as ViewState).panToPersonId).toBeUndefined();

    s = reduce(s, { type: "NAVIGATE_TO_INDEX", index: 2 });
    expect(entry(s).actionLabel).toBe("Show children");
    expect(s.historyIndex).toBe(2);
    expect(chart(s).ids).toContain("@G@");

    s = reduce(s, { type: "NAVIGATE_TO_INDEX", index: 0 });
    expect(entry(s).actionLabel).toBe("Initial view");
    expect(chart(s).ids).not.toContain("@S@");

    // A new action after going back drops the entries ahead of it.
    s = reduce(s, { type: "REVEAL_SPOUSE", personId: "@R@", spouseId: "@S@" });
    expect(s.history.map((h) => h.actionLabel)).toEqual(["Initial view", "Show partner"]);
  });

  it(`keeps at most MAX_HISTORY (${MAX_HISTORY}) entries`, () => {
    let s = createInitialState("descendancy", "@R@");
    for (let i = 0; i < MAX_HISTORY + 4; i++) {
      s = reduce(s, { type: "ROOT", personId: i % 2 ? "@R@" : "@C1@" });
    }
    expect(s.history).toHaveLength(MAX_HISTORY);
    expect(MAX_HISTORY).toBe(21);
  });

  it("CLEAR_HISTORY and RESTORE_HISTORY still work", () => {
    const states = run();
    const last = states[states.length - 1];
    const cleared = reduce(last, { type: "CLEAR_HISTORY" });
    expect(cleared.history).toHaveLength(1);
    expect(cleared.rootId).toBe("@R@");
    const restored = reduce(cleared, { type: "RESTORE_HISTORY", history: last.history, historyIndex: 2 });
    expect(entry(restored).actionLabel).toBe("Show children");
    expect(chart(restored).ids).toContain("@G@");
  });
});
