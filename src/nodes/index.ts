/**
 * Descendancy chart nodes: one file per node type.
 * Re-exports all node classes and types for a single entry point.
 */

export type { ChartNode, IUnionNode, NodeType } from "./types";
export { Node } from "./Node";
export { PersonNode } from "./PersonNode";
export { UnionNode } from "./UnionNode";
export { NormalUnionNode } from "./NormalUnionNode";
export { CatchAllNode } from "./CatchAllNode";
export { LinkedParentNode } from "./LinkedParentNode";
export { SiblingAdoptiveUnionNode } from "./SiblingAdoptiveUnionNode";
export { FamilyTreeNodeFactory } from "./FamilyTreeNodeFactory";
export type {
  FamilyTreeNodeFactoryConfig,
  NodeLayout,
  PersonNodeOptions,
  PersonDescriptor,
  UnionNodeType,
  UnionNodeOptions,
  UnionNodeCreateData,
  UnionDescriptor,
} from "./FamilyTreeNodeFactory";
