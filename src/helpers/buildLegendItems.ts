import { getPeople, getUnionById } from "../testdata";
import { DEFAULT_TREE_CONNECTOR_FALLBACK_HEX, SIBLING_COLORS } from "../strategies/descendancy/constants";
import type { ViewState, SiblingView } from "../types";

export function buildLegendItems(
  siblingView: SiblingView | null | undefined,
  rootId: string,
  viewState: ViewState
): { label: string; color: string }[] {
  if (!siblingView) return [];
  const people = getPeople();
  const sibPerson = people.get(siblingView.personId);
  const bioFatherXref = siblingView.birthFatherPersonId?.trim();
  const bioMotherXref = siblingView.birthMotherPersonId?.trim();
  const hasApiBirthPair = Boolean(bioFatherXref && bioMotherXref);
  const X = hasApiBirthPair && bioFatherXref ? people.get(bioFatherXref) : people.get(rootId);
  let Y: ReturnType<typeof people.get> | null = null;
  if (hasApiBirthPair && bioMotherXref) {
    Y = people.get(bioMotherXref) ?? null;
  } else {
    const bioSpouseId = (viewState.revealedUnions ?? new Map()).get(rootId)?.[0];
    Y = bioSpouseId ? people.get(bioSpouseId) ?? null : null;
  }
  const items: { label: string; color: string }[] = [];
  if (X && Y && sibPerson) {
    const multipleFamiliesAsChild = (siblingView.adoptiveUnions?.length ?? 0) > 0;
    items.push(
      multipleFamiliesAsChild
        ? {
            label: `${X.firstName} & ${Y.firstName} — ${sibPerson.firstName}'s biological parents`,
            color: SIBLING_COLORS.xyUnion,
          }
        : {
            label: `${X.firstName} & ${Y.firstName} — ${sibPerson.firstName}'s biological parents & full siblings (same as chart)`,
            color: DEFAULT_TREE_CONNECTOR_FALLBACK_HEX,
          }
    );
    items.push(
      {
        label: `${X.firstName}'s other children`,
        color: SIBLING_COLORS.xCatchAll,
      },
      {
        label: `${Y.firstName}'s other children`,
        color: SIBLING_COLORS.yCatchAll,
      }
    );
  }
  for (const unionId of siblingView.adoptiveUnions ?? []) {
    const u = getUnionById().get(unionId);
    if (!u || !sibPerson) continue;
    const W = people.get(u.husb);
    const V = people.get(u.wife);
    if (W && V) {
      items.push(
        {
          label: `${W.firstName} & ${V.firstName} — ${sibPerson.firstName}'s adoptive parents`,
          color: SIBLING_COLORS.wvUnion,
        },
        {
          label: `${W.firstName}'s other children`,
          color: SIBLING_COLORS.wCatchAll,
        },
        {
          label: `${V.firstName}'s other children`,
          color: SIBLING_COLORS.vCatchAll,
        }
      );
    }
  }
  return items;
}
