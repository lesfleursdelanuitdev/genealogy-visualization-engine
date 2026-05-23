/**
 * Opt-in chart view switch instrumentation.
 *
 * Set `NEXT_PUBLIC_DEBUG_CHART_SWITCH=true` in the Next app env, then open DevTools
 * Performance / Console to read `console.time` / `console.timeEnd` output.
 */

const enabled =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEBUG_CHART_SWITCH === "true";

type ActiveSession = {
  id: number;
  /** Avoid double timeEnd for handler→firstPaint */
  firstPaintEnded: boolean;
  /** Current `console.time` label for layout (unique per useTreeBuild pass). */
  pendingLayoutLabel: string | null;
};

let nextId = 0;
let layoutRunSeq = 0;
let active: ActiveSession | null = null;

function prefix(): string {
  return active ? `[ChartSwitch#${active.id}]` : "[ChartSwitch#?]";
}

export function chartSwitchTimingEnabled(): boolean {
  return enabled;
}

/**
 * Start a trace when the user (or UI) initiates a chart strategy change.
 * Ends when {@link chartSwitchMarkFirstChartPaint} runs after the new adapter has committed.
 */
export function chartSwitchSessionBegin(meta: { from: string; to: string }): void {
  if (!enabled) return;
  if (active && !active.firstPaintEnded) {
    const abandoned = `[ChartSwitch#${active.id}]`;
    console.warn(`${abandoned} abandoning incomplete trace (overlapping switch)`);
    console.timeEnd(`${abandoned} handler→firstPaint`);
  }
  nextId += 1;
  active = { id: nextId, firstPaintEnded: false, pendingLayoutLabel: null };
  const p = prefix();
  console.log(`${p} trigger fired`, meta);
  console.time(`${p} handler→firstPaint`);
}

export function chartSwitchSessionNote(phase: string, detail?: unknown): void {
  if (!enabled || !active) return;
  if (detail !== undefined) {
    console.log(`${prefix()} ${phase}`, detail);
  } else {
    console.log(`${prefix()} ${phase}`);
  }
}

export function chartSwitchTimeSync<T>(phase: string, fn: () => T): T {
  if (!enabled || !active) return fn();
  const label = `${prefix()} ${phase}`;
  console.time(label);
  try {
    return fn();
  } finally {
    console.timeEnd(label);
  }
}

export async function chartSwitchTimeAsync<T>(phase: string, fn: () => Promise<T>): Promise<T> {
  if (!enabled || !active) return fn();
  const label = `${prefix()} ${phase}`;
  console.time(label);
  try {
    return await fn();
  } finally {
    console.timeEnd(label);
  }
}

/** Main chart API (`/api/tree/descendancy` | `pedigree` | …) inside {@link useChartViewFetch}. */
export function chartSwitchChartFetchBegin(): void {
  if (!enabled || !active) return;
  console.time(`${prefix()} chart API fetch`);
}

export function chartSwitchChartFetchEnd(): void {
  if (!enabled || !active) return;
  console.timeEnd(`${prefix()} chart API fetch`);
}

/** JSON → people/unions map + `FamilyTreeBuilder` + adapter construction (sync portion of fetch `.then`). */
export function chartSwitchAdapterFromPayloadBegin(): void {
  if (!enabled || !active) return;
  console.time(`${prefix()} adapter from API payload`);
}

export function chartSwitchAdapterFromPayloadEnd(): void {
  if (!enabled || !active) return;
  console.timeEnd(`${prefix()} adapter from API payload`);
}

/** `strategy.layout` + `getBounds` inside {@link useTreeBuild}. */
export function chartSwitchLayoutBegin(): void {
  if (!enabled || !active) return;
  layoutRunSeq += 1;
  const label = `${prefix()} layout#${layoutRunSeq} (strategy.layout + bounds)`;
  active.pendingLayoutLabel = label;
  console.time(label);
}

export function chartSwitchLayoutEnd(): void {
  if (!enabled || !active?.pendingLayoutLabel) return;
  console.timeEnd(active.pendingLayoutLabel);
  active.pendingLayoutLabel = null;
}

/**
 * Call from `useLayoutEffect` when `chartAdapter` is set, fetch finished, and the chart branch is about to paint.
 */
export function chartSwitchMarkFirstChartPaint(meta?: { chartStrategy: string; chartDataKey: number }): void {
  if (!enabled || !active || active.firstPaintEnded) return;
  active.firstPaintEnded = true;
  const p = prefix();
  if (meta) {
    console.log(`${p} first render of new chart (layout effect)`, meta);
  } else {
    console.log(`${p} first render of new chart (layout effect)`);
  }
  console.timeEnd(`${p} handler→firstPaint`);
  active = null;
}
