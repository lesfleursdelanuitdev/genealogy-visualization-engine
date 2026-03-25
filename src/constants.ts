/**
 * App-level constants for the descendancy chart.
 * Layout/dimension constants live in strategies (e.g. strategies/descendancy/constants.ts).
 */

/** Maximum number of history entries (back/forward). */
export const MAX_HISTORY = 21;

/** Default max tree depth when not passed to buildView / buildTree. */
export const DEFAULT_MAX_DEPTH = 6;

/**
 * Default tree root xref. The fallback @I0082@ may resolve to Alfred Gonsalves in your DB.
 * For Agustino Gracis as default root, set NEXT_PUBLIC_DEFAULT_TREE_ROOT in .env.local to his xref,
 * e.g. from: GET /api/tree/individuals?givenName=Augustino&lastName=Gracis (then use the first result's xref).
 */
export const DEFAULT_ROOT_XREF =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_DEFAULT_TREE_ROOT) || "@I0082@";
