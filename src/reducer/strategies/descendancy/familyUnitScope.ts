import type { FamilyUnitScope, ViewState } from "../../../types";

export function normalizeScopeXref(xref: string): string {
  const inner = xref.replace(/^@+|@+$/g, "").trim();
  if (!inner) return "";
  return `@${inner}@`;
}

export function withoutFamilyUnitScope(v: ViewState): ViewState {
  if (v.familyUnitScope == null) return v;
  const { familyUnitScope: _removed, ...rest } = v;
  return rest;
}

/** True when catch-all should be omitted for this person row (family unit view at chart root only). */
export function shouldSkipCatchAllForFamilyUnit(
  viewState: ViewState,
  personId: string,
  rootId: string
): boolean {
  const scope = viewState.familyUnitScope;
  if (!scope) return false;
  return personId === rootId && scope.personId === rootId;
}

export function normalizeFamilyUnitScope(
  personId: string,
  spouseId: string,
  familyXref?: string | null
): FamilyUnitScope {
  const family =
    familyXref != null && String(familyXref).trim() !== ""
      ? normalizeScopeXref(String(familyXref).trim())
      : null;
  return {
    personId: normalizeScopeXref(personId),
    spouseId: normalizeScopeXref(spouseId),
    familyXref: family || null,
  };
}
