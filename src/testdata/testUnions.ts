/**
 * Static test/demo unions and derived indexes for the descendancy chart.
 * Used when no API data is set (fallback in treeData getters).
 */

import type { UnionRecord } from "../types";

/** All unions in data order. Each has an id for linked-union connector lookup. */
export const UNIONS: UnionRecord[] = [
  { id: "u-john-mary", husb: "john", wife: "mary", children: [{ id: "robert", pedi: "birth" }, { id: "patricia", pedi: "birth" }, { id: "thomas", pedi: "birth" }] },
  { id: "u-robert-susan", husb: "robert", wife: "susan", children: [{ id: "james", pedi: "birth" }, { id: "lisa", pedi: "birth" }] },
  { id: "u-robert-margaret", husb: "robert", wife: "margaret", children: [{ id: "diana", pedi: "birth" }] },
  { id: "u-robert-linda", husb: "robert", wife: "linda", children: [{ id: "peter", pedi: "birth" }, { id: "claire", pedi: "birth" }, { id: "sam", pedi: "birth" }, { id: "diana", pedi: "adopted" }] },
  { id: "u-robert-unknown1", husb: "robert", wife: "unknown1", children: [{ id: "alex", pedi: "birth" }] },
  { id: "u-thomas-carol", husb: "thomas", wife: "carol", children: [{ id: "anna", pedi: "birth" }, { id: "henry", pedi: "birth" }] },
  { id: "u-thomas-rachel", husb: "thomas", wife: "rachel", children: [{ id: "sophie2", pedi: "birth" }, { id: "ben", pedi: "birth" }] },
  { id: "u-unknown_patricia-patricia", husb: "unknown_patricia", wife: "patricia", children: [{ id: "michael", pedi: "birth" }] },
  { id: "u-james-nina", husb: "james", wife: "nina", children: [{ id: "leo", pedi: "birth" }, { id: "mia", pedi: "birth" }] },
  { id: "u-unknown_anna-anna", husb: "unknown_anna", wife: "anna", children: [{ id: "finn", pedi: "birth" }, { id: "isla", pedi: "birth" }] },
  { id: "u-oliver-priya", husb: "oliver", wife: "priya", children: [{ id: "zara", pedi: "birth" }] },
  { id: "u-kai-diana", husb: "kai", wife: "diana", children: [] },
  { id: "u-peter-jade", husb: "peter", wife: "jade", children: [{ id: "noah", pedi: "birth" }] },
  { id: "u-unknown_lisa-lisa", husb: "unknown_lisa", wife: "lisa", children: [{ id: "oliver", pedi: "birth" }, { id: "sophie", pedi: "birth" }, { id: "ethan", pedi: "birth" }, { id: "grace", pedi: "birth" }, { id: "lucas", pedi: "birth" }] },
];

/** Precomputed: all child ids per person (husb and wife side). */
export const ALL_CHILDREN_OF: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {};
  for (const u of UNIONS) {
    for (const side of [u.husb, u.wife]) {
      if (!out[side]) out[side] = [];
      for (const c of u.children) {
        if (!out[side].includes(c.id)) out[side].push(c.id);
      }
    }
  }
  return out;
})();

/** Precomputed: unions indexed by husb (for "unions of person" via husb or wife). */
export const UNIONS_OF: Record<string, UnionRecord[]> = (() => {
  const out: Record<string, UnionRecord[]> = {};
  for (const u of UNIONS) {
    if (!out[u.husb]) out[u.husb] = [];
    out[u.husb].push(u);
  }
  return out;
})();

/** All unions where this person is husband or wife. O(1) lookup. */
export const UNIONS_BY_PERSON: Map<string, UnionRecord[]> = (() => {
  const m = new Map<string, UnionRecord[]>();
  for (const u of UNIONS) {
    for (const pid of [u.husb, u.wife]) {
      const list = m.get(pid) ?? [];
      list.push(u);
      m.set(pid, list);
    }
  }
  return m;
})();

/** Union by stable id (u.id ?? `${husb}-${wife}`). O(1) lookup. */
export const UNION_BY_ID: Map<string, UnionRecord> = (() => {
  const m = new Map<string, UnionRecord>();
  for (const u of UNIONS) {
    const id = u.id ?? `${u.husb}-${u.wife}`;
    m.set(id, u);
  }
  return m;
})();

/** Unions in which this person appears as a child. O(1) lookup. */
export const PARENT_UNIONS_BY_CHILD: Map<string, UnionRecord[]> = (() => {
  const m = new Map<string, UnionRecord[]>();
  for (const u of UNIONS) {
    for (const c of u.children) {
      const list = m.get(c.id) ?? [];
      list.push(u);
      m.set(c.id, list);
    }
  }
  return m;
})();

/** Primary (birth) union for each child: union where child has pedi "birth", or first union. O(1) lookup. */
export const BIRTH_UNION_BY_CHILD: Map<string, UnionRecord> = (() => {
  const m = new Map<string, UnionRecord>();
  for (const u of UNIONS) {
    for (const c of u.children) {
      if (m.has(c.id)) continue;
      m.set(c.id, u);
    }
  }
  for (const u of UNIONS) {
    for (const c of u.children) {
      if (c.pedi === "birth") m.set(c.id, u);
    }
  }
  return m;
})();
