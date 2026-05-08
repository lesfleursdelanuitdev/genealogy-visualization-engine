export type FanPoint = { x: number; y: number };

export type FanGeometryOptions = {
  generationCount: number;
  rootRadius: number;
  generationThickness: number;
  /**
   * Band index (1 = first ancestor ring) at which each ring gains +thicknessIncreaseStep
   * per generation. Generations below this use constant `generationThickness`.
   */
  thicknessIncreaseStartGeneration?: number;
  /** Added per generation for bands at or after `thicknessIncreaseStartGeneration`. */
  thicknessIncreaseStep?: number;
  center?: FanPoint;
  startAngle?: number;
  endAngle?: number;
};

/** Label and readability options (used by consumers; ignored by `buildFanGeometry`). */
export type FanChartLabelOptions = {
  diagonalLabelStartGeneration?: number;
  minArcLengthForName?: number;
  minArcLengthForDates?: number;
  /** Minimum radial depth (px) of the band to allow date lines in radial mode. */
  minRadialForDates?: number;
};

export type FanChartOptions = FanGeometryOptions & FanChartLabelOptions;

export type FanCell = {
  id: string;
  generation: number;
  index: number;
  innerRadius: number;
  outerRadius: number;
  /** Radial depth of this generation band (`outer − inner`). */
  bandThickness: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  angularWidth: number;
  center: FanPoint;
};

export type FanGeometry = {
  cells: FanCell[];
  generations: FanCell[][];
  center: FanPoint;
  startAngle: number;
  endAngle: number;
};

const DEFAULT_START_ANGLE = Math.PI;
const DEFAULT_END_ANGLE = Math.PI * 2;

/**
 * Radial depth of the annulus for ancestor generation `generation` (1 = first ring around the root disk).
 */
export function bandThicknessForGeneration(
  generation: number,
  options: Pick<FanGeometryOptions, "generationThickness" | "thicknessIncreaseStartGeneration" | "thicknessIncreaseStep">
): number {
  const base = Math.max(0, options.generationThickness);
  if (generation < 1) return base;
  const th = options.thicknessIncreaseStartGeneration;
  const step = options.thicknessIncreaseStep ?? 0;
  if (th == null || generation < th) {
    return base;
  }
  return base + (generation - th + 1) * step;
}

/**
 * Outer radius after all rings for generations 1..generationCount (root disk is generation 0).
 */
export function computeFanMaxOuterRadius(options: FanGeometryOptions): number {
  const generationCount = Math.max(0, Math.floor(options.generationCount));
  const rootRadius = Math.max(0, options.rootRadius);
  if (generationCount === 0) {
    return rootRadius;
  }
  let r = rootRadius;
  for (let g = 1; g <= generationCount; g += 1) {
    r += bandThicknessForGeneration(g, options);
  }
  return r;
}

function normalizeReadableBaselineDeg(deg: number): number {
  let out = deg;
  const n = ((out % 360) + 360) % 360;
  if (n > 90 && n < 270) {
    out += 180;
  }
  return out;
}

/**
 * Rotation (degrees) so default LTR text runs along the outward radial at `midAngleRad`,
 * with a readability flip when it would read upside-down.
 */
export function radialLabelRotationDeg(midAngleRad: number): number {
  const deg = (midAngleRad * 180) / Math.PI;
  return normalizeReadableBaselineDeg(deg);
}

/**
 * Rotation (degrees) so LTR text runs tangent to the annulus (perpendicular to the radial).
 * Stacking name / date at different radii then places them “below” each other along the ray without
 * both lines extending along the same axis (which would overlap for long names).
 */
export function tangentialLabelRotationDeg(midAngleRad: number): number {
  const deg = ((midAngleRad - Math.PI / 2) * 180) / Math.PI;
  return normalizeReadableBaselineDeg(deg);
}

export function buildFanGeometry(options: FanGeometryOptions): FanGeometry {
  const generationCount = Math.max(0, Math.floor(options.generationCount));
  const rootRadius = Math.max(0, options.rootRadius);
  const startAngle = options.startAngle ?? DEFAULT_START_ANGLE;
  const endAngle = options.endAngle ?? DEFAULT_END_ANGLE;
  const maxOuter = computeFanMaxOuterRadius(options);
  const center = options.center ?? {
    x: 0,
    y: maxOuter,
  };

  const outerByGen: number[] = [];
  outerByGen[0] = rootRadius;
  for (let g = 1; g <= generationCount; g += 1) {
    outerByGen[g] = outerByGen[g - 1] + bandThicknessForGeneration(g, options);
  }

  const generations: FanCell[][] = [];
  const cells: FanCell[] = [];

  for (let generation = 0; generation <= generationCount; generation += 1) {
    const sectorCount = 2 ** generation;
    const angularWidth = (endAngle - startAngle) / sectorCount;
    const innerRadius = generation === 0 ? 0 : outerByGen[generation - 1];
    const outerRadius = outerByGen[generation];
    const bandThickness = Math.max(0, outerRadius - innerRadius);
    const row: FanCell[] = [];
    for (let index = 0; index < sectorCount; index += 1) {
      const cellStartAngle = startAngle + index * angularWidth;
      const cellEndAngle = cellStartAngle + angularWidth;
      const cellMidAngle = (cellStartAngle + cellEndAngle) / 2;
      const cell: FanCell = {
        id: `${generation}:${index}`,
        generation,
        index,
        innerRadius,
        outerRadius,
        bandThickness,
        startAngle: cellStartAngle,
        endAngle: cellEndAngle,
        midAngle: cellMidAngle,
        angularWidth,
        center,
      };
      row.push(cell);
      cells.push(cell);
    }
    generations.push(row);
  }

  return {
    cells,
    generations,
    center,
    startAngle,
    endAngle,
  };
}
