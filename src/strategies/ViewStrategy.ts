/**
 * View strategy: defines how the tree is built from state.
 * The builder is a generic traversal engine; the strategy controls which
 * union nodes (revealed, linked, catch-all, sibling view) to create.
 *
 * Enables swapping strategies for different visualizations (e.g. descendancy,
 * pedigree, fan chart) without changing layout or rendering.
 */

import type { PersonNode } from "../nodes";
import type { DescendancyPerson } from "../types";
import type { UnionRecord } from "../types";
import type { UnionNode } from "../nodes";
import type { GraphSnapshot } from "../graph";

/** Context passed by the builder so the strategy can recurse and resolve data. */
export interface BuildContext {
  buildNode(personId: string, depth: number, onlyRoot?: boolean): PersonNode | null;
  /** The graph being built from; strategies read people and unions only from here. */
  graph: GraphSnapshot;
  rootId: string;
  maxDepth: number;
  people: ReadonlyMap<string, DescendancyPerson>;
  visited: Set<string>;
  allUnionsFor(personId: string): readonly UnionRecord[];
  defaultChildrenOf(personId: string): readonly string[];
}

/**
 * Strategy that decides which union nodes to create for a person at a given depth.
 * The builder calls this and attaches the result as the person's children (union row).
 */
export interface ViewStrategy {
  /** Return union nodes (normal, linked, catch-all, sibling) for this person. Empty = no union row, use default children. */
  buildUnionNodes(personId: string, depth: number, ctx: BuildContext): UnionNode[];
  /** When true, do not render this person's descendants (collapse subtree). */
  isSubtreeCollapsed?(personId: string): boolean;
}
