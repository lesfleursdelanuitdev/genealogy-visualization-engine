"use client";

import { useMemo, useState, useEffect } from "react";
import type { DescendancyPerson } from "../types";

const DEBOUNCE_MS = 300;

export interface IndividualSearchResult {
  xref: string;
  names: { givenNames: string[]; lastName?: string | null };
}

export interface UseTreeIndividualsOptions {
  givenName?: string;
  lastName?: string;
  enabled?: boolean;
}

export interface UseTreeIndividualsReturn {
  data: IndividualSearchResult[] | undefined;
  isFetching: boolean;
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
  const { data: individualsList, isFetching: isSearchFetching } = useTreeIndividuals({
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
      birthYear: null,
      deathYear: null,
    }));
  }, [hasSearchCriteria, individualsList]);

  const searchPendingDebounce =
    trimmedGiven !== debouncedGivenName || trimmedLast !== debouncedLastName;
  const searchLoading = isSearchFetching || searchPendingDebounce;

  return {
    searchGivenName,
    setSearchGivenName,
    searchLastName,
    setSearchLastName,
    searchResults,
    searchLoading,
    searchHasMore: false,
    isSearchFetchingMore: false,
    fetchNextPage: () => {},
  };
}
