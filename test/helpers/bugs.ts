/**
 * Known bugs from the 2026-10-17 audit (spec Part 1, step 5 and "High-severity bugs").
 *
 * Each repro is written as the *correct* behaviour and registered with `it.fails`, so the
 * suite stays green while the bug exists and turns red the moment a fix lands. The fixer
 * then changes `knownBug(...)` to a plain `it(...)`.
 *
 * Run `BUGS_STRICT=1 npx vitest run test/bugs` to register them as plain tests instead and
 * read the real failure of each one (it must be the assertion, not a setup error).
 */
import { it } from "vitest";

export function knownBug(
  id: string,
  name: string,
  fn: () => unknown,
  timeoutMs?: number
): void {
  const title = `[${id}] ${name}`;
  if (process.env.BUGS_STRICT) it(title, fn, timeoutMs);
  else it.fails(title, fn, timeoutMs);
}
