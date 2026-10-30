import { describe, it, expect, beforeEach } from "vitest";
import {
  layout,
  markUnions,
  isContainer,
  PERSON_WIDTH,
  PERSON_HEIGHT,
  GAP,
  VERTICAL_GAP,
  CONNECTOR_WIDTH,
  PersonNode,
  NormalUnionNode,
  type ChartNode,
} from "../../src";
import {
  buildSinglePersonTree,
  buildThreeGenLinearTree,
  buildMultiMarriageTree,
  buildChildlessUnionTree,
} from "./_fixtures";

// ─── helpers ────────────────────────────────────────────────────────────────

function collectPersonNodes(root: ChartNode): PersonNode[] {
  const result: PersonNode[] = [];
  function walk(n: ChartNode) {
    if (n instanceof PersonNode) result.push(n);
    for (const c of n.children) walk(c);
  }
  walk(root);
  return result;
}

function collectUnionNodes(root: ChartNode): NormalUnionNode[] {
  const result: NormalUnionNode[] = [];
  function walk(n: ChartNode) {
    if (n instanceof NormalUnionNode) result.push(n);
    for (const c of n.children) walk(c);
  }
  walk(root);
  return result;
}

// ─── isContainer ────────────────────────────────────────────────────────────

describe("isContainer", () => {
  it("returns false for a leaf PersonNode", () => {
    expect(isContainer(buildSinglePersonTree())).toBe(false);
  });

  it("returns true for a PersonNode whose children are all UnionNodes", () => {
    const tree = buildMultiMarriageTree();
    expect(isContainer(tree)).toBe(true);
  });

  it("returns false for a UnionNode", () => {
    expect(isContainer(buildChildlessUnionTree())).toBe(false);
  });
});

// ─── markUnions ─────────────────────────────────────────────────────────────

describe("markUnions", () => {
  it("marks the first NormalUnionNode for a principal as primary", () => {
    const tree = buildMultiMarriageTree();
    markUnions(tree);
    const unions = collectUnionNodes(tree);
    expect(unions.length).toBeGreaterThanOrEqual(1);
    const primaries = unions.filter((u) => u._isPrimary);
    const secondaries = unions.filter((u) => !u._isPrimary);
    // two unions for the same principal: first primary, second secondary
    expect(primaries.length).toBe(1);
    expect(secondaries.length).toBe(1);
  });

  it("marks a single union as primary", () => {
    const tree = buildChildlessUnionTree();
    markUnions(tree);
    expect(tree instanceof NormalUnionNode && tree._isPrimary).toBe(true);
  });

  it("marks all unions as primary when they have distinct principals", () => {
    const tree = buildThreeGenLinearTree();
    markUnions(tree);
    const unions = collectUnionNodes(tree);
    // each union has a different principal — all should be primary
    expect(unions.every((u) => u._isPrimary)).toBe(true);
  });
});

// ─── layout: single person ───────────────────────────────────────────────────

describe("layout — single person", () => {
  let tree: ChartNode;
  beforeEach(() => {
    tree = buildSinglePersonTree();
    layout(tree);
  });

  it("places root at (0, 0)", () => {
    expect(tree.x).toBe(0);
    expect(tree.y).toBe(0);
  });

  it("_computedWidth equals PERSON_WIDTH for a leaf", () => {
    expect(tree._computedWidth).toBe(PERSON_WIDTH);
  });
});

// ─── layout: childless union ─────────────────────────────────────────────────

describe("layout — childless union", () => {
  let tree: NormalUnionNode;
  beforeEach(() => {
    tree = buildChildlessUnionTree() as NormalUnionNode;
    layout(tree);
  });

  it("places union diamond at x=0, y=0", () => {
    expect(tree.x).toBe(0);
    expect(tree.y).toBe(0);
  });

  it("places left card to the left of diamond", () => {
    const expectedLeftCX = 0 - CONNECTOR_WIDTH / 2 - PERSON_WIDTH / 2;
    expect(tree.left.x).toBe(expectedLeftCX);
    expect(tree.left.y).toBe(0);
  });

  it("places right card to the right of diamond", () => {
    const expectedRightCX = 0 + CONNECTOR_WIDTH / 2 + PERSON_WIDTH / 2;
    expect(tree.right!.x).toBe(expectedRightCX);
    expect(tree.right!.y).toBe(0);
  });
});

// ─── layout: 3-generation linear tree ───────────────────────────────────────

describe("layout — 3-generation linear tree", () => {
  let tree: ChartNode;
  beforeEach(() => {
    tree = buildThreeGenLinearTree();
    layout(tree);
  });

  it("places root union at y=0", () => {
    expect(tree.y).toBe(0);
  });

  it("places children at y = PERSON_HEIGHT + VERTICAL_GAP", () => {
    const gen1Y = PERSON_HEIGHT + VERTICAL_GAP;
    for (const child of tree.children) {
      expect(child.y).toBe(gen1Y);
    }
  });

  it("places grandchildren one further generation down", () => {
    const gen2Y = 2 * (PERSON_HEIGHT + VERTICAL_GAP);
    for (const child of tree.children) {
      for (const grandchild of child.children) {
        expect(grandchild.y).toBe(gen2Y);
      }
    }
  });

  it("each generation has only one child so x offsets are symmetric", () => {
    // with a single child per union, parent x and child x should be equal
    for (const child of tree.children) {
      expect(child.x).toBe(tree.x);
    }
  });
});

// ─── layout: multi-marriage tree (container node) ───────────────────────────

