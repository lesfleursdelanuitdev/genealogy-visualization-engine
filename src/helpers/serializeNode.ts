import type { ChartNode } from "../nodes";
import {
  UnionNode,
  NormalUnionNode,
  CatchAllNode,
  LinkedParentNode,
  SiblingAdoptiveUnionNode,
} from "../nodes";

export function serializeNode(node: ChartNode, indent = 0): string[] {
  const pad = "  ".repeat(indent);
  if (node instanceof UnionNode) {
    const left = node.left?.content?.id ?? "?";
    const right = node.right?.content?.id ?? "none";
    const tag = node instanceof CatchAllNode
      ? " [CATCHALL]"
      : node instanceof LinkedParentNode
        ? " [LINKED]"
        : node instanceof SiblingAdoptiveUnionNode
          ? " [SIBLING-ADOPTIVE]"
          : node instanceof NormalUnionNode && node._isPrimary
            ? " [PRIMARY]"
            : " [SECONDARY]";
    const pos = `(${Math.round(node.x)},${Math.round(node.y)})`;
    const lines = [`${pad}Union(${left}, ${right})${tag} ${pos}`];
    for (const c of node.children) lines.push(...serializeNode(c, indent + 1));
    return lines;
  } else {
    const id = node.content?.id ?? "?";
    const shadow = node.content?._isShadow ? " [SHADOW]" : "";
    const pos = `(${Math.round(node.x)},${Math.round(node.y)})`;
    const lines = [`${pad}Person(${id})${shadow} ${pos}`];
    for (const c of node.children) lines.push(...serializeNode(c, indent + 1));
    return lines;
  }
}
