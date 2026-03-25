/**
 * FamilyTreeBuilder — strategy context and single source of truth for people and unions.
 * Strategies interact only with the small strategy-facing API (getPerson, getUnion,
 * allChildrenOfPerson, allUnionsForPerson, ensurePerson, makePersonNode, makeUnionNode);
 * internal maps are private.
 *
 * Also exposes data getters (getPeople, getUnionsByPerson, etc.) for UI and reducers;
 * the current builder is registered in currentBuilder.ts so global getters delegate to it.
 */

import type { ChartNode } from "../nodes";
import type {
  PersonDescriptor,
  UnionDescriptor,
  PersonNodeOptions,
  UnionNodeCreateData,
  UnionNodeOptions,
  UnionNodeType,
} from "../nodes";
import { FamilyTreeNodeFactory } from "../nodes";
import type { DescendancyPerson } from "../types";
import type { UnionRecord, ViewState } from "../types";
import { buildTree as buildTreeCore, type BuildTreeResult } from "./build";
import type { ViewStrategyDescriptor } from "../strategies/ViewStrategyDescriptor";
import { descendancyDescriptor } from "../strategies/descendancy";
import { DEFAULT_MAX_DEPTH } from "../constants";

/** Options for buildTree / buildView (viewState and maxDepth passed to the strategy). */
export interface FamilyTreeBuildOptions {
  viewState?: ViewState;
  maxDepth?: number;
}

export interface FamilyTreeBuilderInput {
  people: DescendancyPerson[];
  unions: UnionRecord[];
}

/**
 * Builder: internal maps are private. Use the strategy-facing API only.
 */
export class FamilyTreeBuilder {
  private readonly nodes = new Map<string, PersonDescriptor | UnionDescriptor>();
  private readonly people = new Map<string, PersonDescriptor>();
  private readonly unions = new Map<string, UnionDescriptor>();
  private readonly unionsPerPerson = new Map<string, { spouses: UnionRecord[]; asChild: UnionRecord[] }>();
  private readonly unionById = new Map<string, UnionRecord>();
  private readonly birthUnionByChild = new Map<string, UnionRecord>();
  readonly viewStrategies = new Map<string, ViewStrategyDescriptor>();

  currentStrategyName = "descendancy";

  private readonly factory: FamilyTreeNodeFactory;

  /** Current view strategy descriptor (layout, connectors, build factory). Use this for layout and connectors. */
  getCurrentStrategy(): ViewStrategyDescriptor | undefined {
    return this.viewStrategies.get(this.currentStrategyName);
  }

  // ─── Strategy-facing API ─────────────────────────────────────────────────

  /** Person record by xref, or undefined if not in the builder. */
  getPerson(xref: string): DescendancyPerson | undefined {
    return this.people.get(xref)?.node.content;
  }

  /** Union record by xref (union id or `${husb}-${wife}`), or undefined. */
  getUnion(xref: string): UnionRecord | undefined {
    return this.unionById.get(xref);
  }

  /** All child xrefs of the given person (across every union where they are a spouse). */
  allChildrenOfPerson(personXref: string): string[] {
    const entry = this.unionsPerPerson.get(personXref);
    if (!entry) return [];
    const childIds = new Set<string>();
    for (const u of entry.spouses) {
      for (const c of u.children) childIds.add(c.id);
    }
    return [...childIds];
  }

  /** All unions where the given person is a spouse (husband or wife). */
  allUnionsForPerson(personXref: string): UnionRecord[] {
    return this.unionsPerPerson.get(personXref)?.spouses ?? [];
  }

  // ─── Data getters for UI / reducers (same API as former apiTreeData) ───────

  getPeople(): Map<string, DescendancyPerson> {
    const out = new Map<string, DescendancyPerson>();
    for (const [xref, desc] of this.people) out.set(xref, desc.node.content);
    return out;
  }

  getUnions(): UnionRecord[] {
    return [...this.unionById.values()];
  }

  getUnionsByPerson(): Map<string, UnionRecord[]> {
    const out = new Map<string, UnionRecord[]>();
    for (const [xref, entry] of this.unionsPerPerson) {
      out.set(xref, [...entry.spouses]);
    }
    return out;
  }

  getAllChildrenOf(personId: string): string[] {
    return this.allChildrenOfPerson(personId);
  }

  getParentUnionsByChild(): Map<string, UnionRecord[]> {
    const out = new Map<string, UnionRecord[]>();
    for (const [xref, entry] of this.unionsPerPerson) {
      if (entry.asChild.length) out.set(xref, [...entry.asChild]);
    }
    return out;
  }

  getUnionById(): Map<string, UnionRecord> {
    return new Map(this.unionById);
  }

  getBirthUnionByChild(): Map<string, UnionRecord> {
    return new Map(this.birthUnionByChild);
  }

  getSpousesOf(personId: string): { spouseId: string; union: UnionRecord }[] {
    const list = this.allUnionsForPerson(personId);
    return list.map((u) => ({
      spouseId: u.husb === personId ? u.wife : u.husb,
      union: u,
    }));
  }

  /** Get person descriptor by xref; if missing, create an unknown person, register it, and return. */
  ensurePerson(xref: string): PersonDescriptor {
    let desc = this.people.get(xref);
    if (desc) return desc;
    const raw: DescendancyPerson = {
      id: xref,
      firstName: "Unknown",
      lastName: "",
      birthYear: null,
      deathYear: null,
      photoUrl: null,
    };
    desc = this.factory.createPersonNode(raw);
    this.people.set(desc.xref, desc);
    this.nodes.set(desc.xref, desc);
    return desc;
  }

