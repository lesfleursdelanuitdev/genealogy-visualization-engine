/**
 * Generic tree build engine: (rootId, strategy, options) → ChartNode tree.
 *
 * Traversal is top-down (root → children). The strategy decides, per person,
 * whether to attach union nodes (e.g. spouse rows) or default children.
 * The only data source is the GraphSnapshot passed in `options.graph`.
 *
 * Descendancy-specific pieces (countDescendants, buildView) live in strategies/descendancy.
 */

import type { ChartNode } from "../nodes";
import type { ViewStrategy } from "../strategies/ViewStrategy";
import { PersonNode, NormalUnionNode } from "../nodes";
import type { GraphSnapshot } from "../graph";

export interface BuildTreeOptions {
  /** People and unions to build from. Nothing else is read. */
  graph: GraphSnapshot;
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
  const { graph, maxDepth, getHiddenCount } = options;
  const people = graph.people;
  const visited = new Set<string>();
  const maxDepthRendered = { current: 0 };
  /** True while a capped person's partner rows are built: their children are left out. */
  let childrenCapped = false;
  /** Depth at which the current branch stops: maxDepth, or one row past an opened collapsed card. */
  let branchCap = maxDepth;

  const ctx = {
    graph,
    rootId,
    maxDepth,
    people,
    visited,
    allUnionsFor: (personId: string) => graph.unionsOf(personId),
    defaultChildrenOf: (personId: string) => graph.childrenOf(personId),
    maxDepthRendered,
    buildNode(personId: string, depth: number, onlyRoot = false): PersonNode | null {
      if (childrenCapped) return null;
      // Rows added past the cap by "Show children" (T18) do not move the depth control.
      if (depth > maxDepthRendered.current && depth <= maxDepth) maxDepthRendered.current = depth;
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
        // A collapsed branch shows "+N" (T30); its chip opens one generation (showChildrenOf).
        if (strategy.showsChildrenPastCap?.(personId) !== true) {
          return new PersonNode({ ...person, _hiddenCount: getHiddenCount?.(personId) }, []);
        }
        const outerCap = branchCap;
        branchCap = Math.min(branchCap, depth + 1);
        try {
          const unionNodes = strategy.buildUnionNodes(personId, depth, ctx);
          if (unionNodes.length > 0) return new PersonNode(person, unionNodes);
          const children = graph
            .childrenOf(personId)
            .map((id) => this.buildNode(id, depth + 1))
            .filter((n): n is PersonNode => n != null);
          return new PersonNode(person, children);
        } finally {
          branchCap = outerCap;
        }
      }

      if (depth >= branchCap) {
        // At the cap a person keeps their revealed partner rows, but their children are built
        // only when "Show children" asked for them (one more row, T18); otherwise +N.
        const showChildren = strategy.showsChildrenPastCap?.(personId) === true;
        const hiddenCount = showChildren ? undefined : getHiddenCount?.(personId);
        const atMaxPerson = { ...person, ...(hiddenCount != null && { _hiddenCount: hiddenCount }) };
        const wasCapped = childrenCapped;
        childrenCapped = !showChildren;
        let unionNodes;
        try {
          unionNodes = strategy.buildUnionNodes(personId, depth, ctx);
        } finally {
          childrenCapped = wasCapped;
        }
        if (unionNodes.length > 0) return new PersonNode(atMaxPerson, unionNodes);
        if (!showChildren) return new PersonNode(atMaxPerson);
        const children = graph
          .childrenOf(personId)
          .map((id) => this.buildNode(id, depth + 1))
          .filter((n): n is PersonNode => n != null);
        return new PersonNode(atMaxPerson, children);
      }

      const unionNodes = strategy.buildUnionNodes(personId, depth, ctx);
      if (unionNodes.length === 0) {
        const childIds = graph.childrenOf(personId);
        const children = childIds
          .map((id) => this.buildNode(id, depth + 1))
          .filter((n): n is PersonNode => n != null);
        return new PersonNode(person, children);
      }

      return new PersonNode(person, unionNodes);
    },
  };

  const root = ctx.buildNode(rootId, 0);
  if (root) shadowRepeatedPartners(root);
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

/**
 * T49: someone who appears more than once in a chart is a full card once and a shadow
 * everywhere else. buildTree already makes a repeated *principal* (a person built with their
 * own families) a shadow. Partner cards are fixed up here, after the build: a partner card is a
 * shadow when that person is a principal anywhere in the chart (their families hang under the
 * principal card, so that one stays full), or when they already appeared as a partner earlier
 * in build order.
 */
function shadowRepeatedPartners(root: ChartNode): void {
  const principals = new Set<string>();
  const collect = (n: ChartNode): void => {
    if (n instanceof PersonNode && n.content._isShadow !== true) principals.add(n.content.id);
    for (const c of n.children) collect(c);
  };
  collect(root);

  const partners = new Set<string>();
  const mark = (n: ChartNode): void => {
    if (n instanceof NormalUnionNode && n.right && n.right.content._isShadow !== true) {
      const id = n.right.content.id;
      if (principals.has(id) || partners.has(id)) n.right.content = { ...n.right.content, _isShadow: true };
      else partners.add(id);
    }
    for (const c of n.children) mark(c);
  };
  mark(root);
}

