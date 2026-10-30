/**
 * App-level constants for the descendancy chart.
 * Layout/dimension constants live in strategies (e.g. strategies/descendancy/constants.ts).
 */

/** Maximum number of history entries (back/forward). */
export const MAX_HISTORY = 21;

/** Default max tree depth when not passed to buildView / buildTree. */
export const DEFAULT_MAX_DEPTH = 6;

/** Default ancestor generations to fetch/render in pedigree view (column count ≈ depth + 1). */
export const DEFAULT_PEDIGREE_DEPTH = 4;
