/**
 * Descendancy view strategy: reveals spouses, linked unions, sibling view, catch-all.
 * This is the current chart behavior; buildTree(rootId, strategy) runs it.
 */

import { SIBLING_COLORS } from "./constants";
import type { DescendancyPerson } from "../../types";
import {
  PersonNode,
  NormalUnionNode,
  CatchAllNode,
  LinkedParentNode,
  SiblingAdoptiveUnionNode,
  type UnionNode,
} from "../../nodes";
import { getParentUnionsByChild, getUnionById, getUnionsByPerson } from "../../testdata";
import type { ViewState, LinkedUnionEntry, UnionRecord } from "../../types";
import type { BuildContext, ViewStrategy } from "../ViewStrategy";

export class DescendancyViewStrategy implements ViewStrategy {
  constructor(
    private readonly viewState: ViewState = {},
    private readonly maxDepth: number
  ) {}

  isSubtreeCollapsed(personId: string): boolean {
    const list = this.viewState.collapsedSubtrees ?? [];
    return list.includes(personId);
  }

  buildUnionNodes(personId: string, depth: number, ctx: BuildContext): UnionNode[] {
    const people = ctx.people;
    const revealedUnions = this.viewState.revealedUnions ?? new Map<string, string[]>();
    const linkedUnions = this.viewState.linkedUnions ?? new Map<string, LinkedUnionEntry[]>();
    const siblingView = this.viewState.siblingView ?? null;

    const spouseIds = revealedUnions.get(personId) ?? [];
    if (spouseIds.length === 0) return [];

    const xyScoped = this.buildXYLinkedNodesForPerson(
      people,
      linkedUnions,
      personId,
      ctx.rootId,
      revealedUnions
    );

    const allUnions = ctx.allUnionsFor(personId);
    const revealedUnionNodes = spouseIds.flatMap((spouseId) => {
      const union = allUnions.find(
        (u) =>
          (u.husb === personId && u.wife === spouseId) ||
          (u.husb === spouseId && u.wife === personId)
      );
      if (!union) return [];
      const rightPerson = people.get(spouseId) ?? null;
      const rightNode = rightPerson ? new PersonNode({ ...rightPerson, _onlyRoot: false }) : null;
      const basePerson = people.get(personId);
      if (!basePerson) return [];
      const leftNode = new PersonNode({ ...basePerson, _onlyRoot: false });
      const childNodes = union.children
        .map((c) => ctx.buildNode(c.id, depth + 1))
        .filter((n): n is PersonNode => n != null);
      const unionNode = new NormalUnionNode(leftNode, rightNode, childNodes, personId);
      return [unionNode, ...this.buildLinkedUnionNodes(spouseId, people, linkedUnions)];
    });

    const revealedUnionIds = new Set(
      allUnions
        .filter((u) => spouseIds.includes(u.husb === personId ? u.wife : u.husb))
        .map((u) => u.id ?? "")
    );

    const allNodes: UnionNode[] = [
      ...revealedUnionNodes,
      ...xyScoped,
      ...(siblingView && personId === ctx.rootId
        ? this.buildSiblingViewNodes(personId, revealedUnionNodes, allUnions, depth, ctx)
        : []),
    ];

    const skipRootCatchAllInSiblingView =
      siblingView && personId === ctx.rootId && (siblingView.spouseCatchAlls?.length ?? 0) > 0;
    if (!skipRootCatchAllInSiblingView) {
      const catchAll = this.buildCatchAllNode(
        people.get(personId)!,
        allUnions,
        revealedUnionIds,
        depth,
        ctx
      );
      if (catchAll) {
        if (siblingView && personId === ctx.rootId) catchAll.connectorColor = SIBLING_COLORS.xCatchAll;
        allNodes.push(catchAll);
      }
    }

    return allNodes;
  }

  private buildLinkedUnionNodes(
    spouseId: string,
    people: Map<string, DescendancyPerson>,
    linkedUnions: Map<string, LinkedUnionEntry[]>
  ): UnionNode[] {
    const linked = linkedUnions.get(spouseId) ?? [];
    return linked
      .map((entry) => {
        const { xId, unionId, bothNewcomers } = entry;
        const xPerson = people.get(xId);
        const spousePerson = people.get(spouseId);
        if (!xPerson) return null;
        const leftNode =
          bothNewcomers && entry.husbId
            ? new PersonNode({ ...people.get(entry.husbId)!, _isLinkedSpouse: true, _onlyRoot: false })
            : spousePerson
              ? new PersonNode({ ...spousePerson, _isShadow: true, _onlyRoot: false })
              : null;
        if (!leftNode) return null;
        const rightNode = new PersonNode({ ...xPerson, _isLinkedSpouse: true, _onlyRoot: false });
        return new LinkedParentNode(leftNode, rightNode, unionId);
      })
      .filter((n): n is LinkedParentNode => n != null);
  }

