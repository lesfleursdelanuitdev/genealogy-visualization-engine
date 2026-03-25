import type { ChartNode } from "../nodes";
import { UnionNode } from "../nodes";

export function countVisibleNodes(node: ChartNode): number {
  if (!node) return 0;
  let n = 0;
  if (node instanceof UnionNode) {
    if (node.left?.content && !node.left.content._isShadow) n++;
    if (node.right?.content && !node.right.content._isShadow) n++;
  } else {
    if (node.content && !node.content._isShadow) n++;
  }
  for (const c of node.children) n += countVisibleNodes(c);
  return n;
}
