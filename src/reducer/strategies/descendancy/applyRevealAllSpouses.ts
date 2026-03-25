import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";
import { pushHistory } from "../../pushHistory";
import { getPeople, getSpousesOf } from "../../../builder/currentBuilder";

function vs(s: TreeState): ViewState {
  return s.viewState as ViewState;
}

/** Build revealedUnions with every person's spouses all revealed. */
export function buildAllRevealedUnions(): Map<string, string[]> {
  const next = new Map<string, string[]>();
  const people = getPeople();
  for (const personId of people.keys()) {
    const spouses = getSpousesOf(personId).map(({ spouseId }) => spouseId);
    if (spouses.length > 0) next.set(personId, spouses);
  }
  return next;
}

/** True if current view state has all spouses revealed (same as buildAllRevealedUnions). */
export function isAllSpousesRevealed(revealedUnions: Map<string, string[]> | undefined): boolean {
  const full = buildAllRevealedUnions();
  if (full.size !== (revealedUnions?.size ?? 0)) return false;
  for (const [personId, spouseIds] of full) {
    const current = new Set(revealedUnions?.get(personId) ?? []);
    if (current.size !== spouseIds.length || spouseIds.some((id) => !current.has(id))) return false;
  }
  return true;
}

export function applyRevealAllSpouses(state: TreeState): TreeState {
  const v = vs(state);
  const revealedUnions = buildAllRevealedUnions();
  const newViewState = { ...v, revealedUnions };
  const hist = pushHistory(state, state.rootId, newViewState, "Toggle all partners");
  return { ...state, viewState: newViewState, ...hist };
}
