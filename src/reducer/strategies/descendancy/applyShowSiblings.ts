import type { GraphSnapshot } from "../../../graph";
import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";
import { pushHistory } from "../../pushHistory";
import { initialLetters } from "../../personText";
import { computeSiblingView } from "../../../graph/queries";

/**
 * Show parents & siblings of `personId`: root at the birth father (else the mother), reveal the
 * other birth parent, and fill the sibling view from the graph (computeSiblingView). The
 * Gonsalves app may still replace the meta with its route's (SET_SIBLING_VIEW_FROM_API).
 */
export function applyShowSiblings(state: TreeState, personId: string, graph: GraphSnapshot): TreeState {
  const computed = computeSiblingView(graph, personId);
  if (!computed) return state;

  const newRoot = computed.rootId;
  const nextRevealed = new Map<string, string[]>();
  if (computed.partnerId) nextRevealed.set(newRoot, [computed.partnerId]);

  const newViewState: ViewState = {
    revealedUnions: nextRevealed,
    linkedUnions: new Map(),
    displayDepth: undefined,
    currentDepth: undefined,
    siblingView: computed.siblingView,
  };

  const people = graph.people;
  const personForLabel = people.get(personId);
  const personFullName =
    (personForLabel
      ? `${personForLabel.firstName ?? ""} ${personForLabel.lastName ?? ""}`.trim()
      : null) || personId;
  const triggerInitials = personForLabel
    ? initialLetters(personForLabel)
    : "?";
  const rootPerson = people.get(newRoot);
  const rootFullName =
    (rootPerson ? `${rootPerson.firstName ?? ""} ${rootPerson.lastName ?? ""}`.trim() : null) || newRoot;
  const rootInitials = rootPerson
    ? initialLetters(rootPerson)
    : "?";
  const actionLabel = `Show parents & siblings of ${personFullName}`;
  const hist = pushHistory(state, newRoot, newViewState, actionLabel, personId, {
    triggerPersonFullName: personFullName,
    triggerPersonInitials: (triggerInitials || "?").toUpperCase(),
    rootPersonFullName: rootFullName,
    rootPersonInitials: (rootInitials || "?").toUpperCase(),
  });
  return { ...state, rootId: newRoot, viewState: newViewState, ...hist };
}
