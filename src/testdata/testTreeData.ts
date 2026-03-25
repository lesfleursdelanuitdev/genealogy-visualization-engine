/**
 * Static test/demo tree data only. No API state, no current-tree logic.
 * Used as fallback when no API data is set, and for buildTestTree().
 */

import type { DescendancyPerson, UnionRecord } from "../types";
import {
  UNIONS,
  ALL_CHILDREN_OF,
  UNIONS_BY_PERSON,
  UNION_BY_ID,
  PARENT_UNIONS_BY_CHILD,
  BIRTH_UNION_BY_CHILD,
} from "./testUnions";
import { buildPeople } from "./testPeople";
import { PersonNode, NormalUnionNode, type ChartNode } from "../nodes";

let peopleCache: Map<string, DescendancyPerson> | null = null;

/** Static people map (cached). Used when no API data is set. */
export function getPeople(): Map<string, DescendancyPerson> {
  if (!peopleCache) peopleCache = buildPeople();
  return peopleCache;
}

/** Static unions. */
export function getUnions(): UnionRecord[] {
  return UNIONS;
}

/** Static: unions where person is husband or wife. */
export function getUnionsByPerson(): Map<string, UnionRecord[]> {
  return UNIONS_BY_PERSON;
}

/** Static: all child ids for a person (both sides). */
export function getAllChildrenOf(personId: string): string[] {
  return ALL_CHILDREN_OF[personId] ?? [];
}

/** Static: unions in which this person appears as a child. */
export function getParentUnionsByChild(): Map<string, UnionRecord[]> {
  return PARENT_UNIONS_BY_CHILD;
}

/** Static: union by id. */
export function getUnionById(): Map<string, UnionRecord> {
  return UNION_BY_ID;
}

/** Static: birth union per child. */
export function getBirthUnionByChild(): Map<string, UnionRecord> {
  return BIRTH_UNION_BY_CHILD;
}

/** Static: all spouses of a person. */
export function getSpousesOf(personId: string): { spouseId: string; union: UnionRecord }[] {
  const list = UNIONS_BY_PERSON.get(personId) ?? [];
  return list.map((u) => ({
    spouseId: u.husb === personId ? u.wife : u.husb,
    union: u,
  }));
}

/** Person ids that appear as a child in any union (have known parents). */
export const PEOPLE_WITH_PARENTS = new Set(UNIONS.flatMap((u) => u.children.map((c) => c.id)));

/** Person ids that appear on either side of a union (can show "spouses" UI). */
export const PEOPLE_WITH_SPOUSES = new Set(UNIONS.flatMap((u) => [u.husb, u.wife]));

export function unknownPerson(id: string): PersonNode {
  const p: DescendancyPerson = {
    id,
    firstName: "Unknown",
    lastName: "",
    birthYear: null,
    deathYear: null,
    photoUrl: null,
  };
  return new PersonNode(p);
}

export function buildTestTree(): ChartNode {
  const people = buildPeople();
  const p = (id: string) => people.get(id)!;

  const oliver = new PersonNode(p("oliver"));
  const sophie = new PersonNode(p("sophie"));
  const ethan = new PersonNode(p("ethan"));
  const grace = new PersonNode(p("grace"));
  const lucas = new PersonNode(p("lucas"));
  const henry = new PersonNode(p("henry"));
  const michael = new PersonNode(p("michael"));
  const james = new PersonNode(p("james"));
  const susan = new PersonNode(p("susan"));
  const carol = new PersonNode(p("carol"));
  const mary = new PersonNode(p("mary"));

  const patricia = new PersonNode(p("patricia"), [michael]);
  const thomas = new PersonNode(p("thomas"));
  const robert = new PersonNode(p("robert"));
  const john = new PersonNode(p("john"));

  const diana = new PersonNode(p("diana"));
  const margaret = new PersonNode(p("margaret"));
  const peter = new PersonNode(p("peter"));
  const claire = new PersonNode(p("claire"));
  const sam = new PersonNode(p("sam"));
  const linda = new PersonNode(p("linda"));
  const sophie2 = new PersonNode(p("sophie2"));
  const ben = new PersonNode(p("ben"));
  const rachel = new PersonNode(p("rachel"));

  const nina = new PersonNode(p("nina"));
  const leo = new PersonNode(p("leo"));
  const mia = new PersonNode(p("mia"));
  const jamesUnion = new NormalUnionNode(james, nina, [leo, mia]);

  const priya = new PersonNode(p("priya"));
  const zara = new PersonNode(p("zara"));
  const oliverUnion = new NormalUnionNode(oliver, priya, [zara]);

  const kai = new PersonNode(p("kai"));
  const dianaUnion = new NormalUnionNode(diana, kai, []);

  const finn = new PersonNode(p("finn"));
  const isla = new PersonNode(p("isla"));
  const annaNode = new PersonNode(p("anna"), [finn, isla]);

  const jade = new PersonNode(p("jade"));
  const noah = new PersonNode(p("noah"));
  const peterUnion = new NormalUnionNode(peter, jade, [noah]);

  const thomasUnion = new NormalUnionNode(thomas, carol, [annaNode, henry]);
  const thomasUnion2 = new NormalUnionNode(thomas, rachel, [sophie2, ben]);
  const lisaPlaceholder = new PersonNode(p("lisa"), [oliver, sophie, ethan, grace, lucas]);
  const robertUnion1 = new NormalUnionNode(robert, susan, [jamesUnion, lisaPlaceholder]);
  const robertUnion2 = new NormalUnionNode(robert, margaret, [dianaUnion]);
  const alex = new PersonNode(p("alex"));
  const robertUnion3 = new NormalUnionNode(robert, linda, [peterUnion, claire, sam]);
  const robertUnion4 = new NormalUnionNode(robert, unknownPerson("u1"), [alex]);

  const lisaNode = new PersonNode(p("lisa"), [oliverUnion, sophie, ethan, grace, lucas]);
  robertUnion1.children[1] = lisaNode;

  const johnUnion = new NormalUnionNode(john, mary, [
    robertUnion1,
    robertUnion2,
    robertUnion3,
    robertUnion4,
    patricia,
    thomasUnion,
    thomasUnion2,
  ]);

  return johnUnion;
}
