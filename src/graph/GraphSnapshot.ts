/**
 * GraphSnapshot: the engine's single input.
 *
 * Built once from `{ people, unions }` for the whole family file (or, in the Gonsalves app,
 * for one API response). Every derived index the build, the strategies and the reducer need
 * is built here, in one pass, and never rebuilt per call. A snapshot is read-only: changing
 * the data means building a new snapshot.
 */

import type { DescendancyPerson, UnionRecord } from "../types";

/** What a converter (GEDCOM file, Gonsalves API) hands to the engine. */
export interface GraphInput {
  readonly people: readonly DescendancyPerson[];
  readonly unions: readonly UnionRecord[];
}

/** A union in a snapshot always has an id: its own, or `${husb}-${wife}`. */
export type SnapshotUnion = UnionRecord & { readonly id: string };

export interface SpouseLink {
  readonly spouseId: string;
  readonly union: SnapshotUnion;
}

export interface GraphSnapshot {
  /** Everyone by id, plus an "Unknown" person for each partner id missing from the input. */
  readonly people: ReadonlyMap<string, DescendancyPerson>;
  /** All unions, in input order. */
  readonly unions: readonly SnapshotUnion[];
  readonly unionById: ReadonlyMap<string, SnapshotUnion>;
  /** Unions where the person is husb or wife, in input order. */
  readonly unionsByPerson: ReadonlyMap<string, readonly SnapshotUnion[]>;
  /** Unions where the person is a child, in input order. */
  readonly parentUnionsByChild: ReadonlyMap<string, readonly SnapshotUnion[]>;
  /** The child's family with pedi "birth" (last one wins), otherwise the first family listing the child. */
  readonly birthUnionByChild: ReadonlyMap<string, SnapshotUnion>;

  unionsOf(personId: string): readonly SnapshotUnion[];
  parentUnionsOf(personId: string): readonly SnapshotUnion[];
  /** Children of every union the person is a partner in, once each, in union then CHIL order. */
  childrenOf(personId: string): readonly string[];
  spousesOf(personId: string): readonly SpouseLink[];
}

const NONE: readonly never[] = Object.freeze([]);

export function unionIdOf(u: Pick<UnionRecord, "id" | "husb" | "wife">): string {
  return u.id ?? `${u.husb}-${u.wife}`;
}

function hasId(u: UnionRecord): u is SnapshotUnion {
  return u.id != null;
}

function unknownPerson(id: string): DescendancyPerson {
  return { id, firstName: "Unknown", lastName: "", birthYear: null, deathYear: null, photoUrl: null };
}

function pushTo<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (!list) map.set(key, [value]);
  else if (!list.includes(value)) list.push(value);
}

export function createGraphSnapshot(input: GraphInput): GraphSnapshot {
  const people = new Map<string, DescendancyPerson>();
  // A missing isLiving counts as living (spec Part 1, step 5): never show more than we know.
  for (const p of input.people) people.set(p.id, p.isLiving === undefined ? { ...p, isLiving: true } : p);

  const unions: SnapshotUnion[] = input.unions.map((u) => (hasId(u) ? u : { ...u, id: unionIdOf(u) }));

  const unionById = new Map<string, SnapshotUnion>();
  const unionsByPerson = new Map<string, SnapshotUnion[]>();
  const parentUnionsByChild = new Map<string, SnapshotUnion[]>();
  const birthUnionByChild = new Map<string, SnapshotUnion>();

  for (const u of unions) {
    for (const partner of [u.husb, u.wife]) {
      if (!people.has(partner)) people.set(partner, unknownPerson(partner));
      pushTo(unionsByPerson, partner, u);
    }
    unionById.set(u.id, u);
    for (const c of u.children) {
      pushTo(parentUnionsByChild, c.id, u);
      if (!birthUnionByChild.has(c.id)) birthUnionByChild.set(c.id, u);
    }
  }
  for (const u of unions) {
    for (const c of u.children) {
      if (c.pedi === "birth") birthUnionByChild.set(c.id, u);
    }
  }

  const unionsOf = (personId: string): readonly SnapshotUnion[] => unionsByPerson.get(personId) ?? NONE;

  return Object.freeze({
    people,
    unions,
    unionById,
    unionsByPerson,
    parentUnionsByChild,
    birthUnionByChild,
    unionsOf,
    parentUnionsOf: (personId: string) => parentUnionsByChild.get(personId) ?? NONE,
    childrenOf(personId: string): readonly string[] {
      const own = unionsOf(personId);
      if (own.length === 0) return NONE;
      const ids = new Set<string>();
      for (const u of own) for (const c of u.children) ids.add(c.id);
      return [...ids];
    },
    spousesOf: (personId: string): readonly SpouseLink[] =>
      unionsOf(personId).map((union) => ({ spouseId: union.husb === personId ? union.wife : union.husb, union })),
  });
}

/** A snapshot with no people: what the engine sees before any data has loaded. */
export const EMPTY_GRAPH: GraphSnapshot = createGraphSnapshot({ people: [], unions: [] });
