/**
 * Generic tree build engine: (rootId, strategy, options) → ChartNode tree.
 *
 * Traversal is top-down (root → children). The strategy decides, per person,
 * whether to attach union nodes (e.g. spouse rows) or default children.
 * Data source is the current builder (getPeople, getUnionsByPerson, getAllChildrenOf).
 *
 * Descendancy-specific pieces (countDescendants, buildView) live in strategies/descendancy.
 */

import type { ChartNode } from "../nodes";
import type { ViewStrategy } from "../strategies/ViewStrategy";
import { PersonNode } from "../nodes";
import { getPeople, getUnionsByPerson, getAllChildrenOf } from "../testdata";
import type { UnionRecord } from "../types";

export interface BuildTreeOptions {
  maxDepth: number;
  /** Optional: at max depth, set PersonNode._hiddenCount (e.g. for +N badge). Descendancy provides countDescendants. */
  getHiddenCount?: (personId: string) => number;
}

export interface BuildTreeResult {
  root: ChartNode;
  /** Maximum generation index rendered (0 = root only, 1 = kids, 2 = grandkids, 3 = great-grandkids). */
  maxDepthRendered: number;
}

/**
 * Build a chart tree from root id and a view strategy.
 * Strategy controls which union nodes to create; otherwise person's children come from defaultChildrenOf.
 */
export function buildTree(
  rootId: string,
  strategy: ViewStrategy,
  options: BuildTreeOptions
): BuildTreeResult {
  const people = getPeople();
  const visited = new Set<string>();
  const { maxDepth, getHiddenCount } = options;
  const maxDepthRendered = { current: 0 };

  const allUnionsFor = (personId: string): UnionRecord[] =>
    getUnionsByPerson().get(personId) ?? [];

  const defaultChildrenOf = (personId: string): string[] =>
    getAllChildrenOf(personId);

  const ctx = {
    rootId,
    maxDepth,
    people,
    visited,
    allUnionsFor,
    defaultChildrenOf,
    maxDepthRendered,
    buildNode(personId: string, depth: number, onlyRoot = false): PersonNode | null {
      if (depth > maxDepthRendered.current) maxDepthRendered.current = depth;
      if (visited.has(personId)) {
        const person = people.get(personId);
        if (!person) return null;
        return new PersonNode({ ...person, _isShadow: true, _onlyRoot: false });
      }
      visited.add(personId);
      const basePerson = people.get(personId);
      if (!basePerson) return null;
      const person = { ...basePerson, _onlyRoot: onlyRoot };

      if (strategy.isSubtreeCollapsed?.(personId)) {
        return new PersonNode(person, []);
      }

      if (depth >= maxDepth) {
        const hiddenCount = getHiddenCount?.(personId);
        return new PersonNode({ ...person, ...(hiddenCount != null && { _hiddenCount: hiddenCount }) });
      }

      const unionNodes = strategy.buildUnionNodes(personId, depth, ctx);
      if (unionNodes.length === 0) {
        const childIds = defaultChildrenOf(personId);
        const children = childIds
          .map((id) => this.buildNode(id, depth + 1))
          .filter((n): n is PersonNode => n != null);
        return new PersonNode(person, children);
      }

      return new PersonNode(person, unionNodes);
    },
  };

  const root = ctx.buildNode(rootId, 0);
  if (!root) {
    const fallback = people.get(rootId);
    if (fallback) {
      return { root: new PersonNode(fallback), maxDepthRendered: maxDepthRendered.current };
    }
    return {
      root: new PersonNode({
        id: rootId,
        firstName: "?",
        lastName: "",
        birthYear: null,
        deathYear: null,
        photoUrl: null,
      }),
      maxDepthRendered: 0,
    };
  }
  return { root, maxDepthRendered: maxDepthRendered.current };
}
