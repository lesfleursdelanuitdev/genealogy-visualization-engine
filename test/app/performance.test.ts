import { describe, it, expect } from "vitest";
import { layout, markUnions } from "../../src";
import { buildTestTree } from "../fixtures/smith";
import { buildWideTree, buildDeepTree } from "./_fixtures";

const LAYOUT_BUDGET_MS = 300;

function timeLayout(tree: ReturnType<typeof buildTestTree>): number {
  const start = performance.now();
  markUnions(tree);
  layout(tree);
  return performance.now() - start;
}

describe("performance — layout under 300ms", () => {
  it("lays out the built-in ~40-person test tree well under budget", () => {
    const tree = buildTestTree();
    const ms = timeLayout(tree);
    expect(ms).toBeLessThan(LAYOUT_BUDGET_MS);
  });

  it("lays out a 110-node wide tree (10 unions × 10 children) under budget", () => {
    const tree = buildWideTree(10, 10);
    const ms = timeLayout(tree);
    expect(ms).toBeLessThan(LAYOUT_BUDGET_MS);
  });

  it("lays out a 200-node wide tree (20 unions × 10 children) under budget", () => {
    const tree = buildWideTree(20, 10);
    const ms = timeLayout(tree);
    expect(ms).toBeLessThan(LAYOUT_BUDGET_MS);
  });

  it("lays out a 100-generation deep chain under budget", () => {
    const tree = buildDeepTree(100);
    const ms = timeLayout(tree);
    expect(ms).toBeLessThan(LAYOUT_BUDGET_MS);
  });

  it("lays out a 200-generation deep chain under budget", () => {
    const tree = buildDeepTree(200);
    const ms = timeLayout(tree);
    expect(ms).toBeLessThan(LAYOUT_BUDGET_MS);
  });
});
