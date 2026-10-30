/**
 * Smoke test for the built package: what `npm run build` writes to dist/ must load
 * through a bundler-style resolver (vitest uses Vite's) and expose the main API.
 * Skipped when dist/ has not been built; `npm run check` builds first.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const distEntry = fileURLToPath(new URL("../dist/index.js", import.meta.url));

describe.skipIf(!existsSync(distEntry))("dist build", () => {
  it("loads and exposes layout, reducer and fan geometry", async () => {
    const mod = (await import(/* @vite-ignore */ distEntry)) as Record<string, unknown>;
    expect(typeof mod.layout).toBe("function");
    expect(typeof mod.treeReducer).toBe("function");
    expect(typeof mod.buildFanGeometry).toBe("function");
  });

  it("ships type declarations next to the entry", () => {
    expect(existsSync(fileURLToPath(new URL("../dist/index.d.ts", import.meta.url)))).toBe(true);
  });
});
