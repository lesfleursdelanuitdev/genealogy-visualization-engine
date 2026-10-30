/**
 * Abstract base for all union variants (normal, catch-all, linked parent, sibling adoptive).
 */

import { PERSON_WIDTH, CONNECTOR_WIDTH } from "../strategies/descendancy/constants";
import { Node } from "./Node";
import type { PersonNode } from "./PersonNode";
import type { ChartNode, IUnionNode } from "./types";


/** Abstract base for all union variants. Implements IUnionNode. */
export abstract class UnionNode
  extends Node<[PersonNode, PersonNode | null]>
  implements IUnionNode
{
  constructor(
    left: PersonNode,
    right: PersonNode | null,
    children: ChartNode[] = []
  ) {
    super("union", [left, right], children);
  }

  get left(): PersonNode {
    return this.content[0];
  }

  get right(): PersonNode | null {
    return this.content[1];
  }

  computedWidth(gap: number, personWidth: number = PERSON_WIDTH): number {
    const cardWidth = personWidth + CONNECTOR_WIDTH + personWidth;
    if (this.children.length === 0) return cardWidth;
    const total = this.children.reduce((sum, c) => sum + c._computedWidth, 0);
    return Math.max(cardWidth, total + (this.children.length - 1) * gap);
  }
}
