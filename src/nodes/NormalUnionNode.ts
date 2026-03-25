/**
 * Normal union: two cards, structural children. Primary/secondary set by markUnions; used for join lines.
 */

import type { PersonNode } from "./PersonNode";
import type { ChartNode } from "./types";
import { UnionNode } from "./UnionNode";

export class NormalUnionNode extends UnionNode {
  /** Set by markUnions: true for the first (leftmost) union for this principal. */
  _isPrimary = false;
  /** Person whose repeated unions are grouped (primary/secondary, join lines). Defaults to left. */
  principalId: string;
  /** Sibling view: colored connector for first (XY) revealed union. */
  connectorColor?: string;

  constructor(
    left: PersonNode,
    right: PersonNode | null,
    children: ChartNode[] = [],
    principalId?: string
  ) {
    super(left, right, children);
    this.principalId = principalId ?? left?.content?.id ?? "";
  }
}
