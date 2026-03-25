/**
 * Builder module: generic build engine, FamilyTreeBuilder, and current builder singleton.
 */

export { buildTree } from "./build";
export type { BuildTreeOptions, BuildTreeResult } from "./build";
export { FamilyTreeBuilder } from "./FamilyTreeBuilder";
export type { FamilyTreeBuildOptions, FamilyTreeBuilderInput } from "./FamilyTreeBuilder";
export {
  setCurrentBuilder,
  clearCurrentBuilder,
  getPeople,
  getUnions,
  getUnionsByPerson,
  getAllChildrenOf,
  getParentUnionsByChild,
  getUnionById,
  getBirthUnionByChild,
  getSpousesOf,
} from "./currentBuilder";