  /** Create a person node/descriptor via the builder's factory. Does not register in the builder. */
  makePersonNode(
    person: DescendancyPerson,
    options?: PersonNodeOptions,
    children?: ChartNode[]
  ): PersonDescriptor {
    return this.factory.createPersonNode(person, options ?? {}, children ?? []);
  }

  /** Create a union node/descriptor via the builder's factory. Does not register in the builder. */
  makeUnionNode(
    data: UnionNodeCreateData,
    options?: UnionNodeOptions,
    type?: UnionNodeType
  ): UnionDescriptor {
    return this.factory.createUnionNode(data, options ?? {}, type ?? "normal");
  }

  constructor(
    input: FamilyTreeBuilderInput,
    factory?: FamilyTreeNodeFactory
  ) {
    this.factory = factory ?? new FamilyTreeNodeFactory();
    this.registerDefaultStrategies();
    this.deriveSets(input);
  }

  private registerDefaultStrategies(): void {
    this.viewStrategies.set("descendancy", descendancyDescriptor);
  }

  /**
   * Builds people, unions, nodes, and unionsPerPerson from input; then syncs
   * global tree data so existing build/strategy code can run.
   */
  private deriveSets(input: FamilyTreeBuilderInput): void {
    const { people: peopleList, unions: unionsList } = input;

    for (const person of peopleList) {
      const desc = this.factory.createPersonNode(person);
      this.people.set(desc.xref, desc);
      this.nodes.set(desc.xref, desc);
    }

    for (const union of unionsList) {
      const leftDesc = this.ensurePerson(union.husb);
      const rightDesc = this.ensurePerson(union.wife);
      const unionId = union.id ?? `${union.husb}-${union.wife}`;
      const unionDesc = this.factory.createUnionNode(
        {
          left: leftDesc.node,
          right: rightDesc.node,
          principalId: union.husb,
        },
        { sourceId: unionId },
        "normal"
      );
      this.unions.set(unionDesc.xref, unionDesc);
      this.nodes.set(unionDesc.xref, unionDesc);
    }

    for (const union of unionsList) {
      const unionId = union.id ?? `${union.husb}-${union.wife}`;
      this.unionById.set(unionId, union);
      for (const xref of [union.husb, union.wife]) {
        let entry = this.unionsPerPerson.get(xref);
        if (!entry) {
          entry = { spouses: [], asChild: [] };
          this.unionsPerPerson.set(xref, entry);
        }
        if (!entry.spouses.includes(union)) entry.spouses.push(union);
      }
      for (const child of union.children) {
        let entry = this.unionsPerPerson.get(child.id);
        if (!entry) {
          entry = { spouses: [], asChild: [] };
          this.unionsPerPerson.set(child.id, entry);
        }
        if (!entry.asChild.includes(union)) entry.asChild.push(union);
        if (!this.birthUnionByChild.has(child.id)) this.birthUnionByChild.set(child.id, union);
      }
    }
    for (const union of unionsList) {
      for (const child of union.children) {
        if (child.pedi === "birth") this.birthUnionByChild.set(child.id, union);
      }
    }

    // Populate descriptor.relations so they match unionsPerPerson (canonical graph).
    for (const [xref, desc] of this.people) {
      const entry = this.unionsPerPerson.get(xref);
      if (entry) {
        desc.relations.unions = entry.spouses
          .map((u) => this.unions.get(u.id ?? `${u.husb}-${u.wife}`)?.node)
          .filter((n): n is ChartNode => n != null);
        desc.relations.childOf = entry.asChild
          .map((u) => this.unions.get(u.id ?? `${u.husb}-${u.wife}`)?.node)
          .filter((n): n is ChartNode => n != null);
      }
    }
    for (const union of unionsList) {
      const unionId = union.id ?? `${union.husb}-${union.wife}`;
      const unionDesc = this.unions.get(unionId);
      if (unionDesc) {
        const leftNode = this.people.get(union.husb)?.node;
        const rightNode = this.people.get(union.wife)?.node;
        unionDesc.relations.spouses = [leftNode, rightNode].filter(
          (n): n is NonNullable<typeof n> => n != null
        ) as ChartNode[];
        unionDesc.relations.children = union.children
          .map((c) => this.people.get(c.id)?.node)
          .filter((n): n is NonNullable<typeof n> => n != null) as ChartNode[];
      }
    }
  }

  /**
   * Builds the tree from rootId using the current view strategy and options.
   * Uses the existing buildTree after deriveSets has synced global state.
   */
  buildTree(rootId: string, options: FamilyTreeBuildOptions = {}): BuildTreeResult {
    const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    const descriptor = this.getCurrentStrategy();
    if (!descriptor) {
      throw new Error(`Unknown view strategy: ${this.currentStrategyName}`);
    }
    const viewStrategy = descriptor.createBuildStrategy({
      viewState: options.viewState,
      maxDepth,
    });
    return buildTreeCore(rootId, viewStrategy, {
      maxDepth,
      getHiddenCount: descriptor.getHiddenCount,
    });
  }

  /**
   * Main entry point: optionally set current strategy by name, then build the tree.
   */
  buildView(
    rootId: string,
    viewState: ViewState = {},
    maxDepth: number = DEFAULT_MAX_DEPTH,
    strategyName?: string
  ): BuildTreeResult {
    if (strategyName != null) this.currentStrategyName = strategyName;
    return this.buildTree(rootId, { viewState, maxDepth });
  }
}
