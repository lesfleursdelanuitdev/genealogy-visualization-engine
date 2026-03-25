/**
 * Bounding box for the descendancy tree. Uses strategy-specific geometry.
 */

import {
  PERSON_HEIGHT,
  PERSON_WIDTH,
  CONNECTOR_WIDTH,
  DIAMOND_SIZE,
} from "./constants";
import type { LayoutBoundsOptions } from "../ViewStrategyDescriptor";
import type { ChartNode } from "../../nodes";
import {
  UnionNode,
  NormalUnionNode,
  CatchAllNode,
  LinkedParentNode,
  SiblingAdoptiveUnionNode,
} from "../../nodes";

export function collectAll(node: ChartNode, acc: ChartNode[] = []): ChartNode[] {
  acc.push(node);
  for (const c of node.children) collectAll(c, acc);
  return acc;
}

export function visualHalfWidth(node: ChartNode): number {
  if (node.type === "person") return PERSON_WIDTH / 2;
  if (node instanceof CatchAllNode) {
    return Math.max(DIAMOND_SIZE, CONNECTOR_WIDTH / 2 + PERSON_WIDTH);
  }
  if (
    node instanceof LinkedParentNode ||
    node instanceof SiblingAdoptiveUnionNode ||
    (node instanceof NormalUnionNode && node._isPrimary)
  ) {
    return (PERSON_WIDTH + CONNECTOR_WIDTH + PERSON_WIDTH) / 2;
  }
  if (node instanceof NormalUnionNode) {
    return Math.max(DIAMOND_SIZE, CONNECTOR_WIDTH / 2 + PERSON_WIDTH);
  }
  return Math.max(DIAMOND_SIZE, CONNECTOR_WIDTH / 2 + PERSON_WIDTH);
}

export interface Bounds {
  minX: number;
  maxX: number;
  maxY: number;
}

export function getBounds(root: ChartNode, options?: LayoutBoundsOptions): Bounds {
  const personHeight = options?.personHeight ?? PERSON_HEIGHT;
  let minX = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of collectAll(root)) {
    const half = visualHalfWidth(n);
    minX = Math.min(minX, n.x - half);
    maxX = Math.max(maxX, n.x + half);
    const halfY = n.type === "person" ? personHeight / 2 : DIAMOND_SIZE;
    maxY = Math.max(maxY, n.y + halfY);
  }
  return { minX, maxX, maxY };
}
