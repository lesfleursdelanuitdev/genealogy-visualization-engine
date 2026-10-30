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
    graph,
  } = ctx;

  if (action === "root") {
    const person = graph.people.get(personId);
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
    let partnerId = ctx.rowPersonId;
    const revealedUnions = ctx.viewState?.revealedUnions;
    if (partnerId == null && revealedUnions) {
      for (const [ownerId, spouseIds] of revealedUnions) {
        if (spouseIds.includes(personId)) {
          partnerId = ownerId;
          break;
        }
      }
    }
    if (partnerId == null) return;
    dispatch({ type: "CLOSE_SPOUSE", personId: partnerId, spouseId: personId });
    ctx.scheduleCenterOnPerson?.(partnerId);
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

  if (action === "collapseSubtree") {
    dispatch({ type: "COLLAPSE_SUBTREE", personId });
    dispatch({ type: "PAN_TO_PERSON", personId });
    return;
  }

  if (action === "expandSubtree") {
    dispatch({ type: "EXPAND_SUBTREE", personId });
    return;
  }

  if (action === "expandDown") {
    const atMaxDepth = ctx.atMaxDepth ?? false;
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
