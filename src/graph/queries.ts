/**
 * Pure questions about a GraphSnapshot. A standalone viewer has the whole file in memory and
 * no server, so these do in the browser what the Gonsalves routes did (see
 * docs/server-logic-for-standalone.md).
 */

import type { GraphSnapshot, SnapshotUnion } from "./GraphSnapshot";

export interface AncestorClimbOptions {
  /** Chosen parent family per person (person id → family id), as in viewState.pedigreeFamcOverrides. */
  famcOverrides?: Readonly<Record<string, string>>;
  /** Family to climb from the starting person (the pedigree root's chosen FAMC). */
  firstFamilyId?: string | null;
}

/**
 * The family the ancestor charts climb from `personId`: a chosen family when it lists the
 * person as a child, otherwise the birth family (T20).
 */
export function parentFamilyToClimb(
  graph: GraphSnapshot,
  personId: string,
  chosenFamilyId?: string | null
): SnapshotUnion | undefined {
  const chosen = chosenFamilyId ? graph.unionById.get(chosenFamilyId) : undefined;
  if (chosen && chosen.children.some((c) => c.id === personId)) return chosen;
  return graph.birthUnionByChild.get(personId);
}

/** Known parents (no unknown placeholders) of a family. */
function knownParents(graph: GraphSnapshot, u: SnapshotUnion): string[] {
  return [u.husb, u.wife].filter((id) => id && graph.people.get(id)?._unknownPlaceholder !== true);
}

const ancestorCountCache = new WeakMap<GraphSnapshot, Map<string, number>>();

/**
 * Number of different people above `personId` along the families an ancestor chart climbs.
 * Each ancestor counts once, even when reached through two lines (pedigree collapse), and a
 * person who is their own ancestor is not counted or looped over. A fresh walk each time, so
 * the result never depends on earlier calls; cached per snapshot when no family is chosen.
 */
export function countAncestors(graph: GraphSnapshot, personId: string, options: AncestorClimbOptions = {}): number {
  const overrides = options.famcOverrides ?? {};
  const plain = Object.keys(overrides).length === 0 && !options.firstFamilyId;
  let cache: Map<string, number> | undefined;
  if (plain) {
    cache = ancestorCountCache.get(graph);
    if (!cache) {
      cache = new Map();
      ancestorCountCache.set(graph, cache);
    }
    const hit = cache.get(personId);
    if (hit !== undefined) return hit;
  }

  const seen = new Set<string>([personId]);
  const stack: Array<{ id: string; first: boolean }> = [{ id: personId, first: true }];
  while (stack.length > 0) {
    const { id, first } = stack.pop()!;
    const chosen = first && options.firstFamilyId ? options.firstFamilyId : overrides[id];
    const family = parentFamilyToClimb(graph, id, chosen);
    if (!family) continue;
    for (const parent of knownParents(graph, family)) {
      if (seen.has(parent)) continue;
      seen.add(parent);
      stack.push({ id: parent, first: false });
    }
  }
  const count = seen.size - 1;
  cache?.set(personId, count);
  return count;
}
