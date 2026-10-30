/**
 * Package boundaries from REFACTOR_PLAN.md, checked on the source text.
 * Phase 2: production code never imports test data.
 * Phase 3: no global "current builder"; the modules that build, lay out and reduce keep no
 * module-level mutable bindings (only debug/ timing instrumentation, opt-in, may).
 * Phase 4: no app routes in code, and process.env is read only in src/env.ts (guarded).
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

  it("nothing refers to a global current builder (phase 3)", () => {
    const hits = sourceFiles(srcDir)
      .filter((file) => /currentBuilder|setCurrentBuilder|clearCurrentBuilder/.test(readFileSync(file, "utf8")))
      .map((file) => relative(srcDir, file));
    expect(hits).toEqual([]);
  });

  it("no module-level let/var outside debug/ (phase 3)", () => {
    const hits = sourceFiles(srcDir)
      .filter((file) => !relative(srcDir, file).startsWith("debug"))
      .filter((file) => /^(let|var)\s/m.test(readFileSync(file, "utf8")))
      .map((file) => relative(srcDir, file));
    expect(hits).toEqual([]);
  });

  it("no app route URL in any string (phase 4)", () => {
    const hits = sourceFiles(srcDir)
      .filter((file) => /["'`]\/api\//.test(stripComments(readFileSync(file, "utf8"))))
      .map((file) => relative(srcDir, file));
    expect(hits).toEqual([]);
  });

  it("only env.ts reads process (phase 4)", () => {
    const hits = sourceFiles(srcDir)
      .filter((file) => relative(srcDir, file) !== "env.ts")
      .filter((file) => /\bprocess\./.test(stripComments(readFileSync(file, "utf8"))))
      .map((file) => relative(srcDir, file));
    expect(hits).toEqual([]);
  });
});

function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}
