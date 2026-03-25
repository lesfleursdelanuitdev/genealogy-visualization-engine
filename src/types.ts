/**
 * Types for the descendancy chart model.
 * Kept minimal so the chart stays decoupled from API shapes;
 * an adapter can map TreeIndividual (or other sources) to DescendancyPerson.
 */

export interface DescendancyPerson {
  id: string;
  /** GEDCOM xref (e.g. @I123@); often same as id in builder. */
  xref?: string | null;
  /** Database UUID for the individual record. */
  uuid?: string | null;
  firstName: string;
  lastName: string;
  birthYear?: number | null;
  deathYear?: number | null;
  photoUrl?: string | null;
  /** Display gender from data (e.g. "Male", "Female", "Unknown") for default icon. */
  gender?: string | null;
  /** Set on leaf nodes at MAX_DEPTH to show +N hidden descendants badge. */
  _hiddenCount?: number;
  /** True when this person is shown again as a placeholder (e.g. adopted in another union). */
  _isShadow?: boolean;
  /** True when shown as one side of a linked parent union (e.g. (X,Y) both newcomers); shows close button. */
  _isLinkedSpouse?: boolean;
  /** True when this card is root-only for layout (sibling catch-all); hide spouses/parents buttons. */
  _onlyRoot?: boolean;
}

/** Child entry in a union: id and pedigree (birth, adopted, foster, etc.). */
export interface UnionChild {
  id: string;
  pedi: string;
}

/** GEDCOM-style union: husb renders left, wife right. Both required (use unknown_* id when unknown). */
export interface UnionRecord {
  id?: string;
  husb: string;
  wife: string;
  children: UnionChild[];
}

/** Entry for a linked parent union. (S,X) uses xId + unionId; (X,Y) both-newcomers uses husbId + xId (wife) + unionId. */
export interface LinkedUnionEntry {
  xId: string;
  unionId: string;
  bothNewcomers?: boolean;
  husbId?: string;
}

/** Sibling view state: root shows (X,Y) + catch-alls + (W,V) adoptive unions with colored connectors. */
export interface SiblingView {
  personId: string;
  spouseCatchAlls: string[];
  adoptiveUnions: string[];
  adoptiveCatchAlls: string[];
}

/** Chart view state: revealed spouses, linked unions, sibling view, expand-down, pan target. */
export interface ViewState {
  revealedUnions?: Map<string, string[]>;
  linkedUnions?: Map<string, LinkedUnionEntry[]>;
  siblingView?: SiblingView | null;
  /** When set, builder uses this as effective depth (for Case 1: add one generation). */
  displayDepth?: number;
  /** Current depth (generations shown). Set by reducer (e.g. SHOW_CHILDREN Case 1); used for build and display. */
  currentDepth?: number;
  /** When set, top row of tree should show these person IDs in this order (Case 2: preserve G_2 row). */
  expandDownTopRow?: string[];
  /** When set, viewport should center on this person (used by history for "Pan to person" entries). */
  panToPersonId?: string;
  /** Person IDs whose subtrees are collapsed (descendants hidden). Stored as array for JSON-serializable state. */
  collapsedSubtrees?: string[];
}
