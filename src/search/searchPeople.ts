/**
 * In-memory person search over the whole file (step 6: paging and years), for a viewer with no
 * search server. Name words match by prefix, ignoring case; a 4-digit word matches the birth
 * or the death year. Results are sorted by surname, given name, birth year, and paged (10 at a
 * time by default: lists show at most 10 at once).
 */

import type { GraphSnapshot } from "../graph";
import type { DescendancyPerson } from "../types";

export interface SearchPeopleOptions {
  offset?: number;
  /** Page size. Default 10. */
  limit?: number;
}

export interface SearchPeopleResult {
  results: DescendancyPerson[];
  /** All matches, across pages. */
  total: number;
  hasMore: boolean;
  /** Offset of the next page, or null on the last one. */
  nextOffset: number | null;
}

interface Entry {
  person: DescendancyPerson;
  words: string[];
}

const indexCache = new WeakMap<GraphSnapshot, Entry[]>();

function lower(s: string): string {
  return s.toLocaleLowerCase();
}

/** People that can be found (no unknown-partner placeholders), with lower-case name words, sorted. */
function indexOf(graph: GraphSnapshot): Entry[] {
  let entries = indexCache.get(graph);
  if (entries) return entries;
  const compare = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" });
  entries = [...graph.people.values()]
    .filter((p) => p._unknownPlaceholder !== true)
    .map((person) => ({
      person,
      words: lower(`${person.firstName ?? ""} ${person.lastName ?? ""}`).split(/[\s-]+/).filter(Boolean),
    }))
    .sort(
      (a, b) =>
        compare(a.person.lastName ?? "", b.person.lastName ?? "") ||
        compare(a.person.firstName ?? "", b.person.firstName ?? "") ||
        (a.person.birthYear ?? Infinity) - (b.person.birthYear ?? Infinity) ||
        (a.person.id < b.person.id ? -1 : a.person.id > b.person.id ? 1 : 0)
    );
  indexCache.set(graph, entries);
  return entries;
}

export function searchPeople(graph: GraphSnapshot, query: string, options: SearchPeopleOptions = {}): SearchPeopleResult {
  const offset = Math.max(0, Math.floor(options.offset ?? 0));
  const limit = Math.max(1, Math.floor(options.limit ?? 10));
  const tokens = lower(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { results: [], total: 0, hasMore: false, nextOffset: null };

  const years = tokens.filter((t) => /^\d{4}$/.test(t)).map(Number);
  const names = tokens.filter((t) => !/^\d{4}$/.test(t));
  const matches = indexOf(graph).filter(
    ({ person, words }) =>
      names.every((t) => words.some((w) => w.startsWith(t))) &&
      years.every((y) => person.birthYear === y || person.deathYear === y)
  );
  const page = matches.slice(offset, offset + limit).map((e) => e.person);
  const end = offset + page.length;
  return { results: page, total: matches.length, hasMore: end < matches.length, nextOffset: end < matches.length ? end : null };
}
