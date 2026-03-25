# Descendancy Chart Performance Refactor Plan

This document captures the optimization strategy and the concrete refactors applied (and remaining) for the descendancy chart. The biggest wins come from **eliminating repeated full-tree and full-union scans**, not from micro-optimizing the layout math.

---

## 1. Permanent union/person indexes (DONE)

**Problem:** `buildView()`, `applyParents()`, connector logic, and UI repeatedly did:

- `UNIONS.filter((u) => u.husb === id || u.wife === id)`
- `UNIONS.find((u) => u.id === unionId)`
- `UNIONS.filter((u) => u.children.some((c) => c.id === personId))`

So every such call scanned the full `UNIONS` array.

**Solution:** Build indexes once at module load and use O(1) / O(k) lookups.

### Data structures (in `testData.ts`)

```ts
/** All unions where this person is husband or wife. O(1) lookup. */
export const UNIONS_BY_PERSON: Map<string, UnionRecord[]>;

/** Union by stable id (u.id ?? `${husb}-${wife}`). O(1) lookup. */
export const UNION_BY_ID: Map<string, UnionRecord>;

/** Unions in which this person appears as a child. O(1) lookup. */
export const PARENT_UNIONS_BY_CHILD: Map<string, UnionRecord[]>;

/** Primary (birth) union for each child; used for shadow card labels. O(1) lookup. */
export const BIRTH_UNION_BY_CHILD: Map<string, UnionRecord>;
```

### Replacements made

| Location | Old | New |
|----------|-----|-----|
| `build.ts` | `allUnionsFor(id)` = `UNIONS.filter(...)` | `UNIONS_BY_PERSON.get(id) ?? []` |
| `DescendancyViewStrategy` | `UNIONS.filter` for catch-all unions | `UNIONS_BY_PERSON.get(catchPersonId)` + filter by id |
| `DescendancyViewStrategy` | `UNIONS.find((u) => u.id === unionId)` | `UNION_BY_ID.get(unionId)` |
| `applyParents.ts` | `UNIONS.filter((u) => u.children.some(...))` | `PARENT_UNIONS_BY_CHILD.get(personId) ?? []` |
| `applyParents.ts` | `UNIONS.filter` in `getTreeDescendants` | `UNIONS_BY_PERSON.get(id) ?? []` |
| `applyShowSiblings.ts` | Same parent-unions + “other unions” scans | `PARENT_UNIONS_BY_CHILD`, `UNIONS_BY_PERSON` |
| `ConnectorLines.tsx` | `UNIONS.find((u) => u.id === node.linkedUnionId)` | `UNION_BY_ID.get(node.linkedUnionId)` |
| `PersonNodeView.tsx` | `UNIONS.find` for primary union of shadow | `BIRTH_UNION_BY_CHILD.get(id)` |
| `FamilyTree.tsx` | `UNIONS.find` / `UNIONS.filter` for legend & parents | `UNION_BY_ID.get(unionId)`, `PARENT_UNIONS_BY_CHILD.get(personId)` |

`getSpousesOf(personId)` now uses `UNIONS_BY_PERSON.get(personId)` instead of filtering `UNIONS`.

---

## 2. Set-based dedupe (DONE)

**Problem:** In `DescendancyViewStrategy`, catch-all and sibling catch-all child lists used:

```ts
.filter((id, i, arr) => arr.indexOf(id) === i)
```

which is O(n²) in array length.

**Solution:** Collect into a `Set`, then spread to array:

```ts
const catchAllChildIds = new Set<string>();
for (const u of allUnions) {
  if (revealedUnionIds.has(u.id ?? "")) continue;
  for (const c of u.children) {
    if (!ctx.visited.has(c.id)) catchAllChildIds.add(c.id);
  }
}
const catchAllChildren = [...catchAllChildIds].map((id) => ctx.buildNode(id, depth + 1))...
```

Same pattern applied in `buildSiblingCatchAll` for `filtered` unions and child ids.

---

## 3. Memoized descendant counts (DONE)

**Problem:** `countDescendants(personId)` recursed through `ALL_CHILDREN_OF` with a fresh `visited` set per top-level call. Multiple leaf-limited nodes at max depth caused overlapping subtrees to be recomputed.

**Solution:** Module-level cache keyed by person id:

```ts
const descendantCountCache = new Map<string, number>();

export function countDescendants(personId: string, visited = new Set<string>()): number {
  if (visited.has(personId)) return 0;
  const cached = descendantCountCache.get(personId);
  if (cached !== undefined) return cached;
  visited.add(personId);
  const childIds = ALL_CHILDREN_OF[personId] ?? [];
  const count = childIds.reduce((sum, id) => sum + 1 + countDescendants(id, visited), 0);
  descendantCountCache.set(personId, count);
  return count;
}
```

Static test data makes this cache valid for the lifetime of the module. If data becomes mutable, invalidate or rebuild the cache when the data snapshot changes.

---

## 4. Single post-layout “scene analysis” pass (NOT DONE)

**Problem:** After `buildView()` + `layout()` + `markUnions()` we still have:

- `getBounds(root)` → walks all nodes via `collectAll()`
- `ConnectorLines` → builds `posMap` and traverses again to emit `<line>`s
- `SpouseJoinLines` → traverses to group unions by person, then sorts and draws

So multiple separate traversals and repeated work on every render.

**Proposed solution:** One analysis pass that produces a single “scene” object:

