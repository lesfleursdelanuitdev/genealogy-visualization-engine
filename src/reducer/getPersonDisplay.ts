/**
 * Helpers for history entry display: full name and initials from getPeople() at action time.
 */

import { getPeople } from "../builder/currentBuilder";

export function getPersonDisplay(personId: string): { fullName: string; initials: string } {
  const p = getPeople().get(personId);
  const fullName =
    (p ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() : null) || personId;
  const initials = p
    ? ((p.firstName?.trim() || "")[0] ?? "") + ((p.lastName?.trim() || "")[0] ?? "")
    : /^@I[^@]*@$/.test(personId)
      ? "?"
      : personId.slice(0, 2);
  return {
    fullName,
    initials: (initials || "?").toUpperCase(),
  };
}
