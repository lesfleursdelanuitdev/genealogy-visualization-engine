/**
 * FamilyTreeNodeFactory
 *
 * Factory for creating all descendancy chart node types. Each create method returns
 * a **descriptor object** that wraps:
 * - **node**: the actual ChartNode instance (PersonNode or a union variant) used by
 *   layout and rendering.
 * - **layout**: width, height, x, y, subtreeWidth — can be filled by a layout pass or
 *   builder.
 * - **render**: hints for rendering (e.g. isPrimary, compact).
 * - **relations**: graph edges (unions, childOf for person; spouses, children for union)
 *   for builders or lookup tables.
 * - **children**: list of child nodes (often filled when building the tree).
 * - **meta**: extra key-value data.
 *
 * Union variant is chosen via createUnionNode(..., type). A type→factory map in
 * unionNodeMap.ts is used to instantiate the correct union class (no switch).
 *
 * Config (person/union dimensions) lives in factoryConfig.ts; pass overrides to the
 * constructor.
 */

import { PersonNode } from "./PersonNode";
import type { ChartNode } from "./types";
import type { DescendancyPerson } from "../types";
import {
  type FamilyTreeNodeFactoryConfig,
  DEFAULT_PERSON_WIDTH,
  DEFAULT_PERSON_HEIGHT,
  DEFAULT_UNION_WIDTH,
  DEFAULT_UNION_HEIGHT,
} from "./factoryConfig";
import {
  type NodeLayout,
  type UnionNodeCreateData,
  type UnionNodeOptions,
  type UnionNodeType,
  type UnionDescriptor,
  UNION_NODE_MAP,
} from "./unionNodeMap";

export type { FamilyTreeNodeFactoryConfig } from "./factoryConfig";
export type { NodeLayout, UnionNodeCreateData, UnionNodeOptions, UnionNodeType, UnionDescriptor } from "./unionNodeMap";

// ─── Person descriptor ─────────────────────────────────────────────────────

/**
 * Options passed when creating a person node. Override default dimensions and
 * set render hints (e.g. primary union, secondary spouse).
 */
export interface PersonNodeOptions {
  /** Override factory default person width. */
  width?: number;
  /** Override factory default person height. */
  height?: number;
  /** True when this person is the principal in the first (leftmost) union row. */
  isPrimary?: boolean;
  /** True when this card is a secondary spouse (e.g. another marriage). */
  isSecondarySpouse?: boolean;
}

/**
 * Descriptor returned by createPersonNode. Wraps a PersonNode with layout,
 * render hints, relations, and meta so builders and layout can use one object.
 *
 * **Children ownership:** When the builder is the source of truth, descriptor.children
 * is the canonical traversal list. node.children is for the chart/layout pipeline and
 * may be derived from descriptor.children when building the render tree.
 */
export interface PersonDescriptor {
  /** Person xref (id) for indexing in builder maps. */
  xref: string;
  kind: "person";
  /** Chart/layout primitive. Traversal uses the descriptor, not the node. */
  node: PersonNode;
  /** Dimensions and position; x, y, subtreeWidth typically set by layout. */
  layout: NodeLayout;
  /** Hints for how to render the card (primary vs secondary, etc.). */
  render: {
    isPrimary: boolean;
    isSecondarySpouse: boolean;
  };
  /** Canonical graph relations: populated by the builder to match unionsPerPerson. */
  relations: {
    unions: ChartNode[];
    childOf: ChartNode[];
  };
  /** Canonical child list for traversal. node.children is for layout/render. */
  children: ChartNode[];
  /** Extra key-value data. */
  meta: Record<string, unknown>;
}

// ─── Factory ───────────────────────────────────────────────────────────────

/**
 * Creates person and union node descriptors with a consistent config. Use
 * createPersonNode for a single person card; use createUnionNode with a type
 * for normal, catch-all, linked-parent, or sibling-adoptive unions.
 */
