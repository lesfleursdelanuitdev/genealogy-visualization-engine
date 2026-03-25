/**
 * Viewport/pan-zoom utilities for the descendancy chart.
 */

export interface ViewportBounds {
  minX: number;
  maxX: number;
  maxY: number;
}

export interface ComputeFitToViewportOptions {
  padding?: number;
  scaleMin?: number;
  scaleMax?: number;
}

const DEFAULT_PADDING = 40;
const DEFAULT_SCALE_MIN = 0.25;
const DEFAULT_SCALE_MAX = 1.2;

/**
 * Compute scale and pan so that the given bounds fit inside the viewport rect,
 * centered, with optional padding and scale clamping.
 * Returns null if bounds are invalid (zero or negative size).
 */
export function computeFitToViewport(
  rect: { width: number; height: number },
  bounds: ViewportBounds,
  baseX: number,
  baseY: number,
  options: ComputeFitToViewportOptions = {}
): { scale: number; pan: { x: number; y: number } } | null {
  const tw = bounds.maxX - bounds.minX;
  const th = bounds.maxY;
  if (tw <= 0 || th <= 0) return null;

  const padding = options.padding ?? DEFAULT_PADDING;
  const scaleMin = options.scaleMin ?? DEFAULT_SCALE_MIN;
  const scaleMax = options.scaleMax ?? DEFAULT_SCALE_MAX;

  const fitScale = Math.min(
    (rect.width - padding) / tw,
    (rect.height - padding) / th,
    scaleMax
  );
  const s = Math.max(scaleMin, Math.min(scaleMax, fitScale));
  const px = rect.width / 2 - baseX - (tw / 2) * s;
  const py = rect.height / 2 - baseY - (th / 2) * s;

  return { scale: s, pan: { x: px, y: py } };
}
