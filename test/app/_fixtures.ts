/**
 * Shared fixture trees for tree-viewer tests.
 * All fixtures are built from raw node constructors so they have no dependency
 * on builder state or API data.
 */

import {
  PersonNode,
  NormalUnionNode,
  type ChartNode,
  type DescendancyPerson,
} from "../../src";

function makePerson(id: string, firstName: string, lastName = "Test"): DescendancyPerson {
  return {
    id,
    firstName,
    lastName,
    birthYear: null,
    deathYear: null,
    photoUrl: null,
  };
}

/** Single person with no unions and no children. */
export function buildSinglePersonTree(): ChartNode {
  return new PersonNode(makePerson("p1", "Alice"));
}

/**
 * 3-generation linear tree:
 *   Alice + Bob → Carol + Dan → Eve
 */
export function buildThreeGenLinearTree(): ChartNode {
  const alice = new PersonNode(makePerson("p1", "Alice"));
  const bob = new PersonNode(makePerson("p2", "Bob"));
  const carol = new PersonNode(makePerson("p3", "Carol"));
  const dan = new PersonNode(makePerson("p4", "Dan"));
  const eve = new PersonNode(makePerson("p5", "Eve"));

  const carolDanUnion = new NormalUnionNode(carol, dan, [eve]);
  const aliceBobUnion = new NormalUnionNode(alice, bob, [carolDanUnion]);
  return aliceBobUnion;
}

/**
 * Tree with multiple marriages:
 *   Root has two unions: Root+SpouseA → ChildA, Root+SpouseB → ChildB
 */
export function buildMultiMarriageTree(): ChartNode {
  const root = new PersonNode(makePerson("root", "Root"));
  const spouseA = new PersonNode(makePerson("sa", "SpouseA"));
  const childA = new PersonNode(makePerson("ca", "ChildA"));
  const spouseB = new PersonNode(makePerson("sb", "SpouseB"));
  const childB = new PersonNode(makePerson("cb", "ChildB"));

  const unionA = new NormalUnionNode(root, spouseA, [childA]);
  const unionB = new NormalUnionNode(root, spouseB, [childB]);

  // root is the principal; its children are the two union nodes
  const rootNode = new PersonNode(makePerson("root", "Root"), [unionA, unionB]);
  return rootNode;
}

/**
 * Tree with childless leaf unions (union node with empty children array).
 *   Root + Spouse → (no children)
 */
export function buildChildlessUnionTree(): ChartNode {
  const root = new PersonNode(makePerson("r1", "Root"));
  const spouse = new PersonNode(makePerson("s1", "Spouse"));
  return new NormalUnionNode(root, spouse, []);
}

/**
 * 200-node tree for performance tests.
 * Builds a wide two-level tree: root has 10 unions, each union has 10 leaf children.
 * Total nodes: 1 root + 10 unions × (1 spouse + 10 leaves) = 111 PersonNodes, 10 UnionNodes.
 */
export function buildWideTree(unionsCount = 10, childrenPerUnion = 10): ChartNode {
  const root = new PersonNode(makePerson("root", "Root"));
  const unionNodes: ChartNode[] = [];

  for (let u = 0; u < unionsCount; u++) {
    const spouse = new PersonNode(makePerson(`spouse_${u}`, `Spouse${u}`));
    const children: ChartNode[] = [];
    for (let c = 0; c < childrenPerUnion; c++) {
      children.push(new PersonNode(makePerson(`child_${u}_${c}`, `Child${u}x${c}`)));
    }
    unionNodes.push(new NormalUnionNode(root, spouse, children));
  }

  return new PersonNode(makePerson("root", "Root"), unionNodes);
}

/**
 * Deep tree for performance tests: single chain of 200 generations.
 */
export function buildDeepTree(depth = 200): ChartNode {
  let leaf: ChartNode = new PersonNode(makePerson(`p_${depth}`, `Person${depth}`));
  for (let i = depth - 1; i >= 0; i--) {
    const person = new PersonNode(makePerson(`p_${i}`, `Person${i}`));
    const spouse = new PersonNode(makePerson(`sp_${i}`, `Spouse${i}`));
    leaf = new NormalUnionNode(person, spouse, [leaf]);
  }
  return leaf;
}
