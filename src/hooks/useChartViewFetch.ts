"use client";

import { useState, useEffect, useRef } from "react";
import { createGraphSnapshot, type GraphSnapshot } from "../graph";
import { DEFAULT_MAX_DEPTH } from "../constants";
import type { SiblingView } from "../types";
import type { ChartViewStrategyName } from "../chartView/chartViewStrategyName";
import type { ChartViewBuildAdapter } from "../chartView/ChartViewBuildAdapter";
import { createChartAdapter } from "../chartView/createChartAdapter";
import type { FetchChartGraph } from "../fetch/types";
import {
  chartSwitchAdapterFromPayloadBegin,
  chartSwitchAdapterFromPayloadEnd,
  chartSwitchChartFetchBegin,
  chartSwitchChartFetchEnd,
} from "../debug/chartSwitchTiming";

export interface UseChartViewFetchOptions {
  /** Loads the graph for a request. The engine builds no URLs; see parseChartApiResponse for Gonsalves. */
  fetchGraph: FetchChartGraph;
  strategyName: ChartViewStrategyName;
  rootId: string;
  /** Generations to request. Default DEFAULT_MAX_DEPTH. */
  maxDepth?: number;
  /** Descendancy only: request the sibling view of this person. */
  siblingViewPersonId?: string | null;
  /** Called with the sibling-view meta when an answer carries it. */
  onSiblingViewMeta?: ((siblingView: SiblingView) => void) | null;
  /** Ancestor charts: the root's chosen parent family (`@F…@`). */
  pedigreeFamcFamilyXref?: string | null;
  /** Ancestor charts: chosen parent family per ancestor (person id → family id). */
  pedigreeFamcOverrides?: Readonly<Record<string, string>> | null;
}

export interface UseChartViewFetchResult {
  lastApiRootId: string | null;
  isChartLoading: boolean;
  /** Bumps on every finished request (data or error). */
  chartDataKey: number;
  chartAdapter: ChartViewBuildAdapter | null;
  /** The loaded people and unions (same object as `chartAdapter.graph`); bind the reducer to it. */
  graph: GraphSnapshot | null;
  /** The last request's failure, or null. */
  error: Error | null;
  /** People in the answer who are a child in more than one family (for card actions). */
  pedigreeMultiFamilyChildXrefs: string[];
}

function stablePedigreeOverridesKey(overrides: Readonly<Record<string, string>> | null | undefined): string {
  if (overrides == null) return "";
  const keys = Object.keys(overrides).sort();
  return keys.map((k) => `${k}\t${overrides[k]}`).join("\n");
}

const NO_XREFS: string[] = [];

/**
 * Loads the chart's graph through `fetchGraph` and exposes a {@link ChartViewBuildAdapter}.
 * Only the newest request counts: a request is aborted when the root, chart type, depth or
 * family choice changes, and an answer that arrives after that is ignored.
 */
export function useChartViewFetch({
  fetchGraph,
  strategyName,
  rootId,
  maxDepth = DEFAULT_MAX_DEPTH,
  siblingViewPersonId,
  onSiblingViewMeta,
  pedigreeFamcFamilyXref,
  pedigreeFamcOverrides,
}: UseChartViewFetchOptions): UseChartViewFetchResult {
  const [lastApiRootId, setLastApiRootId] = useState<string | null>(null);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [chartDataKey, setChartDataKey] = useState(0);
  const [chartAdapter, setChartAdapter] = useState<ChartViewBuildAdapter | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [pedigreeMultiFamilyChildXrefs, setPedigreeMultiFamilyChildXrefs] = useState<string[]>(NO_XREFS);

  // Latest callbacks without refetching when only their identity changes.
  const fetchGraphRef = useRef(fetchGraph);
  fetchGraphRef.current = fetchGraph;
  const onSiblingViewMetaRef = useRef(onSiblingViewMeta);
  onSiblingViewMetaRef.current = onSiblingViewMeta;
  const overridesRef = useRef(pedigreeFamcOverrides);
  overridesRef.current = pedigreeFamcOverrides;

  const overridesKey = stablePedigreeOverridesKey(pedigreeFamcOverrides);
  const siblingPerson = strategyName === "descendancy" ? siblingViewPersonId?.trim() || null : null;

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setChartAdapter(null);
    setError(null);
    setLastApiRootId(null);
    setPedigreeMultiFamilyChildXrefs(NO_XREFS);
    setIsChartLoading(true);

    let fetchTimerOpen = true;
    const endFetchTimer = () => {
      if (!fetchTimerOpen) return;
      fetchTimerOpen = false;
      chartSwitchChartFetchEnd();
    };
    chartSwitchChartFetchBegin();

    const overrides = overridesRef.current;
    let request: Promise<Awaited<ReturnType<FetchChartGraph>>>;
    try {
      request = fetchGraphRef.current({
        strategy: strategyName,
        rootId,
        depth: maxDepth,
        siblingViewPersonId: siblingPerson,
        pedigreeFamcFamilyXref: pedigreeFamcFamilyXref ?? null,
        pedigreeFamcOverrides: overrides && Object.keys(overrides).length > 0 ? overrides : null,
        signal: controller.signal,
      });
    } catch (e) {
      request = Promise.reject(e);
    }

    request.then(
      (answer) => {
        endFetchTimer();
        if (!current) return;
        if (siblingPerson && answer.siblingView) onSiblingViewMetaRef.current?.(answer.siblingView);
        chartSwitchAdapterFromPayloadBegin();
        try {
          const graph = createGraphSnapshot(answer);
          setChartAdapter(createChartAdapter(strategyName, graph));
          setPedigreeMultiFamilyChildXrefs(answer.multiFamilyChildXrefs ?? NO_XREFS);
          setLastApiRootId(answer.rootId ?? rootId);
        } finally {
          chartSwitchAdapterFromPayloadEnd();
        }
        setChartDataKey((k) => k + 1);
        setIsChartLoading(false);
      },
      (e: unknown) => {
        endFetchTimer();
        if (!current) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setChartDataKey((k) => k + 1);
        setIsChartLoading(false);
      }
    );

    return () => {
      current = false;
      controller.abort();
    };
    // overridesKey stands for pedigreeFamcOverrides (read through overridesRef).
  }, [strategyName, rootId, maxDepth, siblingPerson, pedigreeFamcFamilyXref, overridesKey]);

  return {
    lastApiRootId,
    isChartLoading,
    chartDataKey,
    chartAdapter,
    graph: chartAdapter?.graph ?? null,
    error,
    pedigreeMultiFamilyChildXrefs,
  };
}
