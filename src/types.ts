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
  /** Full birth place display (e.g. city, region, country), as from tree API — never truncated. */
  birthPlace?: string | null;
  /** Full death / burial place display, as from tree API — never truncated. */
  deathPlace?: string | null;
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
  /** Pedigree: muted placeholder card for a missing father/mother/parent slot. */
  _unknownPlaceholder?: boolean;
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
  /**
   * Child context that created this `__xy__*` row (e.g. legacy `PARENTS` / linked-unions). When set, that pair is drawn only under
   * the scoped union fan-out (not under every revealed-spouse row on the chart).
   */
  xyAnchorPersonId?: string;
}

/** Sibling view state: root shows (X,Y) + catch-alls + (W,V) adoptive unions with colored connectors. */
export interface SiblingView {
  personId: string;
  spouseCatchAlls: string[];
  adoptiveUnions: string[];
  adoptiveCatchAlls: string[];
  /** Resolved birth father xref (same id space as `people` / chart). When set with `birthMotherPersonId`, legend uses these for the biological-parent line. */
  birthFatherPersonId?: string | null;
  /** Resolved birth mother xref. */
  birthMotherPersonId?: string | null;
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
  /**
   * Pedigree / vertical pedigree: GEDCOM family xref (`@F…@`) the root is a child of — limits the first generation
   * of ancestors to that family when the person appears in multiple families as a child.
   */
  pedigreeFamcFamilyXref?: string | null;
  /**
   * Pedigree / vertical pedigree: per-person chosen child-family (FAMC) for ancestor climbing — keyed by person xref,
   * values are family xrefs. Used when switching parent family for **non-root** people without re-rooting the chart.
   */
  pedigreeFamcOverrides?: Record<string, string>;
  /**
   * Pedigree / vertical pedigree: when set, the chart omits ancestors above this person (they render as a leaf).
   */
  pedigreeAncestorCollapsePersonId?: string | null;
}
