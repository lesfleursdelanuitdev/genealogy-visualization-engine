/**
 * Union node types, descriptor shape, and type → factory map.
 * Used by FamilyTreeNodeFactory.createUnionNode (no switch, lookup by type).
 */

import { NormalUnionNode } from "./NormalUnionNode";
import { CatchAllNode } from "./CatchAllNode";
import { LinkedParentNode } from "./LinkedParentNode";
import { SiblingAdoptiveUnionNode } from "./SiblingAdoptiveUnionNode";
import type { PersonNode } from "./PersonNode";
import type { ChartNode } from "./types";

// ─── Layout (shared by descriptors) ───────────────────────────────────────

export interface NodeLayout {
  width: number;
  height: number;
  x: number;
  y: number;
  subtreeWidth: number;
}

// ─── Union types and descriptor ─────────────────────────────────────────────

export type UnionNodeType = "normal" | "catchAll" | "linkedParent" | "siblingAdoptive";

export interface UnionNodeOptions {
  width?: number;
  height?: number;
  compact?: boolean;
  /** Union xref/id for descriptor.xref (e.g. union record id or `${husb}-${wife}`). */
  sourceId?: string;
}

/** Data required to create a union node. Type-specific fields are optional. */
export interface UnionNodeCreateData {
  left: PersonNode;
  right: PersonNode | null;
  children?: ChartNode[];
  principalId?: string;
  linkedUnionId?: string;
  siblingPersonId?: string;
  connectorColor?: string;
}

/**
 * Union descriptor. When the builder is the source of truth, descriptor.children
 * is the canonical traversal list; node is the chart/layout primitive.
 */
export interface UnionDescriptor {
  /** Union xref (id) for indexing in builder maps. */
  xref: string;
  kind: "union";
  /** Chart/layout primitive. Traversal uses the descriptor, not the node. */
  node: ChartNode;
  layout: NodeLayout;
  render: {
    compact: boolean;
  };
  /** Canonical graph relations: populated by the builder (spouses = left/right, children = union's children). */
  relations: {
    spouses: ChartNode[];
    children: ChartNode[];
  };
  /** Canonical child list for traversal. node.children is for layout/render. */
  children: ChartNode[];
  meta: Record<string, unknown>;
}

// ─── Type → Union node factory (map, no switch) ─────────────────────────────

export type UnionNodeFactoryFn = (data: UnionNodeCreateData) => ChartNode;

export const UNION_NODE_MAP: Record<UnionNodeType, UnionNodeFactoryFn> = {
  normal: (d) => new NormalUnionNode(d.left, d.right, d.children ?? [], d.principalId),
  catchAll: (d) => new CatchAllNode(d.left, null, d.children ?? []),
  linkedParent: (d) => {
    if (!d.linkedUnionId) throw new Error("linkedUnionId required for linkedParent union");
    return new LinkedParentNode(d.left, d.right!, d.linkedUnionId);
  },
  siblingAdoptive: (d) => {
    if (!d.siblingPersonId || !d.connectorColor) {
      throw new Error("siblingPersonId and connectorColor required for siblingAdoptive union");
    }
    return new SiblingAdoptiveUnionNode(
      d.left,
      d.right!,
      d.children ?? [],
      d.siblingPersonId,
      d.connectorColor,
      d.linkedUnionId
    );
  },
};