  /**
   * Primary parent on the birth union for `anchorId` (same rule as applyParents re-root).
   * Used to attach `__xy__` adoptive rows next to that parent's spouse line when the anchor has no spouses revealed.
   */
  private xyAttachmentParentId(anchorId: string, people: Map<string, DescendancyPerson>): string | null {
    const parentUnions = getParentUnionsByChild().get(anchorId) ?? [];
    if (parentUnions.length === 0) return null;
    const birthUnion =
      parentUnions.find((u) => u.children.find((c) => c.id === anchorId)?.pedi === "birth") ??
      parentUnions[0];
    const isHusbUnknown = people.get(birthUnion.husb)?.firstName === "Unknown";
    return isHusbUnknown ? birthUnion.wife : birthUnion.husb;
  }

  /**
   * Renders `__xy__*` linked parent pairs for at most one row per entry:
   * - If the anchor has revealed spouses, only on the anchor's union fan-out.
   * - Otherwise on the birth-union primary parent's row (so adoptive parents still appear next to e.g. Martin & Yvonne).
   * Entries without `xyAnchorPersonId` (legacy) attach only to the chart root row.
   * Sibling-view adoptive couples use {@link buildSiblingViewNodes} / {@link SiblingAdoptiveUnionNode}, not this path.
   */
  private buildXYLinkedNodesForPerson(
    people: Map<string, DescendancyPerson>,
    linkedUnions: Map<string, LinkedUnionEntry[]>,
    personId: string,
    rootId: string,
    revealedUnions: Map<string, string[]>
  ): UnionNode[] {
    const nodes: UnionNode[] = [];
    for (const [key, entries] of linkedUnions) {
      if (!key.startsWith("__xy__")) continue;
      for (const entry of entries) {
        const anchor = entry.xyAnchorPersonId;
        if (anchor != null) {
          const anchorSpouses = revealedUnions.get(anchor) ?? [];
          if (anchorSpouses.length > 0) {
            if (personId !== anchor) continue;
          } else {
            const attachTo = this.xyAttachmentParentId(anchor, people);
            if (attachTo == null || personId !== attachTo) continue;
          }
        } else if (personId !== rootId) {
          continue;
        }
        const { xId, unionId, husbId } = entry;
        if (!husbId) continue;
        const husbPerson = people.get(husbId);
        const wifePerson = people.get(xId);
        if (!husbPerson || !wifePerson) continue;
        const leftNode = new PersonNode({ ...husbPerson, _isLinkedSpouse: true, _onlyRoot: false });
        const rightNode = new PersonNode({ ...wifePerson, _isLinkedSpouse: true, _onlyRoot: false });
        nodes.push(new LinkedParentNode(leftNode, rightNode, unionId));
      }
    }
    return nodes;
  }

  private buildCatchAllNode(
    person: DescendancyPerson,
    allUnions: UnionRecord[],
    revealedUnionIds: Set<string>,
    depth: number,
    ctx: BuildContext
  ): CatchAllNode | null {
    const catchAllChildIds = new Set<string>();
    for (const u of allUnions) {
      if (revealedUnionIds.has(u.id ?? "")) continue;
      for (const c of u.children) {
        if (!ctx.visited.has(c.id)) catchAllChildIds.add(c.id);
      }
    }
    const catchAllChildren = [...catchAllChildIds]
      .map((id) => ctx.buildNode(id, depth + 1))
      .filter((n): n is PersonNode => n != null);
    if (catchAllChildren.length === 0) return null;
    return new CatchAllNode(new PersonNode({ ...person, _onlyRoot: false }), null, catchAllChildren);
  }

