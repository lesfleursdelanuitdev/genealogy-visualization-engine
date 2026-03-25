/**
 * Sibling adoptive: (W,V) union with dashed connector to sibling P; has structural children.
 */

import type { PersonNode } from "./PersonNode";
import type { ChartNode } from "./types";
import { UnionNode } from "./UnionNode";

export class SiblingAdoptiveUnionNode extends UnionNode {
  siblingPersonId: string;
  linkedUnionId?: string;
  connectorColor: string;

  constructor(
    left: PersonNode,
    right: PersonNode,
    children: ChartNode[],
    siblingPersonId: string,
    connectorColor: string,
    linkedUnionId?: string
  ) {
    super(left, right, children);
    this.siblingPersonId = siblingPersonId;
    this.connectorColor = connectorColor;
    this.linkedUnionId = linkedUnionId;
  }
}
