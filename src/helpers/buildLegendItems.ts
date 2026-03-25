import { getPeople, getUnionById } from "../testdata";
import { SIBLING_COLORS } from "../strategies/descendancy/constants";
import type { ViewState, SiblingView } from "../types";

export function buildLegendItems(
  siblingView: SiblingView | null | undefined,
  rootId: string,
  viewState: ViewState
): { label: string; color: string }[] {
  if (!siblingView) return [];
  const people = getPeople();
  const sibPerson = people.get(siblingView.personId);
  const bioSpouseId = (viewState.revealedUnions ?? new Map()).get(rootId)?.[0];
  const X = people.get(rootId);
  const Y = bioSpouseId ? people.get(bioSpouseId) : null;
  const items: { label: string; color: string }[] = [];
  if (X && Y && sibPerson) {
    items.push(
      {
        label: `${X.firstName} & ${Y.firstName} — ${sibPerson.firstName}'s biological parents`,
        color: SIBLING_COLORS.xyUnion,
      },
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
