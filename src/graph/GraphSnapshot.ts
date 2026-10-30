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
  /**
   * Optional: each person's parent families (FAMC) in the order their own record lists them.
   * Sets the order of parentUnionsOf() and so the birth-family rule (T20). Families missing
   * from a list follow it in union order. Without it, union order is used.
   */
  readonly famcOrder?: ReadonlyMap<string, readonly string[]>;
}

export type PartnerRole = "husb" | "wife";

/** The per-family placeholder id for an unknown partner (spec Part 1 step 5, H4). */
export function unknownPartnerId(familyId: string, role: PartnerRole): string {
  return `${familyId}:unknown-${role}`;
}

export function isUnknownPartnerId(id: string): boolean {
  return /:unknown-(husb|wife)$/.test(id);
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
  /**
   * The child's birth family (T20, one rule everywhere): the first parent family, in FAMC
   * order, where the child's pedi is "birth"; otherwise the first parent family.
   */
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

function unknownPerson(id: string, role?: PartnerRole): DescendancyPerson {
  return {
    id,
    firstName: "Unknown",
    lastName: "",
    birthYear: null,
    deathYear: null,
    photoUrl: null,
    gender: role === "husb" ? "Male" : role === "wife" ? "Female" : null,
    isLiving: false,
    _unknownPlaceholder: true,
  };
}

/** The union with an id and both partners set: an empty partner becomes this family's placeholder. */
function normalizeUnion(u: UnionRecord): SnapshotUnion {
  const id = unionIdOf(u);
  const husb = u.husb.trim() ? u.husb : unknownPartnerId(id, "husb");
  const wife = u.wife.trim() ? u.wife : unknownPartnerId(id, "wife");
  if (hasId(u) && husb === u.husb && wife === u.wife) return u;
  return { ...u, id, husb, wife };
}

function orderByFamc(
  unions: SnapshotUnion[],
  order: readonly string[] | undefined
): SnapshotUnion[] {
  if (!order || order.length === 0 || unions.length < 2) return unions;
  const rank = new Map(order.map((famId, i) => [famId, i]));
  return unions
    .map((u, i) => ({ u, key: rank.get(u.id) ?? order.length + i }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.u);
}

function pushTo<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (!list) map.set(key, [value]);
  else if (!list.includes(value)) list.push(value);
}

export function createGraphSnapshot(input: GraphInput): GraphSnapshot {
  const people = new Map<string, DescendancyPerson>();
  for (const p of input.people) {
    // A missing isLiving counts as living (spec Part 1, step 5): never show more than we know.
    let person = p.isLiving === undefined ? { ...p, isLiving: true } : p;
    // A placeholder the converter sent itself: make sure it is flagged.
    if (isUnknownPartnerId(p.id) && !person._unknownPlaceholder) person = { ...person, _unknownPlaceholder: true };
    people.set(p.id, person);
  }

  const unions: SnapshotUnion[] = input.unions.map(normalizeUnion);

  const unionById = new Map<string, SnapshotUnion>();
  const unionsByPerson = new Map<string, SnapshotUnion[]>();
  const parentUnionsByChild = new Map<string, SnapshotUnion[]>();
  const birthUnionByChild = new Map<string, SnapshotUnion>();

  for (const u of unions) {
    for (const [partner, role] of [
      [u.husb, "husb"],
      [u.wife, "wife"],
    ] as const) {
      if (!people.has(partner)) people.set(partner, unknownPerson(partner, isUnknownPartnerId(partner) ? role : undefined));
      pushTo(unionsByPerson, partner, u);
    }
    unionById.set(u.id, u);
    for (const c of u.children) pushTo(parentUnionsByChild, c.id, u);
  }
  if (input.famcOrder) {
    for (const [childId, list] of parentUnionsByChild) {
      parentUnionsByChild.set(childId, orderByFamc(list, input.famcOrder.get(childId)));
    }
  }
  for (const [childId, list] of parentUnionsByChild) {
    const isBirth = (u: SnapshotUnion) => u.children.some((c) => c.id === childId && c.pedi === "birth");
    birthUnionByChild.set(childId, list.find(isBirth) ?? list[0]);
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
