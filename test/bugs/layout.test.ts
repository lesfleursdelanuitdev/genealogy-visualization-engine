/**
 * Audit bugs in layout, bounds, connectors and the pedigree build.
 * IDs follow docs/v0.1.0-progress.md ("Bug list").
 */
import { describe, it, expect } from "vitest";
import { graphOf, buildPedigree, person, union } from "../helpers/graph";
import {
  layout,
  getBounds,
  GAP,
  PersonNode,
  NormalUnionNode,
  buildFanGeometry,
  polarToCartesian,
  fanChartDescriptor,
  FAN_CHART_DEFAULTS,
  type ViewStrategyDescriptor,
} from "../../src";
import { pedigreeDescriptor } from "../../src/strategies/pedigree/pedigreeDescriptor";

const card = (id: string) => new PersonNode(person(id));

describe("B06: card size options", () => {
  it("[B06 fixed] personWidth sets the spacing between sibling cards", () => {
    const u = new NormalUnionNode(card("h"), card("w"), [card("c1"), card("c2"), card("c3")]);
    layout(u, { personWidth: 100 });
    const [c1, c2] = u.children;
    expect(c2.x - c1.x).toBe(100 + GAP);
  });

  it("[B06 fixed] personWidth sets the width of the bounds", () => {
    const solo = card("p");
    layout(solo, { personWidth: 100 });
    const b = getBounds(solo, { personWidth: 100 });
    expect(b.maxX - b.minX).toBe(100);
  });

  it("[B06 fixed] personHeight moves the pedigree connector points", () => {
    const p = card("p");
    p.y = 0;
    const connectors = (pedigreeDescriptor as ViewStrategyDescriptor).getConnectors!(100);
    expect(connectors.incomingY(p)).toBe(-50);
    expect(connectors.outgoingY(p)).toBe(50);
  });

  it("personHeight already sets the descendancy row spacing", () => {
    const u = new NormalUnionNode(card("h"), card("w"), [card("c")]);
    layout(u, { personHeight: 100 });
    expect(u.children[0].y).toBe(100 + 100); // personHeight + VERTICAL_GAP
  });
});

describe("B11: fan-chart bounds", () => {
  it("[B11 fixed] match the drawn half-disc for a 3-generation fan", () => {
    // Root with parents and grandparents: three generations of ancestors above the root.
    const g = graphOf({
      people: ["R", "F", "M", "FF", "FM", "MF", "MM", "FFF", "FFM"].map((id) => person(id)),
      unions: [
        union("@F1@", "F", "M", ["R"]),
        union("@F2@", "FF", "FM", ["F"]),
        union("@F3@", "MF", "MM", ["M"]),
        union("@F4@", "FFF", "FFM", ["FF"]),
      ],
    });
    const { root } = buildPedigree(g, "R", {}, 4);
    const bounds = fanChartDescriptor.getBounds(root);

    const geometry = buildFanGeometry({
      generationCount: 3,
      rootRadius: FAN_CHART_DEFAULTS.rootRadius,
      generationThickness: FAN_CHART_DEFAULTS.generationThickness,
      thicknessIncreaseStartGeneration: FAN_CHART_DEFAULTS.thicknessIncreaseStartGeneration,
      thicknessIncreaseStep: FAN_CHART_DEFAULTS.thicknessIncreaseStep,
    });
    let minX = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const cell of geometry.cells) {
      for (let i = 0; i <= 32; i++) {
        const a = cell.startAngle + ((cell.endAngle - cell.startAngle) * i) / 32;
        for (const r of [cell.innerRadius, cell.outerRadius]) {
          const pt = polarToCartesian(cell.center, r, a);
          minX = Math.min(minX, pt.x);
          maxX = Math.max(maxX, pt.x);
          maxY = Math.max(maxY, pt.y);
        }
      }
    }
    expect(bounds.minX).toBeCloseTo(minX, 3);
    expect(bounds.maxX).toBeCloseTo(maxX, 3);
    expect(bounds.maxY).toBeCloseTo(maxY, 3);
  });
});

describe("B13: chosen parent family in the pedigree", () => {
  // C is a child of @FB@ (birth: P1 + P2) and @FA@ (adopted: A1 + A2).
  const adopted = () =>
    graphOf({
      people: ["C", "P1", "P2", "A1", "A2"].map((id) => person(id)),
      unions: [
        union("@FB@", "P1", "P2", [{ id: "C", pedi: "birth" }]),
        union("@FA@", "A1", "A2", [{ id: "C", pedi: "adopted" }]),
      ],
    });

  function parentsOf(node: PersonNode): [string, string | undefined] | null {
    const u = node.children[0];
    if (!(u instanceof NormalUnionNode)) return null;
    return [u.left.content.id, u.right?.content.id];
  }

  it("climbs the birth family by default", () => {
    const { root } = buildPedigree(adopted(), "C");
    expect(parentsOf(root as PersonNode)).toEqual(["P1", "P2"]);
  });

  it("[B13 fixed] pedigreeFamcFamilyXref picks the root's parent family", () => {
    const { root } = buildPedigree(adopted(), "C", { pedigreeFamcFamilyXref: "@FA@" });
    expect(parentsOf(root as PersonNode)).toEqual(["A1", "A2"]);
  });

  it("[B13 fixed] pedigreeFamcOverrides picks an ancestor's parent family", () => {
    // R's father is C, so the override applies one generation up.
    const g = graphOf({
      people: ["R", "C", "W", "P1", "P2", "A1", "A2"].map((id) => person(id)),
      unions: [
        union("@FR@", "C", "W", ["R"]),
        union("@FB@", "P1", "P2", [{ id: "C", pedi: "birth" }]),
        union("@FA@", "A1", "A2", [{ id: "C", pedi: "adopted" }]),
      ],
    });
    const { root } = buildPedigree(g, "R", { pedigreeFamcOverrides: { C: "@FA@" } });
    const father = (root.children[0] as NormalUnionNode).left;
    expect(parentsOf(father)).toEqual(["A1", "A2"]);
  });
});