describe("layout — multi-marriage (container node)", () => {
  let root: ChartNode;
  beforeEach(() => {
    root = buildMultiMarriageTree();
    layout(root);
  });

  it("recognises the root as a container", () => {
    expect(isContainer(root)).toBe(true);
  });

  it("places container root at y=0", () => {
    expect(root.y).toBe(0);
  });

  it("places union children at the same y as root (container flattens depth)", () => {
    // isContainer means unions render at the same depth as root
    for (const union of root.children) {
      expect(union.y).toBe(root.y);
    }
  });

  it("spreads two unions horizontally, centred on root", () => {
    const [u0, u1] = root.children;
    // both unions exist
    expect(u0).toBeDefined();
    expect(u1).toBeDefined();
    // left union has negative x, right has positive, symmetric around 0
    expect(u0.x).toBeLessThan(0);
    expect(u1.x).toBeGreaterThan(0);
    expect(Math.abs(u0.x + u1.x)).toBeLessThan(1); // sum ≈ 0
  });

  it("each union's leaf child is placed one generation below the union", () => {
    const genY = PERSON_HEIGHT + VERTICAL_GAP;
    for (const union of root.children) {
      for (const child of union.children) {
        expect(child.y).toBe(genY);
      }
    }
  });
});

// ─── layout: _computedWidth correctness ──────────────────────────────────────

describe("layout — _computedWidth", () => {
  it("single leaf PersonNode width is PERSON_WIDTH", () => {
    const tree = buildSinglePersonTree();
    layout(tree);
    expect(tree._computedWidth).toBe(PERSON_WIDTH);
  });

  it("union with two leaf children width >= 2*PERSON_WIDTH + GAP", () => {
    const p1 = new PersonNode({ id: "a", firstName: "A", lastName: "", birthYear: null, deathYear: null, photoUrl: null });
    const p2 = new PersonNode({ id: "b", firstName: "B", lastName: "", birthYear: null, deathYear: null, photoUrl: null });
    const c1 = new PersonNode({ id: "c", firstName: "C", lastName: "", birthYear: null, deathYear: null, photoUrl: null });
    const c2 = new PersonNode({ id: "d", firstName: "D", lastName: "", birthYear: null, deathYear: null, photoUrl: null });
    const union = new NormalUnionNode(p1, p2, [c1, c2]);
    layout(union);
    expect(union._computedWidth).toBeGreaterThanOrEqual(2 * PERSON_WIDTH + GAP);
  });

  it("deep tree: parent _computedWidth >= child _computedWidth", () => {
    const tree = buildThreeGenLinearTree();
    layout(tree);
    function check(node: ChartNode) {
      for (const child of node.children) {
        expect(node._computedWidth).toBeGreaterThanOrEqual(child._computedWidth);
        check(child);
      }
    }
    check(tree);
  });
});

// ─── layout: x-positions are non-overlapping ────────────────────────────────

describe("layout — sibling x positions", () => {
  it("sibling union nodes are spaced at least GAP apart", () => {
    const root = buildMultiMarriageTree();
    layout(root);
    const unions = root.children;
    if (unions.length < 2) return;
    for (let i = 0; i + 1 < unions.length; i++) {
      const gap = unions[i + 1].x - unions[i].x;
      expect(gap).toBeGreaterThanOrEqual(GAP);
    }
  });

  it("sibling leaf children of a union are spaced at least PERSON_WIDTH apart", () => {
    const p = (id: string) => new PersonNode({ id, firstName: id, lastName: "", birthYear: null, deathYear: null, photoUrl: null });
    const union = new NormalUnionNode(p("r"), p("s"), [p("c1"), p("c2"), p("c3")]);
    layout(union);
    const children = union.children;
    for (let i = 0; i + 1 < children.length; i++) {
      const gap = children[i + 1].x - children[i].x;
      expect(gap).toBeGreaterThanOrEqual(PERSON_WIDTH);
    }
  });
});

// ─── layout: union left/right symmetry ──────────────────────────────────────

describe("layout — union left/right card symmetry", () => {
  it("left card and right card are equidistant from diamond", () => {
    const tree = buildChildlessUnionTree() as NormalUnionNode;
    layout(tree);
    const distLeft = Math.abs(tree.x - tree.left.x);
    const distRight = Math.abs(tree.x - tree.right!.x);
    expect(distLeft).toBeCloseTo(distRight, 5);
  });

  it("left card x = diamond.x - CONNECTOR_WIDTH/2 - PERSON_WIDTH/2", () => {
    const tree = buildChildlessUnionTree() as NormalUnionNode;
    layout(tree);
    expect(tree.left.x).toBeCloseTo(tree.x - CONNECTOR_WIDTH / 2 - PERSON_WIDTH / 2, 5);
  });

  it("right card x = diamond.x + CONNECTOR_WIDTH/2 + PERSON_WIDTH/2", () => {
    const tree = buildChildlessUnionTree() as NormalUnionNode;
    layout(tree);
    expect(tree.right!.x).toBeCloseTo(tree.x + CONNECTOR_WIDTH / 2 + PERSON_WIDTH / 2, 5);
  });
});

// ─── layout: custom personHeight option ──────────────────────────────────────

describe("layout — personHeight option", () => {
  it("accepts a custom personHeight and uses it for vertical spacing", () => {
    const tree = buildThreeGenLinearTree();
    const customHeight = 100;
    layout(tree, { personHeight: customHeight });
    const gen1Y = customHeight + VERTICAL_GAP;
    for (const child of tree.children) {
      expect(child.y).toBe(gen1Y);
    }
  });
});
