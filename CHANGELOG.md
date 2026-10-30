# Changelog

## 0.1.0 (2026-10-30, not tagged yet)

The engine now stands alone: its one input is a `GraphSnapshot` of the whole family file, it keeps no global state, it fetches nothing, and the 2026-10-17 audit's bugs are fixed. Breaking changes are listed first, with what the Gonsalves app has to change when it moves to this version.

### Breaking changes

**Data in**
- `FamilyTreeBuilder`, `setCurrentBuilder`, `clearCurrentBuilder`, `setCurrentTreeData`, `clearCurrentTreeData` and the eight global getters (`getPeople`, `getUnions`, `getUnionsByPerson`, `getAllChildrenOf`, `getParentUnionsByChild`, `getUnionById`, `getBirthUnionByChild`, `getSpousesOf`) are removed. Build a snapshot once per file with `createGraphSnapshot({ people, unions })` and use its fields and methods: `graph.people`, `graph.unionById`, `graph.unionsOf(id)`, `graph.parentUnionsOf(id)`, `graph.childrenOf(id)`, `graph.spousesOf(id)`, `graph.birthUnionByChild`.
- `buildTree(rootId, strategy, { graph, maxDepth, getHiddenCount })`: `graph` is required. `BuildContext` has `graph`; `people` is a `ReadonlyMap`.
- `ChartViewBuildAdapter` has `.graph` instead of `getDataBuilder()`. The adapter classes are no longer exported; use `createChartSession` (or `createChartAdapter`).
- Unknown partners: a union's empty `husb`/`wife` becomes a per-family placeholder `<familyId>:unknown-husb` / `-wife`, an "Unknown" person with `_unknownPlaceholder: true`. Code that looked for `""` or `firstName === "Unknown"` must check `_unknownPlaceholder` (or `isUnknownPartnerId(id)`).
- A missing `isLiving` now means living (it meant not living).
- Unions without an `id` get `husb-wife` everywhere.
- Birth family (T20/T36): one rule, the first parent family in FAMC order where the child's pedi is `birth`, else the first. The old builder took the *last* birth family. `GraphInput.famcOrder` (optional) gives each person's FAMC order; without it, union order is used. Show parents, the siblings view and `birthFamilyOf` use it.
- **Ancestor charts climb the adoptive family first (T47):** Ancestors, Ancestors (vertical) and Fan show, by default, the first *adopted* family in FAMC order, else the birth family. `defaultFamc` and `parentFamilyToClimb` follow it (`ancestorFamilyOf`).
- **Each person is drawn in full once per chart (T49).** Ancestor charts: a person met again (pedigree collapse, a parent who is also a grandparent, a cycle) is a shadow (`_isShadow`) with nothing above it; before, their whole ancestry was drawn again. Descendants: a partner card is a shadow when that person is a principal elsewhere in the chart (their families hang under the principal card) or already appeared as a partner. A shadow has the same `id` as the full card, which is how the renderer links them.

**State**
- `treeReducer(state, action, graph?)`: the reducer reads people only from the graph passed in. For `useReducer`, use `createTreeReducer(graph)`. With no graph, actions that need data change nothing.
- `CLOSE_SPOUSE` needs `personId`, the row's person (T19). `handlePersonCardAction`'s context takes `rowPersonId` for it.
- `isAllSpousesRevealed(graph, revealedUnions, rootId?)`, `buildLegendItems(graph, …)`, `countDescendants(graph, personId)`: the graph comes first. `clearDescendantCountCache` is removed (the cache belongs to the snapshot).
- `HandlePersonCardActionContext.graph` is required. `useDepth({ graph })` replaces `builder`.
- `ViewState.expandDownTopRow` is removed; `showChildrenOf` and `showParentsOf` are added.
- `SET_CURRENT_DEPTH` clamps to 1..`DEFAULT_MAX_DEPTH`.
- `DEFAULT_ROOT_XREF` (the Gonsalves person `@I0082@`) is removed. `createInitialState(strategy)` without a root gives `rootId: ""`; `INITIAL_STATE` likewise.

**Fetching**
- `useChartViewFetch` takes one options object with a `fetchGraph(request)` function and builds no URLs:

  ```ts
  useChartViewFetch({
    fetchGraph: async ({ strategy, rootId, depth, siblingViewPersonId, pedigreeFamcFamilyXref, pedigreeFamcOverrides, signal }) => {
      const url = /* the app's own /api/tree/* route for the request */;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return parseChartApiResponse(await res.json());
    },
    strategyName, rootId, maxDepth, siblingViewPersonId, onSiblingViewMeta, pedigreeFamcFamilyXref, pedigreeFamcOverrides,
  });
  ```
  It returns `graph` and `error` as well; failures no longer go to `console.warn`.
