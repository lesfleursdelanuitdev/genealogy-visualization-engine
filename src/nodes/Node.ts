/**
 * Abstract base node for the descendancy chart.
 */

import type { ChartNode, NodeType } from "./types";

export abstract class Node<T> {
  readonly type: NodeType;
  content: T;
  children: ChartNode[];
  x = 0;
  y = 0;
  _computedWidth = 0;

  constructor(type: NodeType, content: T, children: ChartNode[] = []) {
    this.type = type;
    this.content = content;
    this.children = children;
  }

  /** Width this node needs: its own card, or its children's widths plus gaps. */
  abstract computedWidth(gap: number, personWidth?: number): number;
}
