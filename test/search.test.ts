// @vitest-environment jsdom
/**
 * Step 6: search gets paging and years. searchPeople runs over the whole file in memory (the
 * viewer); useChartSearch passes years and paging through from whichever search it is given.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { act } from "react";
import { renderHook } from "./helpers/renderHook";
import { graphOf, person, union } from "./helpers/graph";
import {
  searchPeople,
  createGraphIndividualsSearch,
  useChartSearch,
  type UseTreeIndividualsFn,
  type UseTreeIndividualsReturn,
} from "../src";

const file = () =>
  graphOf({
    people: [
      person("@I1@", "Mary Ann", "Smith", { birthYear: 1850, deathYear: 1921 }),
      person("@I2@", "John", "Smith", { birthYear: 1848, deathYear: 1900 }),
      person("@I3@", "Mary", "Jones", { birthYear: 1900 }),
      person("@I4@", "Anne", "Marsh", { birthYear: 1921 }),
      ...Array.from({ length: 25 }, (_, i) => person(`@S${i}@`, `Sam${String(i).padStart(2, "0")}`, "Smith", { birthYear: 1900 + i })),
    ],
    unions: [union("@F1@", "", "@I1@", [])], // adds an unknown-father placeholder, never a search hit
  });

const ids = (r: { results: { id: string }[] }) => r.results.map((p) => p.id);

describe("searchPeople", () => {
  it("matches the start of any name word, ignoring case", () => {
    expect(ids(searchPeople(file(), "mar"))).toEqual(["@I3@", "@I4@", "@I1@"]); // Jones, Marsh, Smith
    expect(ids(searchPeople(file(), "ann smi"))).toEqual(["@I1@"]);
  });

  it("matches a 4-digit year against birth or death year", () => {
    // Anne Marsh (born 1921), Mary Ann Smith (died 1921), Sam21 Smith (born 1900 + 21)
    expect(ids(searchPeople(file(), "1921"))).toEqual(["@I4@", "@I1@", "@S21@"]);
    expect(ids(searchPeople(file(), "mary 1900"))).toEqual(["@I3@"]);
  });

  it("returns people with their years, sorted by surname, given name, birth year", () => {
    const r = searchPeople(file(), "smith", { limit: 3 });
    expect(r.results.map((p) => [p.firstName, p.birthYear])).toEqual([
      ["John", 1848],
      ["Mary Ann", 1850],
      ["Sam00", 1900],
    ]);
  });

  it("pages 10 at a time by default", () => {
    const first = searchPeople(file(), "smith");
    expect(first.results).toHaveLength(10);
    expect(first).toMatchObject({ total: 27, hasMore: true, nextOffset: 10 });
    const last = searchPeople(file(), "smith", { offset: 20 });
    expect(last.results).toHaveLength(7);
    expect(last).toMatchObject({ hasMore: false, nextOffset: null });
  });

  it("finds nothing for an empty query or an unknown-partner placeholder", () => {
    expect(searchPeople(file(), "  ").total).toBe(0);
    expect(searchPeople(file(), "unknown").total).toBe(0);
  });
});

describe("useChartSearch", () => {
  afterEach(() => vi.useRealTimers());

  async function typeAndWait(h: { current: ReturnType<typeof useChartSearch> }, given: string, last = "") {
    await act(async () => {
      h.current.setSearchGivenName(given);
      h.current.setSearchLastName(last);
    });
    await act(async () => {
      vi.advanceTimersByTime(350); // past the 300 ms debounce
    });
  }

  it("keeps the years and the paging of the search it is given", async () => {
    vi.useFakeTimers();
    const fetchNextPage = vi.fn();
    const serverSearch: UseTreeIndividualsFn = ({ enabled }): UseTreeIndividualsReturn => ({
      data: enabled ? [{ xref: "@I1@", names: { givenNames: ["Mary", "Ann"], lastName: "Smith" }, birthYear: 1850, deathYear: 1921 }] : undefined,
      isFetching: false,
      hasNextPage: true,
      fetchNextPage,
      isFetchingNextPage: false,
    });
    const h = await renderHook(() => useChartSearch({ useTreeIndividuals: serverSearch }), undefined);
    await typeAndWait(h, "mary");
    expect(h.current.searchResults).toEqual([
      { id: "@I1@", firstName: "Mary Ann", lastName: "Smith", birthYear: 1850, deathYear: 1921 },
    ]);
    expect(h.current.searchHasMore).toBe(true);
    h.current.fetchNextPage();
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    await h.unmount();
  });

  it("searches the whole file in memory, 10 at a time, with Show more", async () => {
    vi.useFakeTimers();
    const graph = file();
    const h = await renderHook(() => useChartSearch({ useTreeIndividuals: createGraphIndividualsSearch(graph) }), undefined);
    await typeAndWait(h, "", "smith");
    expect(h.current.searchResults).toHaveLength(10);
    expect(h.current.searchResults[0]).toMatchObject({ firstName: "John", birthYear: 1848, deathYear: 1900 });
    expect(h.current.searchHasMore).toBe(true);
    await act(async () => h.current.fetchNextPage());
    expect(h.current.searchResults).toHaveLength(20);
    await act(async () => h.current.fetchNextPage());
    expect(h.current.searchResults).toHaveLength(27);
    expect(h.current.searchHasMore).toBe(false);
    await typeAndWait(h, "mary", "1900");
    expect(h.current.searchResults.map((p) => p.id)).toEqual(["@I3@"]);
    await h.unmount();
  });
});
