/**
 * Tree data facade: re-exports from currentBuilder (builder-backed getters)
 * and test-only exports. Consumers import from here.
 */

export {
  getPeople,
  getUnions,
  getUnionsByPerson,
  getAllChildrenOf,
  getParentUnionsByChild,
  getUnionById,
  getBirthUnionByChild,
  getSpousesOf,
  setCurrentBuilder as setCurrentTreeData,
  clearCurrentBuilder as clearCurrentTreeData,
} from "../builder";

export {
  buildTestTree,
  unknownPerson,
  PEOPLE_WITH_PARENTS,
  PEOPLE_WITH_SPOUSES,
} from "./testTreeData";

export type { UnionRecord, UnionChild, LinkedUnionEntry, SiblingView, ViewState } from "../types";
export {
  UNIONS,
  ALL_CHILDREN_OF,
  UNIONS_OF,
  UNIONS_BY_PERSON,
  UNION_BY_ID,
  PARENT_UNIONS_BY_CHILD,
  BIRTH_UNION_BY_CHILD,
} from "./testUnions";

export { DEFAULT_MAX_DEPTH } from "../constants";
