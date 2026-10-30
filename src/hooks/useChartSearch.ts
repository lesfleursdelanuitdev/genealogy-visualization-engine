"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import type { DescendancyPerson } from "../types";
import type { GraphSnapshot } from "../graph";
import { searchPeople } from "../search/searchPeople";

const DEBOUNCE_MS = 300;

export interface IndividualSearchResult {
  xref: string;
  names: { givenNames: string[]; lastName?: string | null };
  /** Shown next to the name (step 6). */
  birthYear?: number | null;
  deathYear?: number | null;
}

export interface UseTreeIndividualsOptions {
  givenName?: string;
  lastName?: string;
  enabled?: boolean;
}

export interface UseTreeIndividualsReturn {
  /** All results loaded so far (every page). */
  data: IndividualSearchResult[] | undefined;
  isFetching: boolean;
  /** Paging (step 6): more results exist, load them, and whether a page is loading. */
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
}

export type UseTreeIndividualsFn = (
  options: UseTreeIndividualsOptions
) => UseTreeIndividualsReturn;

export interface UseChartSearchOptions {
  useTreeIndividuals: UseTreeIndividualsFn;
}

export function useChartSearch({ useTreeIndividuals }: UseChartSearchOptions) {
  const [searchGivenName, setSearchGivenName] = useState("");
  const [searchLastName, setSearchLastName] = useState("");
  const [debouncedGivenName, setDebouncedGivenName] = useState("");
  const [debouncedLastName, setDebouncedLastName] = useState("");

  const trimmedGiven = searchGivenName.trim();
  const trimmedLast = searchLastName.trim();
  useEffect(() => {
    const t = setTimeout(() => setDebouncedGivenName(trimmedGiven), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [trimmedGiven]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedLastName(trimmedLast), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [trimmedLast]);

  const hasSearchCriteria =
    debouncedGivenName.length > 0 || debouncedLastName.length > 0;
  const {
    data: individualsList,
    isFetching: isSearchFetching,
    hasNextPage,
    fetchNextPage: fetchNext,
    isFetchingNextPage,
  } = useTreeIndividuals({
    givenName: debouncedGivenName,
    lastName: debouncedLastName,
    enabled: hasSearchCriteria,
  });

  const searchResults = useMemo((): DescendancyPerson[] => {
    if (!hasSearchCriteria || !individualsList) return [];
    return individualsList.map((r) => ({
      id: r.xref,
      firstName: r.names.givenNames.join(" ") || "",
      lastName: r.names.lastName ?? "",
      birthYear: r.birthYear ?? null,
      deathYear: r.deathYear ?? null,
    }));
  }, [hasSearchCriteria, individualsList]);

  const searchPendingDebounce =
    trimmedGiven !== debouncedGivenName || trimmedLast !== debouncedLastName;
  const searchLoading = isSearchFetching || searchPendingDebounce;

  const fetchNextRef = useRef(fetchNext);
  fetchNextRef.current = fetchNext;
  const fetchNextPage = useCallback(() => fetchNextRef.current?.(), []);

  return {
    searchGivenName,
    setSearchGivenName,
    searchLastName,
    setSearchLastName,
    searchResults,
    searchLoading,
    searchHasMore: hasSearchCriteria && hasNextPage === true,
    isSearchFetchingMore: isFetchingNextPage === true,
    fetchNextPage,
  };
}

/**
 * A `useTreeIndividuals` for useChartSearch that searches the whole file in memory with
 * searchPeople (names and years, `pageSize` per page). Make it once per graph (useMemo).
 */
export function createGraphIndividualsSearch(graph: GraphSnapshot, pageSize = 10): UseTreeIndividualsFn {
  return function useGraphIndividuals({ givenName = "", lastName = "", enabled = true }) {
    const query = `${givenName} ${lastName}`.trim();
    const [pages, setPages] = useState({ query, count: 1 });
    const count = pages.query === query ? pages.count : 1;
    const result = useMemo(
      () => (enabled && query ? searchPeople(graph, query, { limit: pageSize * count }) : null),
      [query, count, enabled]
    );
    const data = useMemo(
      () =>
        result?.results.map((p) => ({
          xref: p.id,
          names: { givenNames: p.firstName ? [p.firstName] : [], lastName: p.lastName },
          birthYear: p.birthYear ?? null,
          deathYear: p.deathYear ?? null,
        })),
      [result]
    );
    return {
      data,
      isFetching: false,
      hasNextPage: result?.hasMore ?? false,
      fetchNextPage: () => setPages({ query, count: count + 1 }),
      isFetchingNextPage: false,
    };
  };
}
