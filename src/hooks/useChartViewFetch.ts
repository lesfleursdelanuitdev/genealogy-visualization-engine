"use client";

import { useState, useEffect, useRef } from "react";
import { clearCurrentBuilder, setCurrentBuilder, FamilyTreeBuilder } from "../builder";
import { clearDescendantCountCache } from "../strategies/descendancy";
import { DEFAULT_MAX_DEPTH } from "../constants";
import type { DescendancyPerson } from "../types";
import type { SiblingView } from "../types";
import type { ChartViewStrategyName } from "../chartView/chartViewStrategyName";
import { DescendancyChartAdapter } from "../chartView/DescendancyChartAdapter";
import { PedigreeChartBuilder } from "../chartView/PedigreeChartBuilder";
import { VerticalPedigreeChartBuilder } from "../chartView/VerticalPedigreeChartBuilder";
import { FanChartBuilder } from "../chartView/FanChartBuilder";
import type { ChartViewBuildAdapter } from "../chartView/ChartViewBuildAdapter";

interface ApiPerson {
  id: string;
  uuid?: string | null;
  firstName?: string;
  lastName?: string;
  birthYear?: number | null;
  deathYear?: number | null;
  /** Full display strings from API (`mapIndividualRow`); do not truncate. */
  birthPlace?: string | null;
  deathPlace?: string | null;
  gender?: string | null;
  photoUrl?: string | null;
  [k: string]: unknown;
}

interface ApiUnion {
  id?: string;
  husb: string;
  wife: string;
  children: Array<{ id: string; pedi: string }>;
}

interface ApiResponse {
  rootId: string;
  people: ApiPerson[];
  unions: ApiUnion[];
  siblingView?: SiblingView;
  /** Pedigree API: individuals in this payload who appear as a child in more than one family. */
  multiFamilyChildXrefs?: string[];
}

const DEBUG_BUILDER = process.env.NEXT_PUBLIC_DEBUG_DESCENDANCY === "true";

function normalizeRootXref(xref: string): string {
  const s = xref.trim();
  return s.startsWith("@") ? s : `@${s}@`;
}

function stablePedigreeOverridesKey(overrides: Record<string, string> | null | undefined): string {
  if (overrides == null || Object.keys(overrides).length === 0) return "";
  const keys = Object.keys(overrides).sort();
  return keys.map((k) => `${k}\t${overrides[k]}`).join("\n");
}

function mapPeopleAndUnions(data: ApiResponse): {
  peopleList: DescendancyPerson[];
  unions: Array<{ id?: string; husb: string; wife: string; children: Array<{ id: string; pedi: string }> }>;
} {
  const people = new Map<string, DescendancyPerson>();
  for (const p of data.people) {
    const photo =
      typeof p.photoUrl === "string" ? (p.photoUrl.trim() || null) : null;
    const birthPlace =
      typeof p.birthPlace === "string" ? (p.birthPlace.trim() || null) : (p.birthPlace ?? null);
    const deathPlace =
      typeof p.deathPlace === "string" ? (p.deathPlace.trim() || null) : (p.deathPlace ?? null);
    people.set(p.id, {
      id: p.id,
      xref: p.id,
      uuid: p.uuid ?? null,
      firstName: p.firstName ?? "",
      lastName: p.lastName ?? "",
      birthYear: p.birthYear ?? null,
      deathYear: p.deathYear ?? null,
      birthPlace,
      deathPlace,
      photoUrl: photo,
      gender: p.gender ?? null,
    });
  }
  const unions = data.unions.map((u) => ({
    id: u.id,
    husb: u.husb,
    wife: u.wife,
    children: u.children.map((c) => ({ id: c.id, pedi: c.pedi || "birth" })),
  }));
  return { peopleList: Array.from(people.values()), unions };
}

export interface UseChartViewFetchResult {
  lastApiRootId: string | null;
  isChartLoading: boolean;
  chartDataKey: number;
  chartAdapter: ChartViewBuildAdapter | null;
  /** Pedigree API: xrefs of people in the chart who are a child in more than one family (for card actions). */
  pedigreeMultiFamilyChildXrefs: string[];
}

/**
 * Fetches tree snapshot for the active view strategy and exposes a {@link ChartViewBuildAdapter}.
 */