```ts
interface Scene {
  bounds: { minX: number; maxX: number; maxY: number };
  posMap: Map<string, ChartNode>;
  connectorSegments: Array<{ key: string; x1: number; y1: number; x2: number; y2: number; stroke?: string; dash?: string }>;
  joinLines: Array<{ key: string; x1: number; y1: number; x2: number; y2: number }>;
  // optional: flat list of nodes for virtualization/culling later
  // renderNodes?: ChartNode[];
}

function analyzeTree(root: ChartNode): Scene {
  const posMap = new Map<string, ChartNode>();
  const connectorSegments: Scene["connectorSegments"] = [];
  const unionsByPerson = new Map<string, NormalUnionNode[]>();
  const catchAllByPerson = new Map<string, CatchAllNode>();

  function walk(node: ChartNode) {
    // collect posMap (person nodes only, non-shadow)
    // collect unionsByPerson, catchAllByPerson for join lines
    // emit connector segment descriptors (no JSX) for LinkedParent, SiblingAdoptive, container/union connectors
    for (const c of node.children) walk(c);
  }
  walk(root);

  // Build join line descriptors from unionsByPerson + catchAllByPerson
  const joinLines = buildJoinLineDescriptors(unionsByPerson, catchAllByPerson);

  // Bounds from posMap + known node shapes
  const bounds = computeBoundsFromPosMap(posMap, root);

  return { bounds, posMap, connectorSegments, joinLines };
}
```

Then in `FamilyTree`:

```ts
const scene = useMemo(() => {
  const rootNode = buildView(rootId, viewState, maxDepth);
  layout(rootNode);
  markUnions(rootNode);
  return analyzeTree(rootNode);
}, [rootId, viewState, maxDepth]);
```

And presentational components become dumb:

```tsx
<ConnectorLines segments={scene.connectorSegments} />
<SpouseJoinLines lines={scene.joinLines} />
```

No tree walking inside React components; they only map segments/lines to SVG elements. This reduces both work and React’s reconciliation cost.

**Implementation notes:**

- Move logic from `ConnectorLines` (build posMap, collect linked-union and container segments, stroke/dash) into `analyzeTree`.
- Move logic from `SpouseJoinLines` (collect unions by person, sort by x, emit line coords) into `analyzeTree`.
- `getBounds` becomes `computeBoundsFromPosMap` or part of `analyzeTree` using the same single walk (or a second pass over `posMap` + root if needed).
- Keep `layout()` and `markUnions()` as they are; `analyzeTree` runs after them and reads `node.x`, `node.y`, `_isPrimary`, etc.

---

## 5. Precompute `isContainer` (NOT DONE)

**Problem:** `isContainer(node)` is called during position assignment and again in connector logic. It’s cheap but repeated.

**Solution:** Set a flag during build or width computation:

```ts
node._isContainer = node instanceof PersonNode && node.children.length > 0 && node.children.every((c) => c instanceof UnionNode);
```

Then use `node._isContainer` instead of calling `isContainer(node)`. Medium-small win; more valuable once combined with the single scene pass.

---

## 6. Reduce object churn in node/person wrappers (NOT DONE)

**Problem:** `buildView()` creates many new node instances and clones person objects with `_isShadow`, `_isLinkedSpouse`, `_onlyRoot`, so React sees new object identity every time.

**Options:**

- **Structural:** Keep `DescendancyPerson` immutable and add a separate display state:

  ```ts
  type NodeDisplayState = { isShadow?: boolean; isLinkedSpouse?: boolean; onlyRoot?: boolean; hiddenCount?: number };
  // PersonNode holds { personId, display } instead of cloning the person.
  ```

- **Pragmatic:** Cache/intern common wrappers (e.g. shadow and linked-spouse variants per person) within a single build to cut GC churn.

This is a smaller win than indexing and the scene pass but helps when the tree is large.

---

## 7. Reducer and history (NOT DONE)

Keep reducer logic as-is; the main gain is doing **derived indexing outside the reducer** so action handlers use the prebuilt lookup tables (`PARENT_UNIONS_BY_CHILD`, `UNIONS_BY_PERSON`, etc.) instead of scanning `UNIONS`. That’s already done for `applyParents` and `applyShowSiblings`. No need to over-optimize immutable updates unless profiling shows them hot.

---

## 8. Future: viewport culling / virtualization (LATER)

When the visible tree gets large, SVG node count can dominate. Options:

- Viewport culling: only render nodes and lines inside visible bounds + margin.
- Progressive disclosure by depth or branch.
- Canvas layer for connector lines if line count grows very large.

Not the first change; apply after the scene pass and indexing are in place.

---

## Summary: what was done vs remaining

| Item | Status |
|------|--------|
| Permanent indexes (`UNIONS_BY_PERSON`, `UNION_BY_ID`, `PARENT_UNIONS_BY_CHILD`, `BIRTH_UNION_BY_CHILD`) | Done |
| Replace all `UNIONS.filter` / `UNIONS.find` with index lookups | Done |
| Set-based dedupe in catch-all/sibling catch-all | Done |
| Memoize descendant counts | Done |
| Single scene analysis pass (`analyzeTree`) and useMemo scene in FamilyTree | Not done |
| Precompute `_isContainer` on nodes | Not done |
| Reduce person/node wrapper churn | Not done |
| Viewport culling / virtualization | Later |

The layout itself (post-order width, pre-order position, then `markUnions`) is already in good shape. The main performance gains come from **avoiding repeated derivation**—full union scans and extra tree walks—which is what the indexing and (when implemented) the unified scene pass address.
