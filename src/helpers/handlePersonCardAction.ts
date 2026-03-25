import { getPeople, getParentUnionsByChild } from "../testdata";
import type { PersonCardAction, HandlePersonCardActionContext } from "./types";

export function handlePersonCardAction(
  action: PersonCardAction,
  personId: string,
  ctx: HandlePersonCardActionContext
): void {
  const {
    dispatch,
    setDrawerPersonId,
    setPan,
    setToast,
    setShowLegendModal,
    setShowLegendPanel,
    setRootDisplayNames,
    triggerBlinkBack,
    settings,
  } = ctx;

  if (action === "root") {
    const peopleMap = getPeople();
    const person = peopleMap.get(personId);
    if (person) {
      const name = (person.firstName + " " + person.lastName).trim();
      setRootDisplayNames((prev) => ({ ...prev, [personId]: name }));
    }
    dispatch({ type: "ROOT", personId });
    setDrawerPersonId(null);
    setPan({ x: 0, y: 0 });
    triggerBlinkBack();
    return;
  }

  if (action === "showSpouses") {
    setDrawerPersonId(personId);
    return;
  }

  if (action === "closeSpouse") {
    const revealedUnions = ctx.viewState?.revealedUnions;
    let partnerId: string | undefined;
    if (revealedUnions) {
      for (const [ownerId, spouseIds] of revealedUnions) {
        if (spouseIds.includes(personId)) {
          partnerId = ownerId;
          break;
        }
      }
    }
    dispatch({ type: "CLOSE_SPOUSE", spouseId: personId });
    if (partnerId) ctx.scheduleCenterOnPerson?.(partnerId);
    return;
  }

  if (action === "closeLinkedUnion") {
    dispatch({ type: "CLOSE_LINKED_UNION", personId });
    return;
  }

  if (action === "showSiblings") {
    dispatch({ type: "SHOW_SIBLINGS", personId });
    setDrawerPersonId(null);
    setPan({ x: 0, y: 0 });
    setShowLegendModal(settings.autoLegendModal);
    setShowLegendPanel(false);
    triggerBlinkBack();
    return;
  }

  if (action === "parents") {
    const parentUnions = getParentUnionsByChild().get(personId) ?? [];
    if (parentUnions.length === 0) return;

    const peopleMap = getPeople();
    const isAdopted =
      parentUnions.length > 1 ||
      parentUnions.some((u) => u.children.find((c) => c.id === personId)?.pedi === "adopted");

    dispatch({ type: "PARENTS", personId });
    setDrawerPersonId(null);
    setPan({ x: 0, y: 0 });
    triggerBlinkBack();

    if (isAdopted) {
      const person = peopleMap.get(personId);
      if (person) {
        const parts = parentUnions.map((u) => {
          const pedi = u.children.find((c) => c.id === personId)?.pedi ?? "birth";
          const names = [peopleMap.get(u.husb), peopleMap.get(u.wife)]
            .filter((p): p is NonNullable<typeof p> => p != null && p.firstName !== "Unknown")
            .map((p) => p.firstName)
            .join(" & ");
          return { pedi, names };
        });
        setToast({
          title: person.firstName + " " + person.lastName + " has multiple parent records",
          parts,
        });
        setTimeout(() => setToast(null), 6000);
      }
    }
  }

  if (action === "collapseSubtree") {
    dispatch({ type: "COLLAPSE_SUBTREE", personId });
    return;
  }

  if (action === "expandSubtree") {
    dispatch({ type: "EXPAND_SUBTREE", personId });
    return;
  }

  if (action === "expandDown") {
    const currentDepth = ctx.currentDepth ?? 0;
    const maxDepth = ctx.maxDepth ?? 0;
    const atMaxDepth = ctx.atMaxDepth ?? false;
    const currentLessThanMax = currentDepth < maxDepth;
    console.log("[Show children] action triggered", {
      "1. currentDepth": currentDepth,
      "2. maxDepth": maxDepth,
      "3. current depth < max depth?": currentLessThanMax,
      "4. atMaxDepth (will re-root if true)": atMaxDepth,
      "5. current root": ctx.rootId ?? "(none)",
      personId,
    });
    dispatch({
      type: "SHOW_CHILDREN",
      personId,
      atMaxDepth,
      currentDepth: ctx.currentDepth,
    });
    setDrawerPersonId(null);
    setPan({ x: 0, y: 0 });
    triggerBlinkBack();
    return;
  }
}
