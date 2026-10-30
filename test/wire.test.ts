/**
 * Parser for the Gonsalves /api/tree/* wire format (ApiPerson / ApiUnion), exported so the
 * app keeps its routes and hands the parsed graph to the engine.
 */
import { describe, it, expect } from "vitest";
import { parseChartApiResponse, ChartApiFormatError, createGraphSnapshot } from "../src";

describe("parseChartApiResponse", () => {
  const payload = {
    rootId: "@I1@",
    rootUuid: "u-1",
    people: [
      {
        id: "@I1@",
        uuid: "u-1",
        firstName: "Ana",
        lastName: "Silva",
        birthYear: 1901,
        deathYear: null,
        birthPlace: "  Funchal, Madeira  ",
        deathPlace: "",
        gender: "Female",
        photoUrl: "   ",
        isLiving: false,
        birthCountry: "Portugal",
      },
      { id: "@I2@", firstName: "João" },
    ],
    unions: [{ id: "@F1@", husb: "@I2@", wife: "@I1@", children: [{ id: "@I3@", pedi: "" }] }],
    multiFamilyChildXrefs: ["@I3@"],
  };

  it("maps people to the engine's fields and drops the rest", () => {
    const r = parseChartApiResponse(payload);
    expect(r.people[0]).toEqual({
      id: "@I1@",
      xref: "@I1@",
      uuid: "u-1",
      firstName: "Ana",
      lastName: "Silva",
      birthYear: 1901,
      deathYear: null,
      birthPlace: "Funchal, Madeira",
      deathPlace: null,
      photoUrl: null,
      gender: "Female",
      isLiving: false,
    });
  });

  it("fills missing names and years", () => {
    const r = parseChartApiResponse(payload);
    expect(r.people[1]).toMatchObject({ id: "@I2@", firstName: "João", lastName: "", birthYear: null, deathYear: null });
  });

  it("[B14 fixed] counts a person with no isLiving as living", () => {
    const r = parseChartApiResponse(payload);
    expect(r.people[1].isLiving).toBe(true);
  });

  it("maps unions, defaulting an empty pedi to birth", () => {
    const r = parseChartApiResponse(payload);
    expect(r.unions).toEqual([{ id: "@F1@", husb: "@I2@", wife: "@I1@", children: [{ id: "@I3@", pedi: "birth" }] }]);
  });

  it("keeps rootId, siblingView and multiFamilyChildXrefs", () => {
    const r = parseChartApiResponse({
      ...payload,
      siblingView: { personId: "@I3@", spouseCatchAlls: ["@I2@"], adoptiveUnions: [], adoptiveCatchAlls: [] },
    });
    expect(r.rootId).toBe("@I1@");
    expect(r.multiFamilyChildXrefs).toEqual(["@I3@"]);
    expect(r.siblingView?.spouseCatchAlls).toEqual(["@I2@"]);
  });

  it("produces input the snapshot accepts", () => {
    const g = createGraphSnapshot(parseChartApiResponse(payload));
    expect(g.childrenOf("@I1@")).toEqual(["@I3@"]);
  });

  it.each([
    ["not an object", 42],
    ["no people array", { unions: [] }],
    ["no unions array", { people: [] }],
    ["a person without an id", { people: [{ firstName: "X" }], unions: [] }],
    ["a union without husb", { people: [], unions: [{ wife: "@I1@", children: [] }] }],
    ["a child without an id", { people: [], unions: [{ husb: "a", wife: "b", children: [{ pedi: "birth" }] }] }],
  ])("rejects %s", (_label, bad) => {
    expect(() => parseChartApiResponse(bad)).toThrow(ChartApiFormatError);
  });
});

describe("createGraphSnapshot and isLiving", () => {
  it("[B14 fixed] treats a person with no isLiving as living", () => {
    const g = createGraphSnapshot({ people: [{ id: "a", firstName: "A", lastName: "" }], unions: [] });
    expect(g.people.get("a")?.isLiving).toBe(true);
  });

  it("keeps an explicit isLiving: false", () => {
    const g = createGraphSnapshot({ people: [{ id: "a", firstName: "A", lastName: "", isLiving: false }], unions: [] });
    expect(g.people.get("a")?.isLiving).toBe(false);
  });
});
