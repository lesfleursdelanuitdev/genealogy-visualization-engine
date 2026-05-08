/**
 * Pedigree layout (LTR): column 0 = proband, column 1 = parents, column 2 = grandparents, …
 * Vertical position: father branch above mother branch; each person’s y is centered between their parents.
 */

import { PERSON_HEIGHT, PERSON_WIDTH } from "../descendancy/constants";
import type { LayoutBoundsOptions } from "../ViewStrategyDescriptor";
import type { ChartNode } from "../../nodes";
import { PersonNode, UnionNode, NormalUnionNode } from "../../nodes";

/** Horizontal distance between generation column centers (card + breathing room). */
export const PEDIGREE_GENERATION_GAP = PERSON_WIDTH + 72;

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
  const ph = options?.personHeight ?? PERSON_HEIGHT;
  const parentPairGap = options?.parentPairGap ?? DEFAULT_PEDIGREE_PARENT_PAIR_GAP;
  const ySpacing = ph + parentPairGap;

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
  for (const p of persons) {
    const g = gen.get(p) ?? 0;
    p.x = g * PEDIGREE_GENERATION_GAP + PERSON_WIDTH / 2;
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
    u.x = (u.left.x + (u.right?.x ?? u.left.x)) / 2;
    u.y = (u.left.y + (u.right?.y ?? u.left.y)) / 2;
  }
}