export class FamilyTreeNodeFactory {
  /** Resolved dimensions (config overrides or defaults from factoryConfig). */
  private readonly config: {
    personWidth: number;
    personHeight: number;
    unionWidth: number;
    unionHeight: number;
  };

  /**
   * @param config - Optional overrides for person/union width and height.
   *                 Defaults come from factoryConfig (which uses chart constants).
   */
  constructor(config: FamilyTreeNodeFactoryConfig = {}) {
    this.config = {
      personWidth: config.personWidth ?? DEFAULT_PERSON_WIDTH,
      personHeight: config.personHeight ?? DEFAULT_PERSON_HEIGHT,
      unionWidth: config.unionWidth ?? DEFAULT_UNION_WIDTH,
      unionHeight: config.unionHeight ?? DEFAULT_UNION_HEIGHT,
    };
  }

  /**
   * Builds a NodeLayout with the given width/height and zeroed position and
   * subtree width. Callers or a layout pass can fill x, y, subtreeWidth later.
   */
  private defaultLayout(width: number, height: number): NodeLayout {
    return {
      width,
      height,
      x: 0,
      y: 0,
      subtreeWidth: 0,
    };
  }

  /**
   * Creates a person node and returns its descriptor.
   *
   * @param person - Chart person data (id, names, dates, etc.).
   * @param options - Optional width/height overrides and render hints (isPrimary, isSecondarySpouse).
   * @param children - ChartNode children to attach to the PersonNode (e.g. union nodes).
   * @returns PersonDescriptor with node, layout, render, relations, children, meta.
   */
  createPersonNode(
    person: DescendancyPerson,
    options: PersonNodeOptions = {},
    children: ChartNode[] = []
  ): PersonDescriptor {
    const node = new PersonNode(person, children);
    const width = options.width ?? this.config.personWidth;
    const height = options.height ?? this.config.personHeight;
    return {
      xref: person.id,
      kind: "person" as const,
      node,
      layout: this.defaultLayout(width, height),
      render: {
        isPrimary: !!options.isPrimary,
        isSecondarySpouse: !!options.isSecondarySpouse,
      },
      relations: {
        unions: [],
        childOf: [],
      },
      children: [],
      meta: {},
    };
  }

  /**
   * Creates a union node by type and returns its descriptor. The correct union
   * class (NormalUnionNode, CatchAllNode, LinkedParentNode, SiblingAdoptiveUnionNode)
   * is chosen via UNION_NODE_MAP in unionNodeMap.ts — no switch, just map lookup.
   *
   * @param data - Left/right person nodes and type-specific fields (children,
   *               principalId, linkedUnionId, siblingPersonId, connectorColor).
   * @param options - Optional width/height overrides and render hints (e.g. compact).
   * @param type - Union variant: "normal" | "catchAll" | "linkedParent" | "siblingAdoptive".
   * @returns UnionDescriptor with node, layout, render, relations, children, meta.
   * @throws If type is unknown or required fields for that type are missing (e.g. linkedUnionId for linkedParent).
   */
  createUnionNode(
    data: UnionNodeCreateData,
    options: UnionNodeOptions = {},
    type: UnionNodeType = "normal"
  ): UnionDescriptor {
    const createUnion = UNION_NODE_MAP[type];
    if (!createUnion) {
      throw new Error(`Unknown union node type: ${type}`);
    }
    const node = createUnion(data);

    const width = options.width ?? this.config.unionWidth;
    const height = options.height ?? this.config.unionHeight;
    const xref =
      options.sourceId ??
      `${data.left.content.id}-${data.right?.content?.id ?? "?"}`;
    return {
      xref,
      kind: "union" as const,
      node,
      layout: this.defaultLayout(width, height),
      render: {
        compact: !!options.compact,
      },
      relations: {
        spouses: [],
        children: [],
      },
      children: [],
      meta: {},
    };
  }
}
