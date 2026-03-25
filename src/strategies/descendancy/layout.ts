/**
 * Descendancy layout: two-pass, top-down.
 * Compute widths (post-order), assign positions (pre-order).
 * Specific to the descendancy tree shape (person → unions → children).
 */

import { GAP, PERSON_HEIGHT, VERTICAL_GAP, CONNECTOR_WIDTH, PERSON_WIDTH } from "./constants";
import type { ChartNode } from "../../nodes";
import { PersonNode, UnionNode, NormalUnionNode } from "../../nodes";
import type { LayoutBoundsOptions } from "../ViewStrategyDescriptor";

function computeWidths(node: ChartNode): void {
  for (const child of node.children) computeWidths(child);
  node._computedWidth = node.computedWidth(GAP);
}

/** PersonNode whose children are all UnionNodes (unions rendered at same depth). */
export function isContainer(node: ChartNode): boolean {
  return (
    node instanceof PersonNode &&
    node.children.length > 0 &&
    node.children.every((c) => c instanceof UnionNode)
  );
}

function assignPositions(
  node: ChartNode,
  x: number,
  depth: number,
  personHeight: number
): void {
  node.x = x;
  node.y = depth * (personHeight + VERTICAL_GAP);
  // Set positions on union left/right so Go To Person and bounds see correct coords
  if (node instanceof UnionNode) {
    const leftCX = x - CONNECTOR_WIDTH / 2 - PERSON_WIDTH / 2;
    const rightCX = x + CONNECTOR_WIDTH / 2 + PERSON_WIDTH / 2;
    node.left.x = leftCX;
    node.left.y = node.y;
    if (node.right) {
      node.right.x = rightCX;
      node.right.y = node.y;
    }
  }
  if (node.children.length === 0) return;
  const childrenTotal = node.children.reduce(
    (sum, c) => sum + c._computedWidth,
    0
  );
  const childrenSpan = childrenTotal + (node.children.length - 1) * GAP;
  let leftEdge = x - childrenSpan / 2;
  const childDepth = isContainer(node) ? depth : depth + 1;
  for (const child of node.children) {
    assignPositions(child, leftEdge + child._computedWidth / 2, childDepth, personHeight);
    leftEdge += child._computedWidth + GAP;
  }
}

export function layout(root: ChartNode, options?: LayoutBoundsOptions): void {
  const personHeight = options?.personHeight ?? PERSON_HEIGHT;
  computeWidths(root);
  assignPositions(root, 0, 0, personHeight);
}

/**
 * Mark primary/secondary unions per principal.
 * The first (leftmost) NormalUnionNode for each principal is primary; rest are secondary.
 */
export function markUnions(node: ChartNode, seen = new Set<string>()): void {
  if (node instanceof NormalUnionNode) {
    const id = node.principalId;
    node._isPrimary = !seen.has(id);
    seen.add(id);
  }
  for (const child of node.children) markUnions(child, seen);
}
