/**
 * Generic tree helpers. Strategy-specific bounds (getBounds, visualHalfWidth) live in
 * strategies (e.g. strategies/descendancy/bounds.ts). Chart index re-exports those for backward compatibility.
 */

import type { ChartNode } from "./nodes";

export function collectAll(
  node: ChartNode,
  acc: ChartNode[] = []
): ChartNode[] {
  acc.push(node);
  for (const c of node.children) collectAll(c, acc);
  return acc;
}

/**
 * Collects every person node in the tree, including those inside union nodes (left/right spouse cards).
 * Use this for "Go to person" lists and any traversal that must see all visible people.
 */
export function collectAllPersonNodes(
  node: ChartNode,
  acc: ChartNode[] = []
): ChartNode[] {
  if (node.type === "person") {
    acc.push(node);
    for (const c of node.children) collectAllPersonNodes(c, acc);
    return acc;
  }
  if (node.type === "union") {
    const [left, right] = (node as { content: [ChartNode, ChartNode | null] }).content;
    if (left) collectAllPersonNodes(left, acc);
    if (right) collectAllPersonNodes(right, acc);
    for (const c of node.children) collectAllPersonNodes(c, acc);
    return acc;
  }
  for (const c of node.children) collectAllPersonNodes(c, acc);
  return acc;
}

/**
 * Maximum depth of the tree from this node (0 = leaf, 1 = one row of children, etc.).
 * Used to compute current generation count for SHOW_CHILDREN.
 */
export function getMaxDepth(node: ChartNode): number {
  if (node.children.length === 0) return 0;
  return 1 + Math.max(...node.children.map((c) => getMaxDepth(c)));
}

/** Person content shape for id lookup */
function getPersonId(node: ChartNode): string | undefined {
  const c = node.content as { id?: string } | undefined;
  return c?.id;
}

/**
 * Finds the first union node that contains the given person as left or right.
 * Used to compute spouse position from the union row (principal + layout offset).
 */
export function findUnionContainingPerson(
  node: ChartNode,
  targetPersonId: string
): { union: ChartNode; isLeft: boolean } | null {
  if (node.type === "union") {
    const [left, right] = (node as { content: [ChartNode, ChartNode | null] }).content;
    if (left && getPersonId(left) === targetPersonId) return { union: node, isLeft: true };
    if (right && getPersonId(right) === targetPersonId) return { union: node, isLeft: false };
  }
  for (const c of node.children) {
    const found = findUnionContainingPerson(c, targetPersonId);
    if (found) return found;
  }
  return null;
}