  private buildSiblingCatchAll(
    catchPersonId: string,
    excludeUnionId: string | undefined,
    color: string,
    leafOnly: boolean,
    depth: number,
    ctx: BuildContext
  ): CatchAllNode | null {
    const catchUnions = getUnionsByPerson().get(catchPersonId) ?? [];
    const filtered = excludeUnionId
      ? catchUnions.filter((u) => (u.id ?? `${u.husb}-${u.wife}`) !== excludeUnionId)
      : catchUnions;
    const catchChildIds = new Set<string>();
    for (const u of filtered) {
      for (const c of u.children) {
        if (!ctx.visited.has(c.id)) catchChildIds.add(c.id);
      }
    }
    const catchChildren = [...catchChildIds]
      .map((id) => ctx.buildNode(id, leafOnly ? this.maxDepth : depth + 1, leafOnly))
      .filter((n): n is PersonNode => n != null);
    if (catchChildren.length === 0) return null;
    const catchPerson = ctx.people.get(catchPersonId);
    if (!catchPerson) return null;
    const shadowNode = new PersonNode({ ...catchPerson, _isShadow: true, _onlyRoot: false });
    const node = new CatchAllNode(shadowNode, null, catchChildren);
    node.isSiblingCatchAll = true;
    node.connectorColor = color;
    return node;
  }

  private buildSiblingViewNodes(
    personId: string,
    revealedUnionNodes: UnionNode[],
    allUnions: UnionRecord[],
    depth: number,
    ctx: BuildContext
  ): UnionNode[] {
    const siblingView = this.viewState.siblingView!;
    const nodes: UnionNode[] = [];
    if (revealedUnionNodes.length > 0) {
      const bioUnion = revealedUnionNodes[0] as NormalUnionNode;
      const hasMultipleFamiliesAsChild = (siblingView.adoptiveUnions?.length ?? 0) > 0;
      if (hasMultipleFamiliesAsChild) {
        bioUnion.connectorColor = SIBLING_COLORS.xyUnion;
      } else {
        bioUnion.connectorColor = undefined;
      }
    }
    const catchAllStrokeByIndex = [SIBLING_COLORS.xCatchAll, SIBLING_COLORS.yCatchAll];
    let spouseCatchIdx = 0;
    for (const catchPersonId of siblingView.spouseCatchAlls ?? []) {
      const excludeUnion = allUnions.find(
        (u) =>
          (u.husb === personId && u.wife === catchPersonId) ||
          (u.husb === catchPersonId && u.wife === personId)
      );
      const excludeUnionId = excludeUnion
        ? (excludeUnion.id ?? `${excludeUnion.husb}-${excludeUnion.wife}`)
        : undefined;
      const node = this.buildSiblingCatchAll(
        catchPersonId,
        excludeUnionId,
        catchAllStrokeByIndex[spouseCatchIdx % catchAllStrokeByIndex.length]!,
        false,
        depth,
        ctx
      );
      spouseCatchIdx++;
      if (node) nodes.push(node);
    }
    for (const unionId of siblingView.adoptiveUnions ?? []) {
      const adoptUnion = getUnionById().get(unionId);
      if (!adoptUnion) continue;
      const childNodes = adoptUnion.children
        .filter((c) => c.id !== siblingView.personId)
        .filter((c) => !ctx.visited.has(c.id))
        .map((c) => ctx.buildNode(c.id, depth + 1))
        .filter((n): n is PersonNode => n != null);
      const husbP = ctx.people.get(adoptUnion.husb);
      const wifeP = ctx.people.get(adoptUnion.wife);
      if (!husbP || !wifeP) continue;
      const leftNode = new PersonNode({ ...husbP, _isLinkedSpouse: true, _onlyRoot: false });
      const rightNode = new PersonNode({ ...wifeP, _isLinkedSpouse: true, _onlyRoot: false });
      nodes.push(
        new SiblingAdoptiveUnionNode(
          leftNode,
          rightNode,
          childNodes,
          siblingView.personId,
          SIBLING_COLORS.wvUnion,
          unionId
        )
      );
      const adoptiveCatchAllColors = [SIBLING_COLORS.wCatchAll, SIBLING_COLORS.vCatchAll];
      let colorIdx = 0;
      for (const catchPersonId of siblingView.adoptiveCatchAlls ?? []) {
        const node = this.buildSiblingCatchAll(
          catchPersonId,
          unionId,
          adoptiveCatchAllColors[colorIdx % 2],
          true,
          depth,
          ctx
        );
        colorIdx++;
        if (node) nodes.push(node);
      }
    }
    return nodes;
  }
}