- `useDescendancyFetch` is removed.

**Layout and drawing**
- Fan-chart bounds are `{ minX: -R, maxX: R, maxY: R }`, the half-disc `buildFanGeometry` draws around its default centre `(0, R)`. They were `{ 0, R, 2R }`: an app that offset the fan to match must drop that offset.
- `personWidth` now changes node spacing and bounds, and `getConnectors(personHeight, personWidth?)` / the pedigree connectors honour the card size. `Node.computedWidth(gap, personWidth?)`.
- `_hiddenCount` now means "distinct people hidden beyond this card in the chart's direction" and is set on all four charts (see Added).
- `usePanZoom` no longer returns `onWheel`: it adds its own non-passive wheel listener. Remove `onWheel={onWheel}` from the `<svg>`, or every notch zooms twice. It sets `touch-action: none` on the `<svg>`. Pass `viewKey` (e.g. chart type + root) so the initial view applies once per chart; a bounds change alone now keeps the zoom and keeps the content still.
- Zoom limits are options, `minZoom` (default **0.05**, was a fixed 0.2) and `maxZoom` (default 3). Fit picks the zoom that fits (never above 100%) within the limits; it used to stop at 25%, so a wide chart overflowed a phone.
- `zoomIn` / `zoomOut` zoom around the viewport centre (they zoomed around the layout origin) and take `{ focus: { x, y } }` for another screen point. Wire them as `onClick={() => zoomIn()}`, not `onClick={zoomIn}`.

**Package**
- `main`, `types` and `exports` point at `dist/`. Only `.` and `./package.json` are exported (the `./*` → `src/*` subpath export is gone). `dist/` is ESM with extensionless imports, for bundlers only (Vite, Next, webpack, vitest), not bare Node (T22).
- Removed exports: `buildView`, `FamilyTreeNodeFactory` and its types, `getAllActionTypes`, `serializeNode`, `PedigreeViewStrategy`, and the test data (`buildTestTree`, `UNIONS`, `*_BY_*`, `PEOPLE_WITH_*`, now in `test/fixtures/smith`).

### History entries (the Gonsalves app restores saved entries)

