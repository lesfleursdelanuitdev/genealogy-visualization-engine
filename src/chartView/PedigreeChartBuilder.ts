import type { BuildTreeResult } from "../builder/build";
import type { FamilyTreeBuilder } from "../builder/FamilyTreeBuilder";
import type { ViewStrategyDescriptor } from "../strategies/ViewStrategyDescriptor";
import { pedigreeDescriptor } from "../strategies/pedigree/pedigreeDescriptor";
import type { ViewState } from "../types";
import type { DescendancyPerson } from "../types";
import { PersonNode, NormalUnionNode } from "../nodes";
import type { ChartNode } from "../nodes";
import type { ChartViewBuildAdapter } from "./ChartViewBuildAdapter";

function maxRenderedDepth(node: ChartNode, d = 0): number {
  let m = d;
  if (node instanceof PersonNode) {
    for (const c of node.children) m = Math.max(m, maxRenderedDepth(c, d + 1));
  }
  if (node instanceof NormalUnionNode) {
    m = Math.max(m, maxRenderedDepth(node.left, d + 1));
    if (node.right) m = Math.max(m, maxRenderedDepth(node.right, d + 1));
  }
  return m;
}

function unknownPlaceholder(slot: "father" | "mother" | "parent", anchorId: string): DescendancyPerson {
  const label = slot === "father" ? "father" : slot === "mother" ? "mother" : "parent";
  return {
    id: `_ped_unknown_${slot}_${anchorId}`,
    xref: `_ped_unknown_${slot}_${anchorId}`,
    uuid: null,
    firstName: "Unknown",
    lastName: label,
    birthYear: null,
    deathYear: null,
    photoUrl: null,
    gender: slot === "father" ? "Male" : slot === "mother" ? "Female" : null,
    _unknownPlaceholder: true,
  };
}

/**
 * Pedigree chart: dedicated build (ancestor chain via birth unions), not {@link ../builder/build.buildTree}.
 */
export class PedigreeChartBuilder implements ChartViewBuildAdapter {
  readonly strategyName = "pedigree" as const;

  constructor(private readonly dataBuilder: FamilyTreeBuilder) {}

  getDescriptor(): ViewStrategyDescriptor {
    return pedigreeDescriptor;
  }

  getDataBuilder(): FamilyTreeBuilder {
    return this.dataBuilder;
  }

  buildTreeResult(rootId: string, viewState: ViewState, maxDepth: number): BuildTreeResult {
    const people = this.dataBuilder.getPeople();
    const birthByChild = this.dataBuilder.getBirthUnionByChild();
    const effectiveDepth = viewState.currentDepth ?? maxDepth;
    const collapseAbovePersonId = (viewState.pedigreeAncestorCollapsePersonId ?? "").trim() || null;

    const visiting = new Set<string>();

    const makeUnknown = (id: string): DescendancyPerson => ({
      id,
      firstName: "?",
      lastName: "",
      birthYear: null,
      deathYear: null,
      photoUrl: null,
    });

    const buildPerson = (id: string, gen: number): PersonNode => {
      if (visiting.has(id)) {
        const p = people.get(id) ?? makeUnknown(id);
        return new PersonNode({ ...p, _isShadow: true }, []);
      }
      const raw = people.get(id) ?? makeUnknown(id);
      if (collapseAbovePersonId != null && id === collapseAbovePersonId) {
        return new PersonNode({ ...raw, _onlyRoot: gen === 0 }, []);
      }
      if (gen >= effectiveDepth) {
        return new PersonNode({ ...raw, _onlyRoot: gen === 0 }, []);
      }
      const u = birthByChild.get(id);
      if (!u) {
        return new PersonNode({ ...raw, _onlyRoot: gen === 0 }, []);
      }

      const h = (u.husb ?? "").trim();
      const w = (u.wife ?? "").trim();

      if (!h && !w) {
        return new PersonNode({ ...raw, _onlyRoot: gen === 0 }, []);
      }

      visiting.add(id);
      try {
        let leftNode: PersonNode;
        let rightNode: PersonNode;

        if (h && w && h !== w) {
          leftNode = buildPerson(h, gen + 1);
          rightNode = buildPerson(w, gen + 1);
        } else if (h && !w) {
          leftNode = buildPerson(h, gen + 1);
          rightNode = new PersonNode(unknownPlaceholder("mother", id), []);
        } else if (!h && w) {
          leftNode = new PersonNode(unknownPlaceholder("father", id), []);
          rightNode = buildPerson(w, gen + 1);
        } else {
          const single = (h || w).trim();
          leftNode = buildPerson(single, gen + 1);
          rightNode =
            h && w && h === w
              ? new PersonNode(unknownPlaceholder("parent", `${id}_pair`), [])
              : new PersonNode(unknownPlaceholder("parent", id), []);
        }

        const union = new NormalUnionNode(leftNode, rightNode, [], id);
        return new PersonNode({ ...raw, _onlyRoot: gen === 0 }, [union]);
      } finally {
        visiting.delete(id);
      }
    };

    const root = buildPerson(rootId, 0);
    const maxDepthRendered = maxRenderedDepth(root, 0);
    return { root, maxDepthRendered };
  }
}
