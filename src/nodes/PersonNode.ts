/**
 * Person node: one person card; children are ChartNodes (e.g. union nodes).
 */

import { PERSON_WIDTH } from "../strategies/descendancy/constants";
import type { DescendancyPerson } from "../types";
import { Node } from "./Node";
import type { ChartNode } from "./types";

export class PersonNode extends Node<DescendancyPerson> {
  constructor(person: DescendancyPerson, children: ChartNode[] = []) {
    super("person", person, children);
  }

  computedWidth(_gap: number): number {
    if (this.children.length === 0) return PERSON_WIDTH;
    const total = this.children.reduce(
      (sum, c) => sum + c._computedWidth,
      0
    );
    return Math.max(
      PERSON_WIDTH,
      total + (this.children.length - 1) * _gap
    );
  }
}