export function useChartViewFetch(
  strategyName: ChartViewStrategyName,
  rootId: string,
  maxDepth: number = DEFAULT_MAX_DEPTH,
  /** Descendancy only: sibling-view API when set. */
  siblingViewPersonId?: string | null,
  onSiblingViewMeta?: ((siblingView: SiblingView) => void) | null,
  /** Pedigree / vertical pedigree / fan: optional `@F…@` to anchor the root to one FAMC when they have multiple families as child. */
  pedigreeFamcFamilyXref?: string | null,
  /** Pedigree / vertical pedigree / fan: per-person FAMC choices for non-root ancestors (xref → family xref). */
  pedigreeFamcOverrides?: Record<string, string> | null
): UseChartViewFetchResult {
  const [lastApiRootId, setLastApiRootId] = useState<string | null>(null);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [chartDataKey, setChartDataKey] = useState(0);
  const [chartAdapter, setChartAdapter] = useState<ChartViewBuildAdapter | null>(null);
  const [pedigreeMultiFamilyChildXrefs, setPedigreeMultiFamilyChildXrefs] = useState<string[]>([]);
  const onSiblingViewMetaRef = useRef(onSiblingViewMeta);
  onSiblingViewMetaRef.current = onSiblingViewMeta;

  const overridesKey = stablePedigreeOverridesKey(pedigreeFamcOverrides ?? undefined);
  const fetchKey = `${strategyName}\n${rootId}\n${maxDepth}\n${siblingViewPersonId ?? ""}\n${pedigreeFamcFamilyXref ?? ""}\n${overridesKey}`;

  useEffect(() => {
    const useSiblingView =
      strategyName === "descendancy" && Boolean(siblingViewPersonId?.trim());
    if (DEBUG_BUILDER) console.log("[FamilyTreeBuilder] Fetch started, clearing builder");
    clearCurrentBuilder();
    clearDescendantCountCache();
    setChartAdapter(null);
    setPedigreeMultiFamilyChildXrefs([]);
    const tid = setTimeout(() => {
      setLastApiRootId(null);
      setIsChartLoading(true);
    }, 0);

    const usesPedigreeApi =
      strategyName === "pedigree" ||
      strategyName === "vertical_pedigree" ||
      strategyName === "fan_chart";
    const famc =
      usesPedigreeApi && pedigreeFamcFamilyXref != null && pedigreeFamcFamilyXref.trim() !== ""
        ? `&famc=${encodeURIComponent(normalizeRootXref(pedigreeFamcFamilyXref.trim()))}`
        : "";
    const ov = pedigreeFamcOverrides ?? {};
    const famcOverrides =
      usesPedigreeApi && Object.keys(ov).length > 0
        ? `&famcOverrides=${encodeURIComponent(JSON.stringify(ov))}`
        : "";
    const url =
      usesPedigreeApi
        ? `/api/tree/pedigree?root=${encodeURIComponent(normalizeRootXref(rootId))}&depth=${maxDepth}${famc}${famcOverrides}`
        : useSiblingView
          ? `/api/tree/sibling-view?person=${encodeURIComponent(normalizeRootXref(siblingViewPersonId!))}&depth=${maxDepth}`
          : `/api/tree/descendancy?root=${encodeURIComponent(normalizeRootXref(rootId))}&depth=${maxDepth}`;

    fetch(url)
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error(`${res.status} ${res.statusText}`))
      )
      .then((data: ApiResponse) => {
        if (useSiblingView && data.siblingView) {
          onSiblingViewMetaRef.current?.(data.siblingView);
        }
        const { peopleList, unions } = mapPeopleAndUnions(data);
        if (usesPedigreeApi) {
          setPedigreeMultiFamilyChildXrefs(data.multiFamilyChildXrefs ?? []);
        }
        const treeBuilder = new FamilyTreeBuilder({ people: peopleList, unions });
        const adapter: ChartViewBuildAdapter =
          strategyName === "pedigree"
            ? new PedigreeChartBuilder(treeBuilder)
            : strategyName === "vertical_pedigree"
              ? new VerticalPedigreeChartBuilder(treeBuilder)
              : strategyName === "fan_chart"
                ? new FanChartBuilder(treeBuilder)
              : new DescendancyChartAdapter(treeBuilder);
        setChartAdapter(adapter);
        setCurrentBuilder(treeBuilder);
        setLastApiRootId(data.rootId);
        clearDescendantCountCache();
        setChartDataKey((k) => k + 1);
        setIsChartLoading(false);
      })
      .catch((err) => {
        console.warn(
          `[Tree ${strategyName}] API request failed:`,
          err instanceof Error ? err.message : err
        );
        setChartAdapter(null);
        clearCurrentBuilder();
        setLastApiRootId(null);
        clearDescendantCountCache();
        setPedigreeMultiFamilyChildXrefs([]);
        setChartDataKey((k) => k + 1);
        setIsChartLoading(false);
      });
    return () => clearTimeout(tid);
  }, [fetchKey, strategyName]);

  return {
    lastApiRootId,
    isChartLoading,
    chartDataKey,
    chartAdapter,
    pedigreeMultiFamilyChildXrefs,
  };
}
