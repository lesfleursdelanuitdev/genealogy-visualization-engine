/**
 * Helpers for history entry display: full name and initials from the chart's graph at action time.
 */

import type { GraphSnapshot } from "../graph";
import { initialLetters } from "./personText";

export function getPersonDisplay(graph: GraphSnapshot, personId: string): { fullName: string; initials: string } {
  const p = graph.people.get(personId);
  const fullName =
    (p ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() : null) || personId;
  const initials = p
    ? initialLetters(p)
    : /^@I[^@]*@$/.test(personId)
      ? "?"
      : personId.slice(0, 2);
  return {
    fullName,
    initials: (initials || "?").toUpperCase(),
  };
}
