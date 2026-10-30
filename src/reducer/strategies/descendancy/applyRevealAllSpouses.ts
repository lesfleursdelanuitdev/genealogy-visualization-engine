import type { TreeState } from "../../types";
import type { ViewState } from "../../../types";
import { pushHistory } from "../../pushHistory";
import type { GraphSnapshot } from "../../../graph";
import { withoutFamilyUnitScope } from "./familyUnitScope";

function vs(s: TreeState): ViewState {
  return s.viewState as ViewState;
}

/**
 * Build revealedUnions only for principal nodes — those reachable as descendants of rootId
 * through union children links. Inline spouse nodes (right-side of NormalUnionNode) are NOT
 * principals and are excluded, which prevents phantom Si→[P] entries that have no visual effect
 * but corrupt future isAllSpousesRevealed checks.
 */
function buildAllRevealedUnions(graph: GraphSnapshot, rootId: string): Map<string, string[]> {
  const next = new Map<string, string[]>();
  const principals = new Set<string>();
  const queue: string[] = [rootId];
  while (queue.length > 0) {
    const personId = queue.shift()!;
    if (principals.has(personId)) continue;
    principals.add(personId);
    for (const union of graph.unionsOf(personId)) {
      for (const child of union.children) {
        if (!principals.has(child.id)) queue.push(child.id);
      }
    }
  }
  for (const personId of principals) {
    // Once per partner (R1): a couple with two FAM records is one partner with two families.
    const spouses = [...new Set(graph.spousesOf(personId).map(({ spouseId }) => spouseId))];
    if (spouses.length > 0) next.set(personId, spouses);
  }
  return next;
}

/**
 * True if every principal's spouses are all revealed.
 * Accepts optional rootId to scope the check to the actual tree principals; without it falls
 * back to checking only the persons already present in revealedUnions (safe approximation).
 * Does NOT require exact size equality — extra phantom entries in revealedUnions are ignored.
 */
export function isAllSpousesRevealed(
  graph: GraphSnapshot,
  revealedUnions: Map<string, string[]> | undefined,
  rootId?: string
): boolean {
  const full = rootId
    ? buildAllRevealedUnions(graph, rootId)
    : (() => {
        // Fallback: check only persons already in revealedUnions have all their spouses open
        const m = new Map<string, string[]>();
        for (const personId of revealedUnions?.keys() ?? []) {
          const all = graph.spousesOf(personId).map(({ spouseId }) => spouseId);
          if (all.length > 0) m.set(personId, all);
        }
        return m;
      })();
  if (full.size === 0) return false;
  for (const [personId, spouseIds] of full) {
    const current = new Set(revealedUnions?.get(personId) ?? []);
    if (spouseIds.some((id) => !current.has(id))) return false;
  }
  return true;
}

export function applyRevealAllSpouses(state: TreeState, graph: GraphSnapshot): TreeState {
  const v = vs(state);
  const revealedUnions = buildAllRevealedUnions(graph, state.rootId);
  const newViewState = { ...withoutFamilyUnitScope(v), revealedUnions };
  const hist = pushHistory(state, state.rootId, newViewState, "Toggle all partners");
  return { ...state, viewState: newViewState, ...hist };
}
