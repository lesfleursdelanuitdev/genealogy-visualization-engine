import type { DescendancyPerson } from "../../types";
import type { FanCell, FanGeometry, FanPoint } from "./geometry";

export type FanAncestorData = Record<string, DescendancyPerson | null | undefined>;

export type FanRenderOptions = {
  showAvatars?: boolean;
  textAngularPadding?: number;
  minAvatarPx?: number;
};

export type RenderableFanCell = FanCell & {
  person?: DescendancyPerson | null;
  isVisible: boolean;
  hasData: boolean;
  pathD: string;
  textPathD: string;
  label: {
    name?: string;
    dates?: string;
  };
  avatar?: {
    url: string;
    x: number;
    y: number;
    size: number;
  };
};

export function polarToCartesian(center: FanPoint, radius: number, angle: number): FanPoint {
  return {
    x: center.x + radius * Math.cos(angle),
    y: center.y + radius * Math.sin(angle),
  };
}

function largeArcFlag(startAngle: number, endAngle: number): 0 | 1 {
  const delta = Math.abs(endAngle - startAngle);
  return delta > Math.PI ? 1 : 0;
}

export function buildAnnularSectorPath(cell: FanCell): string {
  const outerStart = polarToCartesian(cell.center, cell.outerRadius, cell.startAngle);
  const outerEnd = polarToCartesian(cell.center, cell.outerRadius, cell.endAngle);
  const innerStart = polarToCartesian(cell.center, cell.innerRadius, cell.startAngle);
  const innerEnd = polarToCartesian(cell.center, cell.innerRadius, cell.endAngle);
  const laf = largeArcFlag(cell.startAngle, cell.endAngle);

  if (cell.innerRadius <= 0) {
    return [
      `M ${cell.center.x} ${cell.center.y}`,
      `L ${outerStart.x} ${outerStart.y}`,
      `A ${cell.outerRadius} ${cell.outerRadius} 0 ${laf} 1 ${outerEnd.x} ${outerEnd.y}`,
      "Z",
    ].join(" ");
  }

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${cell.outerRadius} ${cell.outerRadius} 0 ${laf} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${cell.innerRadius} ${cell.innerRadius} 0 ${laf} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

export function buildTextArcPath(
  cell: FanCell,
  options?: { angularPadding?: number; radiusBias?: number }
): string {
  const angularPadding = Math.max(0, options?.angularPadding ?? 0.02);
  const startAngle = Math.min(cell.endAngle, cell.startAngle + angularPadding);
  const endAngle = Math.max(startAngle, cell.endAngle - angularPadding);
  const textRadius =
    cell.innerRadius + (cell.outerRadius - cell.innerRadius) * (options?.radiusBias ?? 0.5);
  const start = polarToCartesian(cell.center, textRadius, startAngle);
  const end = polarToCartesian(cell.center, textRadius, endAngle);
  const laf = largeArcFlag(startAngle, endAngle);
  return `M ${start.x} ${start.y} A ${textRadius} ${textRadius} 0 ${laf} 1 ${end.x} ${end.y}`;
}

export function computeAvatarPlacement(
  cell: FanCell,
  options?: { minSize?: number; maxSize?: number }
): { x: number; y: number; size: number } | null {
  const ringThickness = cell.outerRadius - cell.innerRadius;
  if (ringThickness <= 0) return null;
  const arcLength = cell.outerRadius * Math.max(0, cell.angularWidth);
  const candidate = Math.min(ringThickness * 0.56, arcLength * 0.36);
  const size = Math.max(0, Math.min(options?.maxSize ?? 36, candidate));
  if (size < (options?.minSize ?? 14)) return null;
  const avatarRadius = cell.innerRadius + ringThickness * 0.45;
  const point = polarToCartesian(cell.center, avatarRadius, cell.midAngle);
  return {
    x: point.x - size / 2,
    y: point.y - size / 2,
    size,
  };
}

function personLabel(person: DescendancyPerson): { name?: string; dates?: string } {
  const name = `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() || undefined;
  const birth = person.birthYear != null ? String(person.birthYear) : "";
  const death = person.deathYear != null ? String(person.deathYear) : "";
  const dates = birth || death ? `${birth || "?"} - ${death || "?"}` : undefined;
  return { name, dates };
}

export function bindFanGeometry(
  geometry: FanGeometry,
  rootPerson: DescendancyPerson,
  ancestorData: FanAncestorData,
  options?: FanRenderOptions
): RenderableFanCell[] {
  return geometry.cells.map((cell) => {
    const slotKey = `${cell.generation}:${cell.index}`;
    const person = cell.generation === 0 ? rootPerson : (ancestorData[slotKey] ?? null);
    const hasData = Boolean(person);
    const isVisible = true;
    const label = person ? personLabel(person) : {};
    const avatarPlacement =
      options?.showAvatars && person?.photoUrl
        ? computeAvatarPlacement(cell, { minSize: options.minAvatarPx ?? 14 })
        : null;

    return {
      ...cell,
      person,
      hasData,
      isVisible,
      pathD: buildAnnularSectorPath(cell),
      textPathD: buildTextArcPath(cell, { angularPadding: options?.textAngularPadding ?? 0.02 }),
      label,
      avatar:
        avatarPlacement && person?.photoUrl
          ? {
              url: person.photoUrl,
              ...avatarPlacement,
            }
          : undefined,
    };
  });
}
