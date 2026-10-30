/**
 * The server-logic port (docs/server-logic-for-standalone.md): pure functions over the whole
 * file's snapshot, so a viewer with no server can do what the Gonsalves routes do.
 */
import { describe, it, expect } from "vitest";
import {
  birthFamilyOf,
  parentFamiliesOf,
  defaultFamc,
  hasMultipleParentFamilies,
  multiFamilyChildIds,
  computeSiblingView,
  siblingsOf,
  familiesAsPartnerOf,
  countAncestors,
  countDescendantsWithin,
  type ViewState,
} from "../src";
import { graphOf, reduce, emptyState, person, union } from "./helpers/graph";

// P is a child of @FB@ (X + Y, birth, with full sibling S1) and of @FA@ (W + V, adopted, with
// W's other child K). X also has @FX@ with Z (half-sibling H). @FD@ duplicates X + Y.
const file = () =>
  graphOf({
    people: ["P", "S1", "X", "Y", "W", "V", "K", "Z", "H", "Q", "D1"].map((id) => person(id, id, "T")),
    unions: [
      union("@FB@", "X", "Y", ["S1", "P"]),
      union("@FA@", "W", "V", [{ id: "P", pedi: "adopted" }]),
      union("@FW@", "W", "Q", ["K"]),
      union("@FX@", "X", "Z", ["H"]),
      union("@FD@", "X", "Y", ["D1", { id: "P", pedi: "birth" }]),
    ],
  });

describe("parent families", () => {
  it("birthFamilyOf follows the birth rule (T36); defaultFamc the ancestor charts' rule (T47)", () => {
    expect(birthFamilyOf(file(), "P")?.id).toBe("@FB@");
    expect(defaultFamc(file(), "P")).toBe("@FA@"); // adoptive first
    expect(defaultFamc(file(), "X")).toBeNull();
  });

  it("parentFamiliesOf lists each family with parents, the child's kind and the children", () => {
    expect(parentFamiliesOf(file(), "P")).toEqual([
      { familyId: "@FB@", fatherId: "X", motherId: "Y", kind: "birth", isBirthFamily: true, childIds: ["S1", "P"] },
      { familyId: "@FA@", fatherId: "W", motherId: "V", kind: "adopted", isBirthFamily: false, childIds: ["P"] },
      { familyId: "@FD@", fatherId: "X", motherId: "Y", kind: "birth", isBirthFamily: false, childIds: ["D1", "P"] },
    ]);
  });

  it("an unknown parent shows as null", () => {
    const g = graphOf({ people: [person("M"), person("C")], unions: [union("@F1@", "", "M", ["C"])] });
    expect(parentFamiliesOf(g, "C")[0]).toMatchObject({ fatherId: null, motherId: "M" });
  });

  it("hasMultipleParentFamilies / multiFamilyChildIds (was the route's multiFamilyChildXrefs)", () => {
    expect(hasMultipleParentFamilies(file(), "P")).toBe(true);
    expect(hasMultipleParentFamilies(file(), "S1")).toBe(false);
    expect(multiFamilyChildIds(file(), ["X", "P", "S1"])).toEqual(["P"]);
  });
});

describe("siblings and partner families", () => {
  it("siblingsOf groups siblings by parent family, in CHIL order, without the person", () => {
    expect(siblingsOf(file(), "P")).toEqual([
      { familyId: "@FB@", siblingIds: ["S1"] },
      { familyId: "@FA@", siblingIds: [] },
      { familyId: "@FD@", siblingIds: ["D1"] },
    ]);
  });

  it("familiesAsPartnerOf lists each family with the partner and children", () => {
    expect(familiesAsPartnerOf(file(), "X")).toEqual([
      { familyId: "@FB@", partnerId: "Y", childIds: ["S1", "P"] },
      { familyId: "@FX@", partnerId: "Z", childIds: ["H"] },
      { familyId: "@FD@", partnerId: "Y", childIds: ["D1", "P"] },
    ]);
  });
});

describe("computeSiblingView (was the sibling-view route's meta)", () => {
  it("roots at the birth father with the birth mother revealed", () => {
    const sv = computeSiblingView(file(), "P");
    expect(sv?.rootId).toBe("X");
    expect(sv?.partnerId).toBe("Y");
  });

  it("lists the meta the descendancy strategy draws", () => {
    expect(computeSiblingView(file(), "P")?.siblingView).toEqual({
      personId: "P",
      spouseCatchAlls: ["X"], // X has another family; Y has none besides the duplicate
      adoptiveUnions: ["@FA@"], // @FD@ is the same couple as the birth family: left out
      adoptiveCatchAlls: ["W"], // W has another family
      birthFatherPersonId: "X",
      birthMotherPersonId: "Y",
    });
  });

  it("roots at the mother when the father is unknown", () => {
    const g = graphOf({ people: [person("M"), person("C")], unions: [union("@F1@", "", "M", ["C"])] });
    const sv = computeSiblingView(g, "C");
    expect(sv?.rootId).toBe("M");
    expect(sv?.partnerId).toBe("@F1@:unknown-husb");
    expect(sv?.siblingView.birthFatherPersonId).toBeNull();
  });

  it("is null for someone with no parents", () => {
    expect(computeSiblingView(file(), "X")).toBeNull();
  });

  it("Show siblings fills the sibling view at once, without a server", () => {
    const s1 = reduce(file(), emptyState("P"), { type: "SHOW_SIBLINGS", personId: "P" });
    const vs = s1.viewState as ViewState;
    expect(s1.rootId).toBe("X");
    expect(vs.revealedUnions?.get("X")).toEqual(["Y"]);
    expect(vs.siblingView?.adoptiveUnions).toEqual(["@FA@"]);
    expect(s1.history[1].actionLabel).toBe("Show parents & siblings of P T");
  });
});

describe("counts within generations (start-person suggestion, person-chart-options)", () => {
  // A → B → C → D (each one child, other parent unknown)
  const chain = () =>
    graphOf({
      people: ["A", "B", "C", "D"].map((id) => person(id)),
      unions: [union("@F1@", "A", "", ["B"]), union("@F2@", "B", "", ["C"]), union("@F3@", "C", "", ["D"])],
    });

  it("countDescendantsWithin stops after n generations", () => {
    expect(countDescendantsWithin(chain(), "A", 2)).toBe(2);
    expect(countDescendantsWithin(chain(), "A", 10)).toBe(3);
  });

  it("countAncestors takes maxGenerations", () => {
    expect(countAncestors(chain(), "D", { maxGenerations: 1 })).toBe(1);
    expect(countAncestors(chain(), "D")).toBe(3);
  });
});
