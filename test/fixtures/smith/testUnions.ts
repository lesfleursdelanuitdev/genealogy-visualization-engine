/**
 * Static test/demo unions for the fictional Smith family (tests and demos only).
 */

import type { UnionRecord } from "../../../src/types";

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
