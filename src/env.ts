/**
 * The only place the engine reads process.env. Each flag is guarded, so the engine also
 * loads in browsers and bundlers that define no `process` (Vite). Each read is written out
 * in full so Next.js can still inline NEXT_PUBLIC_* values.
 */

/** Opt-in debug logging of tree builds (`NEXT_PUBLIC_DEBUG_DESCENDANCY=true`). */
export const DEBUG_DESCENDANCY: boolean =
  typeof process !== "undefined" && process.env?.NEXT_PUBLIC_DEBUG_DESCENDANCY === "true";

/** Opt-in chart-switch timing (`NEXT_PUBLIC_DEBUG_CHART_SWITCH=true`), see debug/chartSwitchTiming. */
export const DEBUG_CHART_SWITCH: boolean =
  typeof process !== "undefined" && process.env?.NEXT_PUBLIC_DEBUG_CHART_SWITCH === "true";
