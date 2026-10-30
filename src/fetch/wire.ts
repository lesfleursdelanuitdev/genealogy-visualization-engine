/**
 * The Gonsalves /api/tree/{descendancy,pedigree,sibling-view} wire format.
 *
 * Kept so the Gonsalves app can keep its routes: it fetches, then calls
 * parseChartApiResponse(json) and hands the result to useChartViewFetch or
 * createChartSession. The engine itself fetches nothing.
 */

import type { DescendancyPerson, SiblingView, UnionRecord } from "../types";
import type { ChartGraphResponse } from "./types";

/** A person as the Gonsalves routes send it (extra fields are ignored). */
export interface ApiPerson {
  id: string;
  uuid?: string | null;
  firstName?: string;
  lastName?: string;
  birthYear?: number | null;
  deathYear?: number | null;
  /** Full display strings (`mapIndividualRow`); never truncated. */
  birthPlace?: string | null;
  deathPlace?: string | null;
  gender?: string | null;
  photoUrl?: string | null;
  isLiving?: boolean;
  [k: string]: unknown;
}

export interface ApiUnion {
  id?: string;
  husb: string;
  wife: string;
  children: Array<{ id: string; pedi: string }>;
}

export interface ApiChartResponse {
  rootId: string;
  people: ApiPerson[];
  unions: ApiUnion[];
  siblingView?: SiblingView;
  /** Pedigree route: people in the payload who are a child in more than one family. */
  multiFamilyChildXrefs?: string[];
}

/** The response does not have the shape of a Gonsalves chart response. */
export class ChartApiFormatError extends Error {
  constructor(message: string) {
    super(`Chart API response: ${message}`);
    this.name = "ChartApiFormatError";
  }
}

type Rec = Record<string, unknown>;

function isRecord(v: unknown): v is Rec {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function yearOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Trimmed text, or null when empty or not a string. */
function textOrNull(v: unknown): string | null {
  return typeof v === "string" ? v.trim() || null : null;
}

function strings(v: unknown, what: string): string[] {
  if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) {
    throw new ChartApiFormatError(`${what} must be a list of strings`);
  }
  return v;
}

function parsePerson(raw: unknown, i: number): DescendancyPerson {
  if (!isRecord(raw)) throw new ChartApiFormatError(`people[${i}] is not an object`);
  const id = str(raw.id);
  if (!id) throw new ChartApiFormatError(`people[${i}] has no id`);
  return {
    id,
    xref: id,
    uuid: str(raw.uuid) ?? null,
    firstName: str(raw.firstName) ?? "",
    lastName: str(raw.lastName) ?? "",
    birthYear: yearOrNull(raw.birthYear),
    deathYear: yearOrNull(raw.deathYear),
    birthPlace: textOrNull(raw.birthPlace),
    deathPlace: textOrNull(raw.deathPlace),
    photoUrl: textOrNull(raw.photoUrl),
    gender: str(raw.gender) ?? null,
    // Missing means living (spec Part 1, step 5); only an explicit false is dead.
    isLiving: raw.isLiving !== false,
  };
}

function parseUnion(raw: unknown, i: number): UnionRecord {
  if (!isRecord(raw)) throw new ChartApiFormatError(`unions[${i}] is not an object`);
  const husb = str(raw.husb);
  const wife = str(raw.wife);
  if (husb === undefined || wife === undefined) {
    throw new ChartApiFormatError(`unions[${i}] needs husb and wife (use "" when unknown)`);
  }
  if (!Array.isArray(raw.children)) throw new ChartApiFormatError(`unions[${i}].children is not a list`);
  const children = raw.children.map((c, j) => {
    const id = isRecord(c) ? str(c.id) : undefined;
    if (!id) throw new ChartApiFormatError(`unions[${i}].children[${j}] has no id`);
    return { id, pedi: (isRecord(c) && str(c.pedi)) || "birth" };
  });
  const id = str(raw.id);
  return id !== undefined ? { id, husb, wife, children } : { husb, wife, children };
}

function parseSiblingView(raw: unknown): SiblingView {
  if (!isRecord(raw) || !str(raw.personId)) throw new ChartApiFormatError("siblingView needs a personId");
  const optionalXref = (v: unknown) => (typeof v === "string" ? v : null);
  return {
    personId: str(raw.personId)!,
    spouseCatchAlls: strings(raw.spouseCatchAlls ?? [], "siblingView.spouseCatchAlls"),
    adoptiveUnions: strings(raw.adoptiveUnions ?? [], "siblingView.adoptiveUnions"),
    adoptiveCatchAlls: strings(raw.adoptiveCatchAlls ?? [], "siblingView.adoptiveCatchAlls"),
    birthFatherPersonId: optionalXref(raw.birthFatherPersonId),
    birthMotherPersonId: optionalXref(raw.birthMotherPersonId),
  };
}

/** Parse a Gonsalves chart response (descendancy, pedigree or sibling-view route). */
export function parseChartApiResponse(json: unknown): ChartGraphResponse {
  if (!isRecord(json)) throw new ChartApiFormatError("not an object");
  if (!Array.isArray(json.people)) throw new ChartApiFormatError("people is not a list");
  if (!Array.isArray(json.unions)) throw new ChartApiFormatError("unions is not a list");
  const out: ChartGraphResponse = {
    people: json.people.map(parsePerson),
    unions: json.unions.map(parseUnion),
  };
  const rootId = str(json.rootId);
  if (rootId) out.rootId = rootId;
  if (json.siblingView != null) out.siblingView = parseSiblingView(json.siblingView);
  if (json.multiFamilyChildXrefs != null) {
    out.multiFamilyChildXrefs = strings(json.multiFamilyChildXrefs, "multiFamilyChildXrefs");
  }
  return out;
}
