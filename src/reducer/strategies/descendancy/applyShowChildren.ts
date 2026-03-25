/**
 * Action: SHOW_CHILDREN(P) — expand tree downward.
 * Case 1 (current depth < max): add one generation (displayDepth).
 * Case 2 (at max depth): prune top generation, re-root to R' from G_2, preserve G_2 row (expandDownTopRow).
 */

import { getUnionsByPerson, getPeople } from "../../../testdata";
import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";
import { pushHistory } from "../../pushHistory";

function viewState(state: TreeState): ViewState {
  return state.viewState as ViewState;
}

/**
 * Build ordered list of person IDs in the current "second generation" (union row from root).
 * Used as expandDownTopRow so layout can preserve that row when we re-root.
 */
function getSecondGenerationOrdered(rootId: string): string[] {
  const unions = getUnionsByPerson().get(rootId) ?? [];
  return unions.flatMap((u) =>
    u.husb === rootId ? [u.husb, u.wife] : [u.wife, u.husb]
  );
}

export function applyShowChildren(
  state: TreeState,
  personId: string,
  atMaxDepth: boolean,
  currentDepth?: number
): TreeState {
  const vs = viewState(state);

  if (!atMaxDepth) {
    // Case 1: Add one more generation — set displayDepth and currentDepth so builder uses depth + 1.
    const nextDepth = (currentDepth ?? 0) + 1;
    const newViewState: ViewState = {
      ...vs,
      displayDepth: nextDepth,
      currentDepth: nextDepth,
    };
    const people = getPeople();
    const triggerP = people.get(personId);
    const triggerFullName =
      (triggerP ? `${triggerP.firstName ?? ""} ${triggerP.lastName ?? ""}`.trim() : null) || personId;
    const triggerInitials = triggerP
      ? ((triggerP.firstName?.trim() || "")[0] ?? "") + ((triggerP.lastName?.trim() || "")[0] ?? "")
      : "?";
    const hist = pushHistory(state, state.rootId, newViewState, "Show children", personId, {
      triggerPersonFullName: triggerFullName,
      triggerPersonInitials: (triggerInitials || "?").toUpperCase(),
    });
    return { ...state, viewState: newViewState, ...hist };
  }

  // Case 2: At max depth — prune G_1, promote G_2; pick R' from G_2, preserve row order.
  const topRowOrder = getSecondGenerationOrdered(state.rootId);
  if (topRowOrder.length === 0) return state;

  const newRootId = topRowOrder.includes(personId) ? personId : topRowOrder[0];

  const newViewState: ViewState = {
    ...vs,
    siblingView: undefined,
    displayDepth: undefined,
    currentDepth: undefined,
    expandDownTopRow: topRowOrder,
  };

  const people = getPeople();
  const p = people.get(newRootId);
  const newRootFullName =
    (p ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() : null) || newRootId;
  const newRootInitials =
    (p ? ((p.firstName?.trim() || "")[0] ?? "") + ((p.lastName?.trim() || "")[0] ?? "") : "") ||
    (/^@I[^@]*@$/.test(newRootId) ? "?" : newRootId.slice(0, 2));
  const triggerP = people.get(personId);
  const triggerFullName =
    (triggerP ? `${triggerP.firstName ?? ""} ${triggerP.lastName ?? ""}`.trim() : null) || personId;
  const triggerInitials = triggerP
    ? ((triggerP.firstName?.trim() || "")[0] ?? "") + ((triggerP.lastName?.trim() || "")[0] ?? "")
    : "?";
  const actionLabel = `Show children, make ${newRootFullName} root`;
  const hist = pushHistory(state, newRootId, newViewState, actionLabel, personId, {
    triggerPersonFullName: triggerFullName,
    triggerPersonInitials: (triggerInitials || "?").toUpperCase(),
    rootPersonFullName: newRootFullName,
    rootPersonInitials: (newRootInitials || "?").toUpperCase(),
  });
  return { ...state, rootId: newRootId, viewState: newViewState, ...hist };
}
