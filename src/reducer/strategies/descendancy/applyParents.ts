import { getUnionsByPerson, getParentUnionsByChild, getPeople } from "../../../testdata";
import type { UnionRecord, ViewState } from "../../../types";
import type { TreeState } from "../../types";
import { pushHistory } from "../../pushHistory";

function viewState(state: TreeState): ViewState {
  return state.viewState as ViewState;
}

function getTreeDescendants(rootId: string): Set<string> {
  const vis = new Set<string>();
  function walk(id: string) {
    if (vis.has(id)) return;
    vis.add(id);
    const unions = getUnionsByPerson().get(id) ?? [];
    for (const u of unions) {
      for (const c of u.children) walk(c.id);
    }
  }
  walk(rootId);
  return vis;
}

function applyParentsAsRoot(
  state: TreeState,
  personId: string,
  parentUnions: UnionRecord[]
): TreeState {
  const birthUnion =
    parentUnions.find(
      (u) => u.children.find((c) => c.id === personId)?.pedi === "birth"
    ) ?? parentUnions[0];

  const people = getPeople();
  const isHusbUnknown = people.get(birthUnion.husb)?.firstName === "Unknown";
  const primaryParent = isHusbUnknown ? birthUnion.wife : birthUnion.husb;
  const otherParent = isHusbUnknown ? birthUnion.husb : birthUnion.wife;

  const vs = viewState(state);
  const nextRevealed = new Map(vs.revealedUnions ?? []);
  const nextLinked = new Map(vs.linkedUnions ?? []);

  const existing = nextRevealed.get(primaryParent) ?? [];
  if (!existing.includes(otherParent))
    nextRevealed.set(primaryParent, [...existing, otherParent]);

  for (const u of parentUnions.filter((u) => u.id !== birthUnion.id)) {
    const unionId = u.id ?? `${u.husb}-${u.wife}`;
    const key = `__xy__${unionId}`;
    if (!nextLinked.has(key)) {
      nextLinked.set(key, [
        {
          xId: u.wife,
          husbId: u.husb,
          unionId,
          bothNewcomers: true,
        },
      ]);
    }
  }

  const newViewState: ViewState = {
    ...vs,
    revealedUnions: nextRevealed,
    linkedUnions: nextLinked,
    displayDepth: undefined,
    currentDepth: undefined,
    expandDownTopRow: undefined,
  };
  const p = people.get(primaryParent);
  const newRootFullName =
    (p ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() : null) || primaryParent;
  const newRootInitialsStr =
    (p ? ((p.firstName?.trim() || "")[0] ?? "") + ((p.lastName?.trim() || "")[0] ?? "") : "") ||
    (/^@I[^@]*@$/.test(primaryParent) ? "?" : primaryParent.slice(0, 2));
  const triggerP = people.get(personId);
  const triggerFullName =
    (triggerP ? `${triggerP.firstName ?? ""} ${triggerP.lastName ?? ""}`.trim() : null) || personId;
  const triggerInitials = triggerP
    ? ((triggerP.firstName?.trim() || "")[0] ?? "") + ((triggerP.lastName?.trim() || "")[0] ?? "")
    : "?";
  const actionLabel = `Show parents, make ${newRootFullName} root`;
  const hist = pushHistory(state, primaryParent, newViewState, actionLabel, personId, {
    triggerPersonFullName: triggerFullName,
    triggerPersonInitials: (triggerInitials || "?").toUpperCase(),
    rootPersonFullName: newRootFullName,
    rootPersonInitials: (newRootInitialsStr || "?").toUpperCase(),
  });
  return { ...state, rootId: primaryParent, viewState: newViewState, ...hist };
}

function applyParentsInTree(
  state: TreeState,
  personId: string,
  parentUnions: UnionRecord[]
): TreeState {
  const treeNodes = getTreeDescendants(state.rootId);

  const anchorUnions = parentUnions.filter(
    (u) => treeNodes.has(u.husb) || treeNodes.has(u.wife)
  );
  const linkedUnionPairs = parentUnions.filter(
    (u) => !treeNodes.has(u.husb) && !treeNodes.has(u.wife)
  );

  const vs = viewState(state);
  const nextRevealed = new Map(vs.revealedUnions ?? []);
  const nextLinked = new Map(vs.linkedUnions ?? []);

  for (const u of anchorUnions) {
    // Reveal the other parent as spouse of the one already in the tree (key must be in-tree person)
    const inTreeParent = treeNodes.has(u.husb) ? u.husb : u.wife;
    const otherParent = treeNodes.has(u.husb) ? u.wife : u.husb;
    const existing = nextRevealed.get(inTreeParent) ?? [];
    if (!existing.includes(otherParent))
      nextRevealed.set(inTreeParent, [...existing, otherParent]);
  }

  const allRevealedSpouses = new Set([...nextRevealed.values()].flat());
  for (const u of linkedUnionPairs) {
    const unionId = u.id ?? `${u.husb}-${u.wife}`;
    const spouseId = allRevealedSpouses.has(u.husb)
      ? u.husb
      : allRevealedSpouses.has(u.wife)
        ? u.wife
        : null;

    if (spouseId) {
      const xId = spouseId === u.husb ? u.wife : u.husb;
      const existing = nextLinked.get(spouseId) ?? [];
      if (!existing.some((e) => e.xId === xId)) {
        nextLinked.set(spouseId, [
          ...existing,
          { xId, unionId, bothNewcomers: false },
        ]);
      }
    } else {
      const key = `__xy__${unionId}`;
      if (!nextLinked.has(key)) {
        nextLinked.set(key, [
          {
            xId: u.wife,
            husbId: u.husb,
            unionId,
            bothNewcomers: true,
          },
        ]);
      }
    }
  }

  const newViewState: ViewState = {
    ...vs,
    revealedUnions: nextRevealed,
    linkedUnions: nextLinked,
    displayDepth: undefined,
    currentDepth: undefined,
    expandDownTopRow: undefined,
  };
  const hist = pushHistory(state, state.rootId, newViewState, "Show parents");
  return { ...state, viewState: newViewState, ...hist };
}

export function applyParents(
  state: TreeState,
  personId: string
): TreeState {
  const parentUnions = getParentUnionsByChild().get(personId) ?? [];
  if (parentUnions.length === 0) return state;

  if (personId === state.rootId) {
    return applyParentsAsRoot(state, personId, parentUnions);
  }
  return applyParentsInTree(state, personId, parentUnions);
}
