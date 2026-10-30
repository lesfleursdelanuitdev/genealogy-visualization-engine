/** Generated graphs for the bug repros. */
import { person, union, type GraphFixture } from "./graph";

/**
 * Descendants of `p0`: every principal marries one outside spouse and has `childrenPerCouple`
 * children, for `generations` generations. Returns the fixture and a `revealedUnions` map with
 * every principal's spouse revealed (what "Toggle all partners" produces).
 */
export function wideFamily(
  childrenPerCouple: number,
  generations: number
): { fixture: GraphFixture; revealedUnions: Map<string, string[]> } {
  const people = [person("p0")];
  const unions = [];
  const revealedUnions = new Map<string, string[]>();
  let row = ["p0"];
  let n = 0;
  for (let g = 0; g < generations; g++) {
    const next: string[] = [];
    for (const principal of row) {
      const spouse = `s${n++}`;
      people.push(person(spouse));
      const kids = Array.from({ length: childrenPerCouple }, () => `c${n++}`);
      for (const c of kids) people.push(person(c));
      unions.push(union(`f-${principal}`, principal, spouse, kids));
      revealedUnions.set(principal, [spouse]);
      next.push(...kids);
    }
    row = next;
  }
  return { fixture: { people, unions }, revealedUnions };
}
