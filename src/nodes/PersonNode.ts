/**
 * Person node: one person card; children are ChartNodes (e.g. union nodes).
 */

import { PERSON_WIDTH } from "../strategies/descendancy/constants";
import type { DescendancyPerson } from "../types";
import { Node } from "./Node";
import type { ChartNode } from "./types";

/** Ancestor charts: a person's parent families and the one shown (the card's "2 families" switch). */
export interface PersonParentFamilies {
  families: Array<{ familyId: string; kind: string }>;
  shownFamilyId: string | null;
}

export class PersonNode extends Node<DescendancyPerson> {
  /** Generation index stamped by pedigree layout (0 = root, 1 = parents, …). -1 when not in a pedigree layout. */
  pedigreeGen = -1;
  /** Ancestor charts, only when the person has more than one parent family (T47): what the switch needs. */
  parentFamilies?: PersonParentFamilies;

  constructor(person: DescendancyPerson, children: ChartNode[] = []) {
    super("person", person, children);
  }

  computedWidth(gap: number, personWidth: number = PERSON_WIDTH): number {
    if (this.children.length === 0) return personWidth;
    const total = this.children.reduce((sum, c) => sum + c._computedWidth, 0);
    return Math.max(personWidth, total + (this.children.length - 1) * gap);
  }
}
