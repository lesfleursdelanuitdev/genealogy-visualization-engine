/**
 * Catch-all: one card (or shadow), no right card; children are unrevealed unions' offspring.
 */

import type { PersonNode } from "./PersonNode";
import type { ChartNode } from "./types";
import { UnionNode } from "./UnionNode";

export class CatchAllNode extends UnionNode {
  /** Sibling view: colored connector (hex). */
  connectorColor?: string;
  /** Sibling view: catch-all for Y/W/V other children (same shape as normal catch-all). */
  isSiblingCatchAll = false;

  constructor(
    left: PersonNode,
    right: null,
    children: ChartNode[] = []
  ) {
    super(left, right, children);
  }
}
