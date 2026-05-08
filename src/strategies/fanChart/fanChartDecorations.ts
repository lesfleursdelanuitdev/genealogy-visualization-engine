import type { FanCell, FanPoint } from "./geometry";
import { polarToCartesian } from "./render";

/** Layout for gender arc band, more button, and derived text safe zone (chrome). */
export type FanChromeLayoutOptions = {
  genderBandInset: number;
  genderBandThickness: number;
  /** Fraction of the cell angular span trimmed from each end (0–0.5). */
  genderBandAnglePaddingFraction: number;
  moreButtonRadius: number;
  innerPadding: number;
  outerPadding: number;
};

export const DEFAULT_FAN_CHROME_LAYOUT: FanChromeLayoutOptions = {
  genderBandInset: 4,
  genderBandThickness: 5,
  genderBandAnglePaddingFraction: 0.03,
  moreButtonRadius: 10,
  innerPadding: 4,
  outerPadding: 6,
};

/**
 * Radial bounds for label text: clear the **inner** arc (more button) and the **outer** arc (gender band).
 */
export function computeFanCellTextBounds(
  cell: FanCell,
  opts: FanChromeLayoutOptions
): { safeInnerRadius: number; safeOuterRadius: number } {
  const safeInner = cell.innerRadius + opts.moreButtonRadius + opts.innerPadding;
  const outerChrome = opts.genderBandInset + opts.genderBandThickness + opts.outerPadding;
  const safeOuter = cell.outerRadius - outerChrome;
  return {
    safeInnerRadius: safeInner,
    safeOuterRadius: Math.max(safeInner + 1, safeOuter),
  };
}

/**
 * Gender band follows the cell’s **outer** arc at `outerRadius - inset` (top of the annular sector),
 * with angular padding from the radial sides. Render with `stroke` / `strokeWidth` (no fill).
 * Applies to every sector including generation 0 (root) where `outerRadius` is the root disk radius.
 */
export function buildGenderBandArcPath(
  cell: FanCell,
  options: Pick<FanChromeLayoutOptions, "genderBandInset" | "genderBandAnglePaddingFraction">
): string {
  const r = cell.outerRadius - options.genderBandInset;
  const span = cell.endAngle - cell.startAngle;
  const f = Math.max(0, Math.min(0.45, options.genderBandAnglePaddingFraction));
  const startAngle = cell.startAngle + f * span;
  const endAngle = cell.endAngle - f * span;
  if (endAngle <= startAngle || r <= 0) {
    return "";
  }
  const p0 = polarToCartesian(cell.center, r, startAngle);
  const p1 = polarToCartesian(cell.center, r, endAngle);
  const delta = Math.abs(endAngle - startAngle);
  const laf = delta > Math.PI ? 1 : 0;
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${laf} 1 ${p1.x} ${p1.y}`;
}

/** Center of the more chip lies on the cell’s **inner** arc at `midAngle` (bottom of the annular sector toward the hub). */
export function getMoreButtonCenter(cell: FanCell): FanPoint {
  return polarToCartesian(cell.center, cell.innerRadius, cell.midAngle);
}

/**
 * Rotation (degrees) for a chevron aligned with the **tangent** to the fan arcs at `midAngle`
 * (icon “down” should follow the ring direction after transform).
 */
export function moreButtonChevronRotationDeg(midAngleRad: number): number {
  return ((midAngleRad + Math.PI / 2) * 180) / Math.PI;
}

/**
 * Text along an arc, constrained to a radial band (e.g. derived from `computeFanCellTextBounds`).
 * `radiusBias` maps 0 → safeInner, 1 → safeOuter.
 */
export function buildFanTextArcPathInRadialZone(
  cell: FanCell,
  options: {
    safeInnerRadius: number;
    safeOuterRadius: number;
    radiusBias: number;
    angularPaddingFraction?: number;
  }
): string {
  const t = Math.max(0, Math.min(1, options.radiusBias));
  const r =
    options.safeInnerRadius +
    t * Math.max(0, options.safeOuterRadius - options.safeInnerRadius);
  if (r <= 0) return "";
  const frac = Math.max(0, options.angularPaddingFraction ?? 0.02);
  const span = cell.endAngle - cell.startAngle;
  const startAngle = cell.startAngle + frac * span;
  const endAngle = cell.endAngle - frac * span;
  const start = polarToCartesian(cell.center, r, startAngle);
  const end = polarToCartesian(cell.center, r, endAngle);
  const delta = Math.abs(endAngle - startAngle);
  const laf = delta > Math.PI ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${laf} 1 ${end.x} ${end.y}`;
}

/** Arc length at a radius between safe bounds (for label fitting). */
export function fanTextZoneArcLength(
  cell: FanCell,
  safeInnerRadius: number,
  safeOuterRadius: number,
  radiusBias: number
): number {
  const t = Math.max(0, Math.min(1, radiusBias));
  const r =
    safeInnerRadius + t * Math.max(0, safeOuterRadius - safeInnerRadius);
  return Math.max(0, r * Math.abs(cell.endAngle - cell.startAngle));
}
