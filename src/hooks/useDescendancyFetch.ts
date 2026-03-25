"use client";

import { useState, useEffect, useRef } from "react";
import { clearCurrentBuilder, setCurrentBuilder, FamilyTreeBuilder } from "../builder";
import { clearDescendantCountCache } from "../strategies/descendancy";
import { DEFAULT_MAX_DEPTH } from "../constants";
import type { DescendancyPerson } from "../types";
import type { SiblingView } from "../types";

interface ApiPerson {
  id: string;
  uuid?: string | null;
  firstName?: string;
  lastName?: string;
  birthYear?: number | null;
  deathYear?: number | null;
  gender?: string | null;
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
}

const DEBUG_BUILDER = process.env.NEXT_PUBLIC_DEBUG_DESCENDANCY === "true";

function normalizeRootXref(xref: string): string {
  const s = xref.trim();
  return s.startsWith("@") ? s : `@${s}@`;
}

export function useDescendancyFetch(
  rootId: string,
  maxDepth: number = DEFAULT_MAX_DEPTH,
  /** When set (e.g. viewState.siblingView.personId), fetch sibling-view API instead of descendancy. */
  siblingViewPersonId?: string | null,
  /** Called when sibling-view API returns; use to merge siblingView into state (e.g. dispatch SET_SIBLING_VIEW_FROM_API). */
  onSiblingViewMeta?: ((siblingView: SiblingView) => void) | null
) {
  const [lastApiRootId, setLastApiRootId] = useState<string | null>(null);
  const [isDescendancyLoading, setIsDescendancyLoading] = useState(true);
  const [descendancyDataKey, setDescendancyDataKey] = useState(0);
  const [builder, setBuilder] = useState<FamilyTreeBuilder | null>(null);
  const onSiblingViewMetaRef = useRef(onSiblingViewMeta);
  onSiblingViewMetaRef.current = onSiblingViewMeta;

  // Single dependency so array length never changes (React requires constant dependency array size).
  const fetchKey = `${rootId}\n${maxDepth}\n${siblingViewPersonId ?? ""}`;

  useEffect(() => {
    const useSiblingView = Boolean(siblingViewPersonId?.trim());
    console.log("[Show children / Refetch] useDescendancyFetch effect ran — refetch triggered", {
      rootId,
      maxDepth,
      siblingViewPersonId: siblingViewPersonId ?? undefined,
      useSiblingView,
    });
    if (DEBUG_BUILDER) console.log("[FamilyTreeBuilder] Fetch started, clearing builder");
    clearCurrentBuilder();
    clearDescendantCountCache();
    setBuilder(null);
    const tid = setTimeout(() => {
      setLastApiRootId(null);
      setIsDescendancyLoading(true);
    }, 0);
    const url = useSiblingView
      ? `/api/tree/sibling-view?person=${encodeURIComponent(normalizeRootXref(siblingViewPersonId!))}&depth=${maxDepth}`
      : `/api/tree/descendancy?root=${encodeURIComponent(normalizeRootXref(rootId))}&depth=${maxDepth}`;
    const routeLabel = useSiblingView ? "sibling-view" : "descendancy";
    console.log(`[Tree API] Calling route: ${routeLabel}`, url);

    fetch(url)
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error(`${res.status} ${res.statusText}`))
      )
      .then((data: ApiResponse) => {
        console.log("[Tree API] Response from endpoint (inspect below):", data);
        if (useSiblingView && data.siblingView) {
          onSiblingViewMetaRef.current?.(data.siblingView);
        }
        const people = new Map<string, DescendancyPerson>();
        for (const p of data.people) {
          people.set(p.id, {
            id: p.id,
            xref: p.id,
            uuid: p.uuid ?? null,
            firstName: p.firstName ?? "",
            lastName: p.lastName ?? "",
            birthYear: p.birthYear ?? null,
            deathYear: p.deathYear ?? null,
            photoUrl: null,
            gender: p.gender ?? null,
          });
        }
        const unions = data.unions.map((u) => ({
          id: u.id,
          husb: u.husb,
          wife: u.wife,
          children: u.children.map((c) => ({ id: c.id, pedi: c.pedi || "birth" })),
        }));
        const peopleList = Array.from(people.values());
        const treeBuilder = new FamilyTreeBuilder({ people: peopleList, unions });
        if (DEBUG_BUILDER) {
          console.log("[FamilyTreeBuilder] Created builder", {
            peopleCount: peopleList.length,
            unionsCount: unions.length,
            rootId: data.rootId,
          });
        }
        setBuilder(treeBuilder);
        setCurrentBuilder(treeBuilder);
        setLastApiRootId(data.rootId);
        clearDescendantCountCache();
        setDescendancyDataKey((k) => k + 1);
        setIsDescendancyLoading(false);
      })
      .catch((err) => {
        console.warn(
          "[Descendancy] API request failed:",
          err instanceof Error ? err.message : err
        );
        if (DEBUG_BUILDER) console.log("[FamilyTreeBuilder] Cleared builder (fetch failed)");
        setBuilder(null);
        clearCurrentBuilder();
        setLastApiRootId(null);
        clearDescendantCountCache();
        setDescendancyDataKey((k) => k + 1);
        setIsDescendancyLoading(false);
      });
    return () => clearTimeout(tid);
  }, [fetchKey]);

  return {
    lastApiRootId,
    isDescendancyLoading,
    descendancyDataKey,
    builder,
  };
}
