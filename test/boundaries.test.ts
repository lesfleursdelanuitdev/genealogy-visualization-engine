/**
 * Package boundaries from REFACTOR_PLAN.md, checked on the source text.
 * Phase 2: production code never imports test data.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const srcDir = fileURLToPath(new URL("../src", import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(p);
    return /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

/** Files under src/ whose import specifiers match `pattern`. */
function importersOf(pattern: RegExp): string[] {
  return sourceFiles(srcDir)
    .filter((file) => {
      const specifiers = [...readFileSync(file, "utf8").matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
      return specifiers.some((s) => pattern.test(s));
    })
    .map((file) => relative(srcDir, file));
}

describe("package boundaries", () => {
  it("no production module imports test data or test code (phase 2)", () => {
    expect(importersOf(/testdata|\/test\/|fixtures/)).toEqual([]);
  });
});
