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
import type { ViewState, LinkedUnionEntry, UnionRecord } from "../../types";
import { isUnknownPartnerId, type GraphSnapshot } from "../../graph";

/**
 * Whether `partnerId` (from a union) is the revealed `spouseId`. A revealed "" comes from
 * history saved before per-family placeholders (H4): it means that family's unknown partner.
 */
function isRevealedPartner(partnerId: string, spouseId: string): boolean {
  return partnerId === spouseId || (spouseId === "" && isUnknownPartnerId(partnerId));
}

function partnerOf(u: UnionRecord, personId: string): string {
  return u.husb === personId ? u.wife : u.husb;
}
import { shouldSkipCatchAllForFamilyUnit } from "../../reducer/strategies/descendancy/familyUnitScope";
import type { BuildContext, ViewStrategy } from "../ViewStrategy";

/**
 * The couple's families. A couple can have several FAM records (B04): all of them are shown,
 * unless a family-unit scope names one.
 */
function unionsBetweenPartners(
  allUnions: readonly UnionRecord[],
  personId: string,
  spouseId: string,
  familyXref?: string | null
): readonly UnionRecord[] {
  const matching = allUnions.filter(
    (u) => (u.husb === personId || u.wife === personId) && isRevealedPartner(partnerOf(u, personId), spouseId)
  );
  const fam = familyXref?.trim();
  if (fam) {
    const byFamily = matching.find((u) => u.id === fam);
    if (byFamily) return [byFamily];
  }
  return matching;
}

export class DescendancyViewStrategy implements ViewStrategy {
  constructor(
    private readonly viewState: ViewState = {},
    private readonly maxDepth: number
  ) {}

  isSubtreeCollapsed(personId: string): boolean {
    const list = this.viewState.collapsedSubtrees ?? [];
    return list.includes(personId);
  }

  showsChildrenPastCap(personId: string): boolean {
    return this.viewState.showChildrenOf?.includes(personId) ?? false;
  }

  buildUnionNodes(personId: string, depth: number, ctx: BuildContext): UnionNode[] {
    const people = ctx.people;
    const revealedUnions = this.viewState.revealedUnions ?? new Map<string, string[]>();
    const linkedUnions = this.viewState.linkedUnions ?? new Map<string, LinkedUnionEntry[]>();
    const siblingView = this.viewState.siblingView ?? null;

    const spouseIds = revealedUnions.get(personId) ?? [];
    if (spouseIds.length === 0) return [];

    const xyScoped = this.buildXYLinkedNodesForPerson(
      ctx.graph,
      linkedUnions,
      personId,
      ctx.rootId,
      revealedUnions
    );

    const allUnions = ctx.allUnionsFor(personId);
    const familyScope = this.viewState.familyUnitScope;
    const revealedUnionNodes = spouseIds.flatMap((spouseId) => {
      const scopedFamilyXref =
        familyScope?.personId === personId && familyScope.spouseId === spouseId
          ? familyScope.familyXref
          : null;
      const unions = unionsBetweenPartners(allUnions, personId, spouseId, scopedFamilyXref);
      const basePerson = people.get(personId);
      if (unions.length === 0 || !basePerson) return [];
      const unionNodes = unions.map((union) => {
        const rightPerson = people.get(partnerOf(union, personId)) ?? null;
        const leftNode = new PersonNode({ ...basePerson, _onlyRoot: false });
        const rightNode = rightPerson ? new PersonNode({ ...rightPerson, _onlyRoot: false }) : null;
        const childNodes = union.children
          .map((c) => ctx.buildNode(c.id, depth + 1))
          .filter((n): n is PersonNode => n != null);
        return new NormalUnionNode(leftNode, rightNode, childNodes, personId);
      });
      return [...unionNodes, ...this.buildLinkedUnionNodes(spouseId, people, linkedUnions)];
    });

    const revealedUnionIds = new Set(
      allUnions
        .filter((u) => spouseIds.some((s) => isRevealedPartner(partnerOf(u, personId), s)))
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
    const skipCatchAllForFamilyUnit = shouldSkipCatchAllForFamilyUnit(
      this.viewState,
      personId,
      ctx.rootId
    );
    if (!skipRootCatchAllInSiblingView && !skipCatchAllForFamilyUnit) {
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
    people: ReadonlyMap<string, DescendancyPerson>,
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
  private xyAttachmentParentId(anchorId: string, graph: GraphSnapshot): string | null {
    const people = graph.people;
    const parentUnions = graph.parentUnionsOf(anchorId);
    if (parentUnions.length === 0) return null;
    const birthUnion = graph.birthUnionByChild.get(anchorId) ?? parentUnions[0];
    const isHusbUnknown = people.get(birthUnion.husb)?._unknownPlaceholder === true;
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
    graph: GraphSnapshot,
    linkedUnions: Map<string, LinkedUnionEntry[]>,
    personId: string,
    rootId: string,
    revealedUnions: Map<string, string[]>
  ): UnionNode[] {
    const people = graph.people;
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
            const attachTo = this.xyAttachmentParentId(anchor, graph);
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
    allUnions: readonly UnionRecord[],
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
    const catchUnions = ctx.graph.unionsOf(catchPersonId);
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
    allUnions: readonly UnionRecord[],
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
      const adoptUnion = ctx.graph.unionById.get(unionId);
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
