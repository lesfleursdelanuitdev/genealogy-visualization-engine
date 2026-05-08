/**
 * Vertical pedigree: proband at bottom (largest y); ancestors grow upward (decreasing y).
 *
 * Horizontal layout: each person is centered under their parents’ midpoint, with subtree
 * widths so left/right branches reserve enough space (Vertical Pedigree spec).
 */

import { PERSON_HEIGHT, PERSON_WIDTH, VERTICAL_GAP } from "../descendancy/constants";
import type { LayoutBoundsOptions } from "../ViewStrategyDescriptor";
import type { ChartNode } from "../../nodes";
import { PersonNode, UnionNode, NormalUnionNode } from "../../nodes";

/** Default vertical distance between generation row centers (card height + gap). */
export const VERTICAL_PEDIGREE_GENERATION_GAP = PERSON_HEIGHT + 72;

/** Minimum horizontal gap between father and mother subtrees (spec ≈ 80px). */
const HORIZONTAL_SUBTREE_GAP = Math.max(80, VERTICAL_GAP * 0.8);

function getParentUnion(p: PersonNode): NormalUnionNode | null {
  if (p.children.length !== 1 || !(p.children[0] instanceof UnionNode)) return null;
  const u = p.children[0];
  return u instanceof NormalUnionNode ? u : null;
}

function collectPedigreePersons(root: PersonNode, out: PersonNode[]): void {
  out.push(root);
  const u = getParentUnion(root);
  if (!u) return;
  collectPedigreePersons(u.left, out);
  if (u.right) collectPedigreePersons(u.right, out);
}

/**
 * Width required for this person’s node plus all ancestors above them (horizontal extent).
 */
function subtreeWidth(
  p: PersonNode,
  cardWidth: number,
  hGap: number,
  memo: Map<PersonNode, number>
): number {
  const cached = memo.get(p);
  if (cached != null) return cached;

  const u = getParentUnion(p);
  if (!u) {
    memo.set(p, cardWidth);
    return cardWidth;
  }

  const wLeft = subtreeWidth(u.left, cardWidth, hGap, memo);
  const wRight = u.right ? subtreeWidth(u.right, cardWidth, hGap, memo) : cardWidth;
  const w = Math.max(cardWidth, wLeft + hGap + wRight);
  memo.set(p, w);
  return w;
}

/**
 * Place person at `centerX`; parents (if any) are centered as a pair above this person.
 */
function positionSubtree(
  p: PersonNode,
  centerX: number,
  cardWidth: number,
  hGap: number,
  memo: Map<PersonNode, number>
): void {
  p.x = centerX;
  const u = getParentUnion(p);
  if (!u) return;

  const wLeft = subtreeWidth(u.left, cardWidth, hGap, memo);
  const wRight = u.right ? subtreeWidth(u.right, cardWidth, hGap, memo) : cardWidth;
  const total = wLeft + hGap + wRight;
  const leftCenter = centerX - total / 2 + wLeft / 2;
  const rightCenter = centerX + total / 2 - wRight / 2;

  positionSubtree(u.left, leftCenter, cardWidth, hGap, memo);
  if (u.right) positionSubtree(u.right, rightCenter, cardWidth, hGap, memo);
}

/**
 * Assign x/y on every {@link PersonNode} and union anchor (u.x, u.y) for bounds.
 */
export function layoutVerticalPedigree(root: ChartNode, options?: LayoutBoundsOptions): void {
  const ph = options?.personHeight ?? PERSON_HEIGHT;
  const generationGap = Math.max(240, ph + 72);
  const cardWidth = PERSON_WIDTH;

  if (!(root instanceof PersonNode)) return;

  const widthMemo = new Map<PersonNode, number>();
  subtreeWidth(root, cardWidth, HORIZONTAL_SUBTREE_GAP, widthMemo);

  /** Start root at x = 0; entire tree is shifted later so min x fits padding. */
  positionSubtree(root, 0, cardWidth, HORIZONTAL_SUBTREE_GAP, widthMemo);

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
  let maxGen = 0;
  for (const p of persons) {
    maxGen = Math.max(maxGen, gen.get(p) ?? 0);
  }

  for (const p of persons) {
    const g = gen.get(p) ?? 0;
    p.y = (maxGen - g) * generationGap + ph / 2;
  }

  let minX = Infinity;
  for (const p of persons) {
    minX = Math.min(minX, p.x);
  }
  if (Number.isFinite(minX)) {
    for (const p of persons) {
      p.x = p.x - minX + PERSON_WIDTH / 2;
    }
  }

  for (const p of persons) {
    const u = getParentUnion(p);
    if (!u) continue;
    u.x = (u.left.x + (u.right?.x ?? u.left.x)) / 2;
    u.y = (u.left.y + (u.right?.y ?? u.left.y)) / 2;
  }
}
