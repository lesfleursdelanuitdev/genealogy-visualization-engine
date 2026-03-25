/**
 * Shared types for descendancy chart nodes.
 * ChartNode and IUnionNode use type-only imports to allow one file per node class.
 */

import type { PersonNode } from "./PersonNode";
import type { UnionNode } from "./UnionNode";

export type NodeType = "person" | "union";

export type ChartNode = PersonNode | UnionNode;

/** Contract for layout, bounds, and connectors: any union-like node. */
export interface IUnionNode {
  readonly type: NodeType;
  content: [PersonNode, PersonNode | null];
  children: ChartNode[];
  x: number;
  y: number;
  _computedWidth: number;
  readonly left: PersonNode;
  readonly right: PersonNode | null;
  computedWidth(gap: number): number;
}
