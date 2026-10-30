/**
 * What useChartViewFetch asks the app for, and what the app answers. The engine builds no
 * URLs: the Gonsalves app maps a request to its /api/tree/* routes; a standalone viewer can
 * answer from memory.
 */

import type { ChartViewStrategyName } from "../chartView/chartViewStrategyName";
import type { GraphInput } from "../graph";
import type { SiblingView } from "../types";

export interface ChartGraphRequest {
  strategy: ChartViewStrategyName;
  rootId: string;
  /** Generations wanted (descendants, or ancestors for the pedigree charts). */
  depth: number;
  /** Descendancy: load the "parents & siblings" view of this person instead. */
  siblingViewPersonId?: string | null;
  /** Ancestor charts: the root's chosen parent family (`@F…@`). */
  pedigreeFamcFamilyXref?: string | null;
  /** Ancestor charts: chosen parent family per ancestor (person id → family id). */
  pedigreeFamcOverrides?: Readonly<Record<string, string>> | null;
  /** Aborted when a newer request replaces this one or the chart unmounts. */
  signal: AbortSignal;
}

export interface ChartGraphResponse extends GraphInput {
  /** The root the answer is built around (defaults to the requested root). */
  rootId?: string;
  /** Sibling-view meta, when the request had siblingViewPersonId. */
  siblingView?: SiblingView;
  /** People who are a child in more than one family (for the "Choose parent family" button). */
  multiFamilyChildXrefs?: string[];
}

export type FetchChartGraph = (request: ChartGraphRequest) => Promise<ChartGraphResponse>;
