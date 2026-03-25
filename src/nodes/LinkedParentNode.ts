/**
 * Linked parent: two cards, no structural children; children drawn via dashed connectors from union record.
 */

import type { PersonNode } from "./PersonNode";
import { UnionNode } from "./UnionNode";

export class LinkedParentNode extends UnionNode {
  linkedUnionId: string;

  constructor(left: PersonNode, right: PersonNode, linkedUnionId: string) {
    super(left, right, []);
    this.linkedUnionId = linkedUnionId;
  }
}
