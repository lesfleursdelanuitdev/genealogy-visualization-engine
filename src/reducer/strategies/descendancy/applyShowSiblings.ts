import { getParentUnionsByChild, getPeople } from "../../../testdata";
import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";
import { pushHistory } from "../../pushHistory";

/**
 * Sets root and minimal siblingView (personId + placeholder arrays).
 * Catch-alls are filled when the sibling-view API response arrives (SET_SIBLING_VIEW_FROM_API).
 */
export function applyShowSiblings(state: TreeState, personId: string): TreeState {
  const parentUnions = getParentUnionsByChild().get(personId) ?? [];
  if (parentUnions.length === 0) return state;

  const birthUnion =
    parentUnions.find((u) => u.children.find((c) => c.id === personId)?.pedi === "birth") ??
    parentUnions[0];

  const newRoot = birthUnion.husb;
  const otherParent = birthUnion.wife;

  const nextRevealed = new Map<string, string[]>();
  const existing = nextRevealed.get(newRoot) ?? [];
  if (!existing.includes(otherParent)) nextRevealed.set(newRoot, [...existing, otherParent]);

  const newViewState: ViewState = {
    revealedUnions: nextRevealed,
    linkedUnions: new Map(),
    displayDepth: undefined,
    currentDepth: undefined,
    expandDownTopRow: undefined,
    siblingView: {
      personId,
      spouseCatchAlls: [],
      adoptiveUnions: [],
      adoptiveCatchAlls: [],
    },
  };

  const people = getPeople();
  const personForLabel = people.get(personId);
  const personFullName =
    (personForLabel
      ? `${personForLabel.firstName ?? ""} ${personForLabel.lastName ?? ""}`.trim()
      : null) || personId;
  const triggerInitials = personForLabel
    ? ((personForLabel.firstName?.trim() || "")[0] ?? "") + ((personForLabel.lastName?.trim() || "")[0] ?? "")
    : "?";
  const rootPerson = people.get(newRoot);
  const rootFullName =
    (rootPerson ? `${rootPerson.firstName ?? ""} ${rootPerson.lastName ?? ""}`.trim() : null) || newRoot;
  const rootInitials = rootPerson
    ? ((rootPerson.firstName?.trim() || "")[0] ?? "") + ((rootPerson.lastName?.trim() || "")[0] ?? "")
    : "?";
  const actionLabel = `Show siblings of ${personFullName}`;
  const hist = pushHistory(state, newRoot, newViewState, actionLabel, personId, {
    triggerPersonFullName: personFullName,
    triggerPersonInitials: (triggerInitials || "?").toUpperCase(),
    rootPersonFullName: rootFullName,
    rootPersonInitials: (rootInitials || "?").toUpperCase(),
  });
  return { ...state, rootId: newRoot, viewState: newViewState, ...hist };
}