`HistoryEntry`'s fields are unchanged; BACK, FORWARD, NAVIGATE_TO_INDEX, CLEAR_HISTORY, RESTORE_HISTORY, `MAX_HISTORY` (21) and `strategyName` per entry work as before (`test/history.test.ts`). What changes:
- New entries: choosing a parent family (`PEDIGREE_SET_FAMC_FOR_PERSON`, `PEDIGREE_SET_FAMC_FAMILY_XREF`, the card's "2 families" switch) pushes **"Show birth parents of X"** / **"Show adoptive parents of X"** / **"Show foster parents of X"** when the family shown changes, and changes nothing otherwise (T45, T47). `CLOSE_SPOUSE` pushes **"Close partner"** (it pushed nothing); the "+N" chip on the ancestor charts pushes **"Show more ancestors"**; `COLLAPSE_SUBTREE` / `EXPAND_SUBTREE` push **"Hide descendants of X"** / **"Show descendants of X"**, and `PEDIGREE_COLLAPSE_ANCESTORS` / `PEDIGREE_CLEAR_ANCESTOR_COLLAPSE` push **"Hide ancestors of X"** / **"Show ancestors of X"** (all four pushed nothing; T28). A collapse or expand that changes nothing adds no entry.
- Show children at the depth cap pushes **"Show children"** with the trigger person and no longer changes the root (it pushed "Show children, make X root" with `rootPersonFullName`/`rootPersonInitials`).
- `viewState` inside entries: `expandDownTopRow` is gone (ignored when an old entry is restored), `showChildrenOf` / `showParentsOf` may appear, and `panToPersonId` stays only on its own "Pan to person" entry instead of being copied into every later entry.
- An unknown partner is `<familyId>:unknown-husb` / `-wife` in `revealedUnions`. Old saved entries that reveal `""` still work: `""` matches that family's placeholder. (`familyUnitScope.spouseId` and `linkedUnions` with `""` are not mapped.)
- Show parents & siblings with an unknown father roots at the mother (it rooted at `""`), and its entry's `siblingView` is filled at once.
- Initials take the first grapheme, so names starting outside the BMP or with a combining accent give different (correct) initials.

### Added

- `createGraphSnapshot`, `GraphSnapshot`, `GraphInput` (+ optional `famcOrder`), `unknownPartnerId`, `isUnknownPartnerId`, `EMPTY_GRAPH`.
- `createChartSession({ graph, viewState, options })` with `buildTree(root)` and `buildChart(root)`; `layoutChart`.
- For the card's "2 families" switch (T47): `PersonNode.parentFamilies` on ancestor-chart cards of people with more than one parent family (`families: [{ familyId, kind }]`, `shownFamilyId`), and `parentFamilySwitch(graph, personId, viewState, { isRoot })`, `chosenParentFamilyId`, `ancestorFamilyOf`.
- Test fixtures for real family shapes with invented names (T48, T49): a man who marries his sister-in-law's niece; an adopted boy and an adopted niece whose sister marries him; a father with a son by his daughter (`test/fixtures/families.ts`).
- `createTreeReducer(graph)`.
- `parseChartApiResponse` (+ `ApiPerson`, `ApiUnion`, `ApiChartResponse`, `ChartApiFormatError`) for the Gonsalves wire format; `ChartGraphRequest`, `ChartGraphResponse`, `FetchChartGraph`.
- The server's chart logic as pure functions: `birthFamilyOf`, `defaultFamc`, `parentFamiliesOf`, `hasMultipleParentFamilies`, `multiFamilyChildIds`, `siblingsOf`, `familiesAsPartnerOf`, `computeSiblingView`, `countAncestors`, `countDescendantsWithin`, `parentFamilyToClimb`. Show siblings now fills the sibling view from the graph.
- **"+N" on all four charts (T30):** cards at the depth limit and on a collapsed branch get `_hiddenCount`, the number of distinct people beyond them (descendants, or ancestors on Ancestors, Ancestors (vertical) and Fan). `SHOW_HIDDEN { personId }` is the chip: one more generation for that branch.
- **Show children at the cap (T18)** shows that person's children one row deeper, for that branch only.
- Search: `searchPeople(graph, query, { offset, limit })` (names and 4-digit years, sorted, 10 per page) and `createGraphIndividualsSearch(graph)`; `useChartSearch` passes years and paging through.
- Two FAM records for one couple each get their own union row; the partner is listed once (R1).

### Fixed (2026-10-17 audit; repros in `test/bugs/`)

H1 global builder shared by every chart · H2 a late answer replaced the current chart · H3 O(N²) descendancy build (6,826 people: 1.3 s → about 60 ms) · H4 one shared "Unknown" for every unknown partner · B01 wheel/pinch zoom drifted (ignored baseX/baseY) · B02 passive wheel listener · B03 Show children at the cap re-rooted · B04 second FAM of a couple lost its children · B05 "+N" counts path-dependent and double-counted · B06 `personWidth`/`personHeight` ignored by spacing, bounds and pedigree connectors · B07 a fast answer left the chart loading · B08 bounds changes reset the zoom · B09 CLOSE_SPOUSE closed the wrong row · B10 depth not clamped; revealed rows passed the cap · B11 fan bounds · B12 initials split UTF-16 pairs · B13 the pedigree ignored the chosen parent family · B14 missing `isLiving` treated as dead · B15 `console.log` in production · S1 re-rooting kept the old family-unit scope · S2 `panToPersonId` never cleared · S3 fit to screen ignored the centre. (S4, sibling order, did not reproduce: children keep CHIL order, T21.)

Also: `process.env` is read only in `src/env.ts`, guarded, so the engine loads under Vite; one-finger pan, taps on card buttons and two-finger pinch are phone-safe (T31).

Closing a partner on one row (`CLOSE_SPOUSE`, `CLOSE_ALL_SPOUSES_FOR_PERSON`) also removed the other person's row with them (a cleanup for old "phantom" entries); found with the T49 fixture, where both rows are real. Only the chosen row closes now.

Found by the renderer's slice 1: R1 Toggle all partners / Show all listed a partner once per FAM record (4 rows for a couple with 2 FAMs) · R2 collapse/expand added no History entry · R3 zoom limits fixed at 20–300% · R4 a drag whose pointerup never came kept panning on hover (now ended by `pointercancel`, `lostpointercapture`, window blur, or a mouse/pen move with no button) · R5 zoom buttons zoomed around the layout origin.

### Tooling

`npm run typecheck | build | test | check`; vitest 4.1.12 (past GHSA-82fw-gwwq-j7x9 and GHSA-qxg6-89mg-rqv8); jsdom hook tests; the Gonsalves app's 74 engine tests copied to `test/app` (two adapted to the changes above, marked in place).
