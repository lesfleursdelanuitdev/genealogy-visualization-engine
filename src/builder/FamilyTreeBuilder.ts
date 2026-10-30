/**
 * FamilyTreeBuilder: a GraphSnapshot plus the old getter API.
 *
 * All indexes now live in the snapshot (`builder.snapshot`), built once. The getters below
 * keep their old shapes (fresh Maps) for the remaining global-getter callers; they are
 * removed with the global builder in refactor phase 3.
 */

import type { DescendancyPerson } from "../types";
import type { UnionRecord, ViewState } from "../types";
import { buildTree as buildTreeCore, type BuildTreeResult } from "./build";
import type { ViewStrategyDescriptor } from "../strategies/ViewStrategyDescriptor";
import { descendancyDescriptor } from "../strategies/descendancy";
import { DEFAULT_MAX_DEPTH } from "../constants";
import { createGraphSnapshot, type GraphInput, type GraphSnapshot } from "../graph";

/** Options for buildTree / buildView (viewState and maxDepth passed to the strategy). */
export interface FamilyTreeBuildOptions {
  viewState?: ViewState;
  maxDepth?: number;
}

export type FamilyTreeBuilderInput = GraphInput;

export class FamilyTreeBuilder {
  readonly snapshot: GraphSnapshot;
  readonly viewStrategies = new Map<string, ViewStrategyDescriptor>([["descendancy", descendancyDescriptor]]);

  currentStrategyName = "descendancy";

  constructor(input: FamilyTreeBuilderInput) {
    this.snapshot = createGraphSnapshot(input);
  }

  /** Current view strategy descriptor (layout, connectors, build factory). */
  getCurrentStrategy(): ViewStrategyDescriptor | undefined {
    return this.viewStrategies.get(this.currentStrategyName);
  }

  getPerson(xref: string): DescendancyPerson | undefined {
    return this.snapshot.people.get(xref);
  }

  getUnion(xref: string): UnionRecord | undefined {
    return this.snapshot.unionById.get(xref);
  }

  allChildrenOfPerson(personXref: string): string[] {
    return [...this.snapshot.childrenOf(personXref)];
  }

  allUnionsForPerson(personXref: string): UnionRecord[] {
    return [...this.snapshot.unionsOf(personXref)];
  }

  getPeople(): Map<string, DescendancyPerson> {
    return new Map(this.snapshot.people);
  }

  getUnions(): UnionRecord[] {
    return [...this.snapshot.unionById.values()];
  }

  getUnionsByPerson(): Map<string, UnionRecord[]> {
    return copyListMap(this.snapshot.unionsByPerson);
  }

  getAllChildrenOf(personId: string): string[] {
    return this.allChildrenOfPerson(personId);
  }

  getParentUnionsByChild(): Map<string, UnionRecord[]> {
    return copyListMap(this.snapshot.parentUnionsByChild);
  }

  getUnionById(): Map<string, UnionRecord> {
    return new Map(this.snapshot.unionById);
  }

  getBirthUnionByChild(): Map<string, UnionRecord> {
    return new Map(this.snapshot.birthUnionByChild);
  }

  getSpousesOf(personId: string): { spouseId: string; union: UnionRecord }[] {
    return [...this.snapshot.spousesOf(personId)];
  }

  /** Builds the tree from rootId using the current view strategy and options. */
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
    const graph = this.snapshot;
    const getHiddenCount = descriptor.getHiddenCount;
    return buildTreeCore(rootId, viewStrategy, {
      graph,
      maxDepth,
      getHiddenCount: getHiddenCount ? (personId) => getHiddenCount(graph, personId) : undefined,
    });
  }

  /** Main entry point: optionally set current strategy by name, then build the tree. */
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

function copyListMap<V>(m: ReadonlyMap<string, readonly V[]>): Map<string, V[]> {
  const out = new Map<string, V[]>();
  for (const [k, v] of m) out.set(k, [...v]);
  return out;
}
