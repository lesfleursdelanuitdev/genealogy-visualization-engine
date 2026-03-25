/**
 * Test data entry point. Re-exports facade so consumers can import from "./testdata".
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
  setCurrentTreeData,
  clearCurrentTreeData,
  buildTestTree,
  unknownPerson,
  PEOPLE_WITH_PARENTS,
  PEOPLE_WITH_SPOUSES,
  DEFAULT_MAX_DEPTH,
  UNIONS,
  ALL_CHILDREN_OF,
  UNIONS_OF,
  UNIONS_BY_PERSON,
  UNION_BY_ID,
  PARENT_UNIONS_BY_CHILD,
  BIRTH_UNION_BY_CHILD,
} from "./testData";

export type { UnionRecord, UnionChild, LinkedUnionEntry, SiblingView, ViewState } from "../types";
