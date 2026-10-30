/**
 * Pure questions about a GraphSnapshot. A standalone viewer has the whole file in memory and
 * no server, so these do in the browser what the Gonsalves routes did (see
 * docs/server-logic-for-standalone.md).
 */

import type { GraphSnapshot, SnapshotUnion } from "./GraphSnapshot";
import type { SiblingView } from "../types";

export interface AncestorClimbOptions {
  /** Chosen parent family per person (person id → family id), as in viewState.pedigreeFamcOverrides. */
  famcOverrides?: Readonly<Record<string, string>>;
  /** Family to climb from the starting person (the pedigree root's chosen FAMC). */
  firstFamilyId?: string | null;
  /** Count only this many generations up (default: all). */
  maxGenerations?: number;
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
  const maxGenerations = options.maxGenerations ?? Infinity;
  const plain = Object.keys(overrides).length === 0 && !options.firstFamilyId && maxGenerations === Infinity;
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
  // Breadth-first, so with maxGenerations each person is reached at their nearest generation.
  const queue: Array<{ id: string; first: boolean; gen: number }> = [{ id: personId, first: true, gen: 0 }];
  for (let i = 0; i < queue.length; i++) {
    const { id, first, gen } = queue[i];
    if (gen >= maxGenerations) continue;
    const chosen = first && options.firstFamilyId ? options.firstFamilyId : overrides[id];
    const family = parentFamilyToClimb(graph, id, chosen);
    if (!family) continue;
    for (const parent of knownParents(graph, family)) {
      if (seen.has(parent)) continue;
      seen.add(parent);
      queue.push({ id: parent, first: false, gen: gen + 1 });
    }
  }
  const count = seen.size - 1;
  cache?.set(personId, count);
  return count;
}

// ─── parent families ────────────────────────────────────────────────────────

/** The person's birth family (T20, one rule everywhere). */
export function birthFamilyOf(graph: GraphSnapshot, personId: string): SnapshotUnion | undefined {
  return graph.birthUnionByChild.get(personId);
}

/** The family an ancestor chart starts from when the user hasn't chosen one. */
export function defaultFamc(graph: GraphSnapshot, personId: string): string | null {
  return birthFamilyOf(graph, personId)?.id ?? null;
}

export interface ParentFamily {
  familyId: string;
  /** null when unknown (a per-family placeholder). */
  fatherId: string | null;
  motherId: string | null;
  /** The person's pedi in this family: "birth", "adopted", "foster", … */
  kind: string;
  isBirthFamily: boolean;
  /** All children of the family, in CHIL order (T21). */
  childIds: string[];
}

function knownOrNull(graph: GraphSnapshot, id: string): string | null {
  return id && graph.people.get(id)?._unknownPlaceholder !== true ? id : null;
}

/** The person's parent families, in FAMC order: what "Choose parent family" offers. */
export function parentFamiliesOf(graph: GraphSnapshot, personId: string): ParentFamily[] {
  const birth = birthFamilyOf(graph, personId);
  return graph.parentUnionsOf(personId).map((u) => ({
    familyId: u.id,
    fatherId: knownOrNull(graph, u.husb),
    motherId: knownOrNull(graph, u.wife),
    kind: u.children.find((c) => c.id === personId)?.pedi ?? "birth",
    isBirthFamily: u === birth,
    childIds: u.children.map((c) => c.id),
  }));
}

export function hasMultipleParentFamilies(graph: GraphSnapshot, personId: string): boolean {
  return graph.parentUnionsOf(personId).length > 1;
}

/** Of `personIds`, those who are a child in more than one family (the route's multiFamilyChildXrefs). */
export function multiFamilyChildIds(graph: GraphSnapshot, personIds: Iterable<string>): string[] {
  return [...personIds].filter((id) => hasMultipleParentFamilies(graph, id));
}

// ─── siblings and partner families ─────────────────────────────────────────

/** Siblings per parent family, FAMC order, each in CHIL order, without the person. */
export function siblingsOf(graph: GraphSnapshot, personId: string): Array<{ familyId: string; siblingIds: string[] }> {
  return graph.parentUnionsOf(personId).map((u) => ({
    familyId: u.id,
    siblingIds: u.children.map((c) => c.id).filter((id) => id !== personId),
  }));
}

/** The person's families as a partner, in file order, with the other partner and the children. */
export function familiesAsPartnerOf(
  graph: GraphSnapshot,
  personId: string
): Array<{ familyId: string; partnerId: string | null; childIds: string[] }> {
  return graph.spousesOf(personId).map(({ spouseId, union }) => ({
    familyId: union.id,
    partnerId: knownOrNull(graph, spouseId),
    childIds: union.children.map((c) => c.id),
  }));
}

// ─── sibling view ───────────────────────────────────────────────────────────

export interface ComputedSiblingView {
  /** Chart root: the birth father, else the birth mother, else the person. */
  rootId: string;
  /** The root's partner in the birth family, to reveal (null when the root is the person). */
  partnerId: string | null;
  siblingView: SiblingView;
}

/**
 * "Show parents & siblings", from the whole file. Same meta as the Gonsalves sibling-view
 * route, with two differences: with an unknown father it roots at the mother (the route
 * roots at the person), and partners' other families come from unions, so one-parent
 * families count too (the route's spouse table needs both partners).
 */
export function computeSiblingView(graph: GraphSnapshot, personId: string): ComputedSiblingView | null {
  const birth = birthFamilyOf(graph, personId);
  if (!birth) return null;
  const father = knownOrNull(graph, birth.husb);
  const mother = knownOrNull(graph, birth.wife);
  const sameCouple = (a: SnapshotUnion, b: SnapshotUnion) => a.husb === b.husb && a.wife === b.wife;
  // A second FAM record for the same couple is drawn as its own union row (B04), not as a
  // partner's "other children".
  const hasOtherFamily = (id: string | null, except: SnapshotUnion) =>
    id != null && graph.unionsOf(id).some((u) => !sameCouple(u, except));

  const spouseCatchAlls = [father, mother].filter((id): id is string => hasOtherFamily(id, birth));
  // Other parent families, without duplicates of the birth couple (two FAM records).
  const adoptive = graph
    .parentUnionsOf(personId)
    .filter((u) => !sameCouple(u, birth));
  const adoptiveCatchAlls: string[] = [];
  for (const u of adoptive) {
    for (const id of [knownOrNull(graph, u.husb), knownOrNull(graph, u.wife)]) {
      if (id != null && !adoptiveCatchAlls.includes(id) && hasOtherFamily(id, u)) adoptiveCatchAlls.push(id);
    }
  }

  const rootId = father ?? mother ?? personId;
  const partnerId = rootId === personId ? null : rootId === birth.husb ? birth.wife : birth.husb;
  return {
    rootId,
    partnerId,
    siblingView: {
      personId,
      spouseCatchAlls,
      adoptiveUnions: adoptive.map((u) => u.id),
      adoptiveCatchAlls,
      birthFatherPersonId: father,
      birthMotherPersonId: mother,
    },
  };
}

// ─── counts within generations ─────────────────────────────────────────────

/** Different descendants of `personId` at most `maxGenerations` below them, each once. */
export function countDescendantsWithin(graph: GraphSnapshot, personId: string, maxGenerations: number): number {
  const seen = new Set<string>([personId]);
  let frontier = [personId];
  for (let g = 0; g < maxGenerations && frontier.length > 0; g++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const c of graph.childrenOf(id)) {
        if (!seen.has(c)) {
          seen.add(c);
          next.push(c);
        }
      }
    }
    frontier = next;
  }
  return seen.size - 1;
}
