/**
 * Pedigree layout (LTR): column 0 = proband, column 1 = parents, column 2 = grandparents, …
 * Vertical position: father branch above mother branch; each person’s y is centered between their parents.
 */

import { PERSON_HEIGHT, PERSON_WIDTH } from "../descendancy/constants";
import type { LayoutBoundsOptions } from "../ViewStrategyDescriptor";
import type { ChartNode } from "../../nodes";
import { PersonNode, UnionNode, NormalUnionNode } from "../../nodes";

/** Default edge-to-edge horizontal gap (px) between a child card's right edge and parent card's left edge. */
export const DEFAULT_PEDIGREE_GENERATION_GAP = 72;

/** Default center-to-center horizontal distance between generation columns. */
export const PEDIGREE_GENERATION_GAP = PERSON_WIDTH + DEFAULT_PEDIGREE_GENERATION_GAP;

/**
 * Minimum edge-to-edge gap (px) used for inner-generation columns (g=1 … g=n-1).
 * The actual compact gap is max(this, edgeToEdgeGap / 3), ensuring cards never overlap
 * while still being visually tighter than the leaf generation.
 */
export const PEDIGREE_COMPACT_MIN_GAP = 16;

/**
 * Default vertical gap (px) between stacked parent cards (edge-to-edge) in horizontal pedigree.
 * App settings may override via {@link LayoutBoundsOptions.parentPairGap}.
 */
export const DEFAULT_PEDIGREE_PARENT_PAIR_GAP = 40;

function getParentUnion(p: PersonNode): NormalUnionNode | null {
  if (p.children.length !== 1 || !(p.children[0] instanceof UnionNode)) return null;
  const u = p.children[0];
  return u instanceof NormalUnionNode ? u : null;
}

/** Person whose only child is a single union (birth parents) — used by pedigree connector helpers. */
export function isPedigreePersonWithParentUnion(node: ChartNode): boolean {
  return (
    node instanceof PersonNode &&
    node.children.length === 1 &&
    node.children[0] instanceof UnionNode
  );
}

function collectPedigreePersons(root: PersonNode, out: PersonNode[]): void {
  out.push(root);
  const u = getParentUnion(root);
  if (!u) return;
  collectPedigreePersons(u.left, out);
  if (u.right) collectPedigreePersons(u.right, out);
}

/**
 * Assign x/y on every {@link PersonNode} and union anchor (u.x, u.y) for bounds.
 * Uses leaf DFS order (father subtree, then mother) so parent columns stack top/bottom cleanly.
 */
export function layoutPedigreeLTR(root: ChartNode, options?: LayoutBoundsOptions): void {
  const ph = Number.isFinite(options?.personHeight) && options!.personHeight! > 0
    ? options!.personHeight!
    : PERSON_HEIGHT;
  const pw = Number.isFinite(options?.personWidth) && options!.personWidth! > 0
    ? options!.personWidth!
    : PERSON_WIDTH;
  const parentPairGap = Number.isFinite(options?.parentPairGap) && options!.parentPairGap! >= 0
    ? options!.parentPairGap!
    : DEFAULT_PEDIGREE_PARENT_PAIR_GAP;
  const rawEdgeToEdgeGap = options?.pedigreeGenerationGap ?? DEFAULT_PEDIGREE_GENERATION_GAP;
  const edgeToEdgeGap =
    Number.isFinite(rawEdgeToEdgeGap) && rawEdgeToEdgeGap >= 0
      ? rawEdgeToEdgeGap
      : DEFAULT_PEDIGREE_GENERATION_GAP;
  const generationGap = pw / 2 + edgeToEdgeGap;
  const compactEdgeGap = Math.floor(edgeToEdgeGap / 3);
  const compactStep = pw / 2 + compactEdgeGap;
  const showRootSiblings = options?.showRootSiblings ?? false;
  const ySpacing = 2 * (ph + parentPairGap);

  if (!(root instanceof PersonNode)) return;

  const leafOrder = new Map<PersonNode, number>();
  let nextLeaf = 0;

  function markLeaves(p: PersonNode): void {
    const u = getParentUnion(p);
    if (!u) {
      leafOrder.set(p, nextLeaf++);
      return;
    }
    markLeaves(u.left);
    if (u.right) markLeaves(u.right);
  }
  markLeaves(root);

  function assignY(p: PersonNode): number {
    const u = getParentUnion(p);
    if (!u) {
      const y = (leafOrder.get(p) ?? 0) * ySpacing;
      p.y = y;
      return y;
    }
    const fy = assignY(u.left);
    const my = u.right ? assignY(u.right) : fy + ySpacing;
    const y = (fy + my) / 2;
    p.y = y;
    return y;
  }
  assignY(root);

  const gen = new Map<PersonNode, number>();
  function assignGen(p: PersonNode, g: number): void {
    gen.set(p, g);
    const u = getParentUnion(p);
    if (!u) return;
    assignGen(u.left, g + 1);
    if (u.right) assignGen(u.right, g + 1);
  }
  assignGen(root, 0);

  const persons: PersonNode[] = [];
  collectPedigreePersons(root, persons);

  // Determine the deepest generation so the leaf column always uses the full gap.
  let maxGen = 0;
  for (const p of persons) maxGen = Math.max(maxGen, gen.get(p) ?? 0);

  // Compute cumulative x for each generation under Layout L:
  //   g=0              → PERSON_WIDTH / 2 (origin)
  //   g=1 step         → full gap if showRootSiblings, else compact step
  //   g=2 … g=n-1 step → compact step
  //   g=n step         → full gap (leaf generation always gets breathing room)
  const xByGen = new Array<number>(maxGen + 1);
  xByGen[0] = pw / 2;
  for (let i = 1; i <= maxGen; i++) {
    const useFullGap = (i === 1 && showRootSiblings) || i === maxGen;
    xByGen[i] = xByGen[i - 1] + (useFullGap ? generationGap : compactStep);
  }

  for (const p of persons) {
    const g = gen.get(p) ?? 0;
    p.pedigreeGen = g;
    const rawX = g < xByGen.length ? xByGen[g] : undefined;
    p.x = Number.isFinite(rawX) ? rawX! : g * generationGap + pw / 2;
  }

  let minY = Infinity;
  for (const p of persons) {
    minY = Math.min(minY, p.y);
  }
  if (Number.isFinite(minY) && minY !== 0) {
    for (const p of persons) {
      p.y -= minY;
    }
  }

  for (const p of persons) {
    const u = getParentUnion(p);
    if (!u) continue;
    const ux = (u.left.x + (u.right?.x ?? u.left.x)) / 2;
    const uy = (u.left.y + (u.right?.y ?? u.left.y)) / 2;
    u.x = Number.isFinite(ux) ? ux : u.left.x;
    u.y = Number.isFinite(uy) ? uy : u.left.y;
  }
}
