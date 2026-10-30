import type { BuildTreeResult } from "../builder/build";
import type { GraphSnapshot } from "../graph";
import type { ViewStrategyDescriptor } from "../strategies/ViewStrategyDescriptor";
import { pedigreeDescriptor } from "../strategies/pedigree/pedigreeDescriptor";
import type { ViewState } from "../types";
import type { DescendancyPerson } from "../types";
import { PersonNode, NormalUnionNode } from "../nodes";
import type { ChartNode } from "../nodes";
import type { ChartViewBuildAdapter } from "./ChartViewBuildAdapter";
import { chosenParentFamilyId, countAncestors, parentFamilyToClimb } from "../graph/queries";

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
 * Pedigree chart: dedicated build (ancestor chain via the climbed parent family), not {@link ../builder/build.buildTree}.
 * Fan and vertical pedigree reuse it.
 */
export class PedigreeChartBuilder implements ChartViewBuildAdapter {
  readonly strategyName = "pedigree" as const;

  constructor(readonly graph: GraphSnapshot) {}

  getDescriptor(): ViewStrategyDescriptor {
    return pedigreeDescriptor;
  }

  buildTreeResult(rootId: string, viewState: ViewState, maxDepth: number): BuildTreeResult {
    const graph = this.graph;
    const people = graph.people;
    const famcOverrides = viewState.pedigreeFamcOverrides ?? {};
    const rootFamc = (viewState.pedigreeFamcFamilyXref ?? "").trim() || null;
    const effectiveDepth = viewState.currentDepth ?? maxDepth;
    const collapseAbovePersonId = (viewState.pedigreeAncestorCollapsePersonId ?? "").trim() || null;
    const showParentsOf = new Set(viewState.showParentsOf ?? []);

    /** B13: the root's chosen family, or an ancestor's chosen family; else the default (T47). */
    const chosenFamilyFor = (id: string, gen: number) => chosenParentFamilyId(viewState, id, gen === 0);

    /** T30: distinct ancestors hidden above a card, along the same families the chart climbs. */
    const hiddenAncestors = (id: string, gen: number) =>
      countAncestors(graph, id, { famcOverrides, firstFamilyId: gen === 0 ? rootFamc : null });

    /**
     * T49: everyone is drawn in full once, the first time in build order (father's side first);
     * any later appearance (pedigree collapse, or a cycle) is a shadow with nothing above it.
     */
    const drawn = new Set<string>();

    const makeUnknown = (id: string): DescendancyPerson => ({
      id,
      firstName: "?",
      lastName: "",
      birthYear: null,
      deathYear: null,
      photoUrl: null,
    });

    const known = (id: string | undefined) => {
      const t = (id ?? "").trim();
      return t && people.get(t)?._unknownPlaceholder !== true ? t : "";
    };

    /**
     * `cap`: the generation at which this branch stops (the depth limit, or one row past a card
     * whose chip was tapped). A card at the cap, or the collapsed card, shows "+N" instead of
     * its parents, unless its chip was tapped (showParentsOf): then its parents appear, one row.
     */
    const buildPerson = (id: string, gen: number, cap: number): PersonNode => {
      if (drawn.has(id)) {
        const p = people.get(id) ?? makeUnknown(id);
        return new PersonNode({ ...p, _isShadow: true }, []);
      }
      drawn.add(id);
      const raw = { ...(people.get(id) ?? makeUnknown(id)), _onlyRoot: gen === 0 };
      const node = (content: DescendancyPerson, children: ChartNode[]) => {
        const n = new PersonNode(content, children);
        const families = graph.parentUnionsOf(id);
        if (families.length > 1) {
          n.parentFamilies = {
            families: families.map((u) => ({
              familyId: u.id,
              kind: u.children.find((c) => c.id === id)?.pedi ?? "birth",
            })),
            shownFamilyId: parentFamilyToClimb(graph, id, chosenFamilyFor(id, gen))?.id ?? null,
          };
        }
        return n;
      };
      const stopsHere = gen >= cap || (collapseAbovePersonId != null && id === collapseAbovePersonId);
      let parentCap = cap;
      if (stopsHere) {
        if (!showParentsOf.has(id)) return node({ ...raw, _hiddenCount: hiddenAncestors(id, gen) }, []);
        parentCap = gen + 1;
      }
      const u = parentFamilyToClimb(graph, id, chosenFamilyFor(id, gen));
      if (!u) return node(raw, []);

      // A per-family placeholder partner (H4) counts as a missing parent here.
      const h = known(u.husb);
      const w = known(u.wife);
      if (!h && !w) return node(raw, []);

      {
        let leftNode: PersonNode;
        let rightNode: PersonNode;

        if (h && w && h !== w) {
          leftNode = buildPerson(h, gen + 1, parentCap);
          rightNode = buildPerson(w, gen + 1, parentCap);
        } else if (h && !w) {
          leftNode = buildPerson(h, gen + 1, parentCap);
          rightNode = new PersonNode(unknownPlaceholder("mother", id), []);
        } else if (!h && w) {
          leftNode = new PersonNode(unknownPlaceholder("father", id), []);
          rightNode = buildPerson(w, gen + 1, parentCap);
        } else {
          leftNode = buildPerson(h || w, gen + 1, parentCap);
          rightNode = new PersonNode(unknownPlaceholder("parent", `${id}_pair`), []);
        }

        const union = new NormalUnionNode(leftNode, rightNode, [], id);
        return node(raw, [union]);
      }
    };

    const root = buildPerson(rootId, 0, effectiveDepth);
    const maxDepthRendered = maxRenderedDepth(root, 0);
    return { root, maxDepthRendered };
  }
}
