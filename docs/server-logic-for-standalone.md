# Server logic the standalone viewer must replace

Inventory for step 1 of the tree-viewer plan (spec: `ligneous-validate/docs/tree-viewer-spec.md`, Part 1 and Part 2). Written 2026-10-30, from reading only. Nothing in the Gonsalves repos was changed or run.

## 1. Why this exists

Today the engine draws what the Gonsalves Next.js routes send it. Those routes do real chart work:
- they pick which people and families a chart needs;
- they choose a child's birth family;
- they apply the parent family a visitor chose in a pedigree;
- they list people with several parent families;
- they build the "parents & siblings" view;
- they hide details of living people from signed-out visitors.

tree-viewer.ligneous.org has no server. The visitor's whole GEDCOM file becomes one in-memory snapshot, `{ people: DescendancyPerson[], unions: UnionRecord[] }`. Each piece of route logic therefore either **vanishes**, because the snapshot already holds everything, or must be **recomputed in JavaScript** from the snapshot. This file lists every piece: where it is, how big it is, who reads its output, and where its replacement should live.

**Paths.** Gonsalves paths are relative to `/srv/apps/gonsalves/the-gonsalves-family`. Paths starting with `../` are relative to that folder (for example `../the-gonsalves-family-admin/…`). Paths starting with `src/` without `app/` or `components/` are in this engine repo, **as of af03705**, the branch's starting point. Its `src/` is identical to the copy Gonsalves builds from (`/srv/apps/gonsalves/packages/genealogy-visualization-engine`, at 4139529; af03705 adds docs only), so engine line numbers hold for that copy. On `engine-v0.1.0` after phases 1–3, `FamilyTreeBuilder.ts` and `currentBuilder.ts` are gone: their indexes live in `src/graph/GraphSnapshot.ts`, and the reducers read the graph passed in (see `docs/v0.1.0-progress.md`).

**How lines were counted.** For each range: `sed -n 'A,Bp' file`, drop blank lines, `//` lines, `/* … */` comment lines and `import` lines, then `wc -l`. The ranges cover logic only. Prisma queries, `select` blocks, env/404/500 handling and `NextResponse` plumbing are excluded and counted separately as boilerplate.

### Totals

| What | Lines on disk | Logic lines |
|---|---|---|
| The 4 chart routes (descendancy 214, pedigree 291, sibling-view 380, person-chart-options 121) | 1,006 | 842 non-blank, non-comment, non-import: **~558 chart logic** + ~284 query/response boilerplate |
| Library helpers they call (`lib/tree-ancestry.ts`, `lib/tree/parents-label-for-family.ts`, `lib/individual-mapper.ts`, privacy/viewer helpers) | 474 | **~282** used by the charts |
| **Chart logic total** | | **~840** (the plan's estimate was ~900) |
| Also needed by the charts: two detail routes (families-as-child 88, families-as-spouse 74) and app hooks (default parent family 13 + 78, label 22, pedigree root siblings/children 65) | | ~340 |

`individuals/[xref]/ancestors` and `individuals/[xref]/descendants` are **not used by any chart**. Their only client callers, `useTreeAncestors` and `useTreeDescendants` (`src/hooks/useTreeData.ts:207-249`), are called from nowhere.

## 2. Inventory

Lines are logic lines, counted as above.

| # | Piece | Where (logic lines) | What it does | Inputs → response fields | Read by |
|---|---|---|---|---|---|
| 1 | **Descendancy graph selection** | `src/app/api/tree/descendancy/route.ts:73-74, 102-151` (46); `lib/tree-ancestry.ts:30-39, 80-88, 136-169` (53). **99** | Loads every individual, family and parent-child row of the file (`route.ts:76-96`). Then it walks the root's descendants to `depth` (clamped to 1–20, default 10). The walk also puts each child's spouses on the frontier (`tree-ancestry.ts:154-161`), so spouses' children by other partners come too. It keeps every family whose husband, wife or any child is in the set, then adds all members of those families. | `root`, `depth` → `rootId`, `rootUuid`, `people[]`, `unions[]` | `src/hooks/useChartViewFetch.ts:164-205` builds a `FamilyTreeBuilder`. `rootUuid` is read by nothing. |
| 2 | **Sibling view** ("Show parents & siblings") | `src/app/api/tree/sibling-view/route.ts:80-81, 109-261, 312-346, 363-380` (189); `lib/tree/parents-label-for-family.ts:68-88` (21). **210** | Picks the person P's birth family (row 3a). The root is the birth father X, or P when there is no father (`:164-179`). Includes the birth family and the full siblings' descendants to depth (`:170-189`). Includes every other family of X and of the mother Y, from `gedcom_spouses`, with their children's descendants (`:191-215`). Includes P's other child-families, children only (`:219-230`). Then two closure passes (`:232-261`). Builds the meta: `spouseCatchAlls` = X and/or Y if they have another spouse family (`:312-317`); `adoptiveUnions` = P's other child-families, minus any FAM with the same husband and wife as the birth FAM (`:152-159, 319-321`); `adoptiveCatchAlls` = an adoptive parent with more than one included union (`:323-337`); birth father and mother (`:344-345`). | `person`, `depth` → `rootId`, `rootUuid`, `people[]`, `unions[]`, `siblingView {personId, spouseCatchAlls, adoptiveUnions, adoptiveCatchAlls, birthFatherPersonId, birthMotherPersonId}` | `useChartViewFetch.ts:168, 185-187` → `SET_SIBLING_VIEW_FROM_API` (`src/reducer/strategies/descendancy/applySetSiblingViewFromApi.ts:4-13`) → `src/strategies/descendancy/DescendancyViewStrategy.ts:96-121, 262-341` and `src/helpers/buildLegendItems.ts:5-72`. The response `rootId` is ignored: the chart root comes from `applyShowSiblings.ts:14-18`. |
| 3 | **Parent-family (FAMC) choice** | Server: `src/app/api/tree/pedigree/route.ts:113-162, 181-192` (56). App: `lib/pedigreeDefaultFamc.ts:8-20`, `src/components/TreeViewer/v2/hooks/useChartStrategyChange.ts:31-118`, `src/app/api/tree/individuals/[xref]/detail/families-as-child/route.ts:57-146`, `lib/tree/parents-label-for-family.ts:30-56` (201) | Server: `famc` (for the root) and `famcOverrides` (JSON, person xref → FAM xref) replace a child's parent list with the parents of the chosen FAM (`:124-136`). The choice is skipped silently if that FAM has no parent rows (`:132`). Then **every other family that has that child is dropped** from the payload (`:184-192`). App: when switching to an ancestor chart, it fetches families-as-child for the root and picks a default FAMC: the only family, else the first whose label says "birth", else the first. | `famc`, `famcOverrides` → no field of its own, it shapes `unions[]`. families-as-child → `familiesOfOrigin[{family, parents, parentsLabel, children}]` | `viewState.pedigreeFamcFamilyXref` / `pedigreeFamcOverrides` (`src/types.ts:96-101`; set in `src/reducer/applyPedigreeViewPatches.ts:26-72`), sent as query params (`useChartViewFetch.ts:155-166`). **`PedigreeChartBuilder` never reads them.** |
| 3a | **Birth family of a child** | Server `parents-label-for-family.ts:68-88`; engine `src/builder/FamilyTreeBuilder.ts:232-240`, `applyShowSiblings.ts:14-16`, `applyParents.ts:29-32`, `DescendancyViewStrategy.ts:157-162`; app `pedigreeDefaultFamc.ts:16-17`, `usePedigreeRootExpansion.ts:73-75` | Five different rules for the same question. See §6, item 1. | – | Every chart. |
| 4 | **Pedigree rules** | Server: `pedigree/route.ts:74-75, 164-180, 193-201, 219-227` (33); `lib/tree-ancestry.ts:97-130` (34). **67**. App: `src/components/TreeViewer/v2/hooks/usePedigreeRootExpansion.ts:57-122` (65), `.../detail/families-as-spouse/route.ts:24-97` (74) | Server: the ancestor cone to `depth` (1–20, default 10), through **all** parents (birth and adoptive) in `gedcom_parent_child`. It keeps every family in which an ancestor is husband, wife or child, so every ancestor's siblings and other marriages come along. It makes no placeholders, no collapse and no root siblings: those are client-side. The root's "Show siblings" and "Show children" fetch the two detail routes instead. | `root`, `depth` → `people[]`, `unions[]`. Detail routes → `familiesOfOrigin[]`, `familiesAsSpouse[]` | `src/chartView/PedigreeChartBuilder.ts:55-129` (fan and vertical reuse it). `usePedigreeRootExpansion`. |
| 5 | **`multiFamilyChildXrefs`** | `pedigree/route.ts:203-217`. **15** | Xrefs of the root and ancestors who are a child in more than one family, counted from parent-child rows. It runs before the closure at `:219`, so siblings and spouses are never listed. | → `multiFamilyChildXrefs[]` | `useChartViewFetch.ts:191-193` → `pedigreeMultiFamilyChildXrefs`. **UI only**: prefetch (`src/components/TreeViewer/v2/hooks/useChartDataFetch.ts:53-59`), and the "Choose parent family" button (`src/components/DescendancyChart/FamilyTreeNodes/TreeNodes.tsx:82-92`, `src/components/TreeViewer/v2/fan/FanChartContent.tsx:210-218`, `lib/pedigreeCardActions.ts:67-73`). |
| 6 | **Child type (`pedi`)** | `parents-label-for-family.ts:13-28, 90-124` (42); call sites `descendancy/route.ts:122-129`, `pedigree/route.ts:104-111`, `sibling-view/route.ts:118-125` (24). **66** | For each (family, child): `"birth"` only if every parent row says birth. It reads PEDI first, then `relationship_type`, which defaults to biological. Anything else (adopted, foster, step, sealing, or mixed) becomes `"adopted"`. | → `unions[].children[].pedi` | `FamilyTreeBuilder.ts:238`, `applyShowSiblings.ts:15`, `applyParents.ts:31`, `DescendancyViewStrategy.ts:161`. UI: `src/components/TreeViewer/v2/ToastMessage.tsx:49`. |
| 7 | **Living-person redaction** | `lib/auth/living-person-privacy.ts:26-33, 50-73` (30), `lib/auth/public-viewer.ts:10-19` (9), `lib/auth/public-viewer-context.ts:18-24` (7). **46**. The living flag itself is computed at import: `../the-gonsalves-family-admin/lib/admin/admin-individual-living.ts:7-64` (47), `.../gedcom-import-apply.ts:443-466` (20) | Applies to **signed-out visitors only**: any signed-in user sees everything (`public-viewer.ts:16-19`). Living people keep their name and birth year. `birthDate` becomes the year. `birthPlace`, `deathDate`, `deathPlace`, `deathYear`, `photoUrl` and `portraitSrc` become null (`living-person-privacy.ts:50-66`). | auth cookie → `people[].*` | All three chart routes (`descendancy:207`, `pedigree:283`, `sibling-view:353`). The engine copies `isLiving` (`useChartViewFetch.ts:91`) to the cards. |
| 8 | **person-chart-options** | `src/app/api/tree/person-chart-options/route.ts:12-33, 63-116`. **71** | Headcounts for the individuals directory: the ancestor cone (all parents) and descendants plus spouses, to depth 6 (the engine's `DEFAULT_MAX_DEPTH`), plus a display name that is redacted for living people. | `personId` (**DB uuid**) → `personId`, `xref`, `displayName`, `depth`, `options[{chart, label, description, count}]` | **UI only**: `src/components/individuals/PersonCardTreeModal.tsx:64-75, 195-207`. The tree viewer doesn't use it. |
| 9 | **Ids and field mapping** | `normalizeXref` ×3 (`descendancy/route.ts:45-48` and copies, 12); people mapping ×3 (`descendancy:164-177`, `pedigree:240-253`, `sibling-view:274-287`, 42); union mapping ×3 (`descendancy:179-200` and copies, 66); `lib/individual-mapper.ts:12-24, 30-42, 79-96, 121-169` (86). **206** | Wraps bare ids in `@…@`. For a person: `id` = xref and `uuid` = DB id. First and last names come from the primary name form, else from parsing `Given /Surname/`. Years come from DB columns, else from the first 4-digit year in the display date. Places use the full place label. Gender is "Male", "Female", "Unknown" or "Other". For a union: `id` = FAM xref, plus `uuid`. `husb`/`wife` hold the xref, or `""` when missing. Children carry their `pedi`. | → `people[]`, `unions[]` | `useChartViewFetch.ts:67-101` keeps id, uuid, names, years, places, photo, gender and isLiving, and drops the rest. A `""` spouse becomes one shared "Unknown" person (`FamilyTreeBuilder.ts:137-151`). |

## 3. Each piece: already client-side? still needed? what to port?

| # | Already client-side | With the whole file in memory | To port |
|---|---|---|---|
| 1 | The engine already draws only what is revealed. Depth is a build option (`src/constants.ts:10`). | **Vanishes.** Charts will see more than Gonsalves sends: for example, the root's spouse's other marriages (the route walks only descendants' spouses). "+N" counts become whole-file counts. | Nothing. One prerequisite from Part 1: the O(N) union index. At af03705, `src/builder/build.ts:43-44` copies the whole union map for every person, so the cost grows from payload² to file². **Done on `engine-v0.1.0` (phase 1, bug H3).** |
| 2 | Drawing is client-side (`DescendancyViewStrategy.ts:262-341`, `buildLegendItems.ts`). `applyShowSiblings.ts:10-62` sets the root and an empty `siblingView`, then waits for the API. | The graph selection (`:109-261`, 137 lines) **vanishes**. The five meta fields are **still needed**. | `computeSiblingView(snapshot, personId) → { rootId, siblingView }`. `applyShowSiblings` fills it straight away. Keep `SET_SIBLING_VIEW_FROM_API` for Gonsalves. The same-couple dedupe (`:152-159`) comes along. |
| 3 | The `viewState` fields and reducers exist (`applyPedigreeViewPatches.ts`). `PedigreeChartBuilder` ignores them: it follows `getBirthUnionByChild()` (`:57, :84`) and relies on the server having dropped the other families. | **Still needed**, and silently broken without the server: every FAMC is in the snapshot, so a choice changes nothing. This is the spec's Part 1 bug "the pedigree honours `pedigreeFamcFamilyXref`/overrides". | In `PedigreeChartBuilder`, the parent union is the override for this person, else the root FAMC for the root, else `birthFamilyOf`. Add `parentFamiliesOf(snapshot, id)` for the picker (families, parents, kind, children sorted) and `defaultFamc(snapshot, id)`. |
| 3a | Four client-side rules exist. | Still needed, but as **one** rule. | `birthFamilyOf(snapshot, id)`, used by the builder, the reducers, the sibling view and the default FAMC. |
| 4 | Already client-side: placeholders for missing parents (`PedigreeChartBuilder.ts:23-37, 89-117`), shadows for cycles (`:73-76`), collapse (`:59, 78-80`) and depth (`:58, 81`). | The ancestor cone **vanishes**. The root's siblings and children still need data. | `siblingsOf(snapshot, id)` and `childrenOf(snapshot, id)`, replacing the two detail-route fetches. The placeholder check must change for per-family placeholder ids (§6, item 10). |
| 5 | `TreeNodes.tsx:82-92` falls back to "more than one parent union". The fan chart has no fallback. | It becomes one index lookup. | `hasMultipleParentFamilies(snapshot, id)`, used by every chart's card. |
| 6 | The engine only tests `pedi === "birth"`. | Still needed, but it is part of reading the file. | Goes in the step-2 conversion (enricher `ParentChild` → union child type), not in the engine. About 30 lines there. |
| 7 | The engine copies `isLiving`, and treats a missing value as **not** living (`useChartViewFetch.ts:91`). The spec says missing means living. | Server redaction **vanishes**: there is no viewer identity, and the file is the visitor's own. It is replaced by the T3 "Hide living people" switch. | `applyPrivacy(person, "show" \| "hide-living")` in the renderer package. The living rule goes in the step-2 conversion (spec Part 2). |
| 8 | – | Optional. The viewer's start-person suggestion ("most relatives within 3 generations", spec Part 4.2) needs a similar count. | `countAncestors` / `countDescendants(snapshot, id, depth)`. |
| 9 | `useChartViewFetch.ts:67-101` maps the wire format. | **Replaced** by the step-2 conversion, which emits the engine types directly. | Only `normalizeXref` at the URL-fragment boundary, in the viewer. The field contract must match (§6, item 9). |

## 4. Proposal: where each piece lives

**Recommendation:** the engine gets a small module of **pure functions over the `GraphSnapshot` and its indexes** (Part 1 step 2), for example `src/graph/queries.ts`. They use no React, no fetch and no globals. Gonsalves keeps its routes for now (spec Part 1.4) and can move to these functions later.

| Function | Home | Replaces |
|---|---|---|
| `birthFamilyOf(snapshot, personId) → unionId \| null` | engine | the five rules in §6, item 1 |
| `parentFamiliesOf(snapshot, personId) → [{ unionId, husb, wife, kind, children }]` | engine | families-as-child (for charts) and its `parentsLabel` |
| `defaultFamc(snapshot, personId)` | engine | `pedigreeDefaultFamc.ts` and the fetch in `useChartStrategyChange` |
| `hasMultipleParentFamilies(snapshot, personId)` | engine | `multiFamilyChildXrefs` |
| `computeSiblingView(snapshot, personId) → { rootId, siblingView }` | engine | the sibling-view route's meta |
| `siblingsOf`, `childrenOf` | engine | the detail-route fetches in `usePedigreeRootExpansion` |
| `countAncestors`, `countDescendants(snapshot, id, depth)` | engine | person-chart-options counts; the start-person suggestion |
| `PedigreeChartBuilder` honours `famc`/overrides | engine | the pedigree route's pruning |
| Child type (`pedi`), `isLiving`, per-family placeholders, gender strings | step-2 conversion (viewer JS) | route mapping and the import's living rule |
| `applyPrivacy(person, mode)` | renderer package, also used by the viewer | `redactTreePersonForViewer` |

**Why privacy should not live in the engine:**
- In Gonsalves, redaction must stay on the server, so the data never reaches a signed-out browser. In the viewer, the file is the visitor's own and never leaves their browser, so hiding is only about what is shown.
- T3 toggles it while the page is open (off on screen, on by default for export). Re-deriving the snapshot would rebuild the layout and lose the view state. A display transform does neither.
- Layout doesn't depend on it, because card sizes stay the same.
- It must reach everything drawn or exported: card text, the accessible names ("Mary Smith, 1850–1921", spec Part 3), the details panel, search results, and the export file name `<file>-<chart>-<root name>`. One function from the renderer, applied at each of those points, covers all of them.

**The living rules differ:**

| | Gonsalves | Spec (Part 2 and Part 4.5) |
|---|---|---|
| Who is living | An automatic rule at import (`admin-individual-living.ts:39-64`). Dead if a DEAT event has a date or a place (`gedcom-import-apply.ts:465`). Otherwise living if there is no birth year, or if born less than **120** years ago. Admins can force living or deceased (`admin-individual-living.ts:46-47`). | No DEAT, BURI or CREM event, and born within the last **100** years or no dates at all. If a death year can't be read, the person counts as dead. |
| `1 DEAT Y`, no date or place | living (`deathKnown` is false) | dead |
| BURI or CREM only | living | dead |
| No birth date, married in 1820 | living | dead, because there are dates |
| What is hidden | Birth place, death date, place and year, photo. **The name and birth year are kept** (`living-person-privacy.ts:50-66`). | Everything: the person shows as `Living`, with no dates, places or details. |
| For whom | Signed-out visitors only | Everyone, when the switch is on |

## 5. Port size, and what blocks what

These are estimates: lines of new code and tests, by analogy with the code they replace.

| # | New code | Tests | Blocks in the viewer |
|---|---|---|---|
| 1 Graph selection | 0 | 0 (Part 1's O(N) build test covers it) | – |
| 2 `computeSiblingView` + reducer change | 55 + 15 | 120 | Descendancy: "Show parents & siblings" |
| 3, 3a `birthFamilyOf`, `parentFamiliesOf`, `defaultFamc`, FAMC in `PedigreeChartBuilder` | 20 + 35 + 10 + 15 | 120 | Ancestor charts: "Choose parent family", and the right parent family when the root has several. Descendancy: consistent roots for "Show parents" and "Show parents & siblings". |
| 4 `siblingsOf`, `childrenOf`, placeholder check | 25 + 10 | 60 | Ancestor charts: the root's "Show siblings" and "Show children" |
| 5 `hasMultipleParentFamilies` | 5 | 10 | The "Choose parent family" button |
| 6 `pedi` | 0 in the engine (about 30 + 30 tests in step 2) | – | Birth-family choice in every chart |
| 7 `applyPrivacy` | 25 (renderer) | 50 | Export (T3 is on by default there) and the Hide-living switch |
| 8 Counts | 25 | 40 | The start-person suggestion (optional) |
| 9 URL normalisation | 5 (viewer) | 10 | – |
| **Total** | **~245** | **~410** | About 655 lines, plus about 60 in step 2 |

The port is smaller than the ~840 server lines because the graph selection (about 165 lines across pieces 1, 2 and 4) and the field mapping (206 lines) vanish.

**What doesn't block:** drawing any of the four charts from a chosen root needs none of these pieces. It needs only Part 1's snapshot, the removal of the global builder and the O(N) build. So the viewer can show charts before the ports land. The ports unlock the card actions and export.

## 6. Open questions and surprises

1. **Five "birth family" rules that can disagree.**
   - Sibling-view route: the family where every parent row is birth-like, with the **lowest DB uuid** winning (`parents-label-for-family.ts:83-85`). Otherwise, the first row in SQL order, and that query has no `ORDER BY` (`sibling-view/route.ts:109-112`).
   - Engine builder: the **last** union in payload order with `pedi` `"birth"`, else the first (`FamilyTreeBuilder.ts:232-240`).
   - Engine reducers: the **first** union with `pedi` `"birth"`, else the first (`applyShowSiblings.ts:14-16`, `applyParents.ts:29-32`, `DescendancyViewStrategy.ts:157-162`).
   - App: the first family, in families-as-child order, whose label says birth (`pedigreeDefaultFamc.ts:16-17`, `usePedigreeRootExpansion.ts:73-75`). That SQL has no `ORDER BY` either.

   With two birth-like families, which is common in files without PEDI, "Show parents & siblings" roots the chart at the client's pick (`applyShowSiblings.ts:18`; the response `rootId` is ignored), while the catch-alls and the legend come from the server's pick. Uuid order is random, so the viewer can't copy the first rule. **Proposal:** one rule, with ties broken by the order of the FAMC links on the INDI record (file order). Gonsalves's behaviour may change when it adopts the rule, so this needs momolig's OK.
2. **The chosen parent family only works because the server deletes the other families** from the payload (`pedigree/route.ts:184-192`). With the whole file loaded, `PedigreeChartBuilder` ignores the choice. Spec Part 1.5 already lists this bug; this inventory confirms it blocks "Choose parent family" in the viewer.
3. **Redaction gaps in Gonsalves.** These aren't viewer issues, but they are worth a Gonsalves bug. The routes spread all of `mapIndividualRow` into each person (`descendancy/route.ts:164-177`), and redaction overrides only 7 fields. So for living people, `birthCountry`, `deathCountry`, their `…Lower` copies, `ageAtDeath` and `generationDepth` reach signed-out browsers in the JSON. The engine drops them before drawing. Names and birth years are never hidden in charts, by design.
4. **The living rule differs** (see the table in §4). `1 DEAT Y`, with no date or place, is the common case Gonsalves marks as living (`gedcom-import-apply.ts:453, 465`). The import also ignores BURI and CREM. Admins can override the flag by hand, and a file can't carry that override.
5. **The sibling view of a fatherless person.** The server roots at the person (`sibling-view/route.ts:164-179`). The client roots at the birth union's `husb`, which is `""` (`applyShowSiblings.ts:18`). That is the one shared "Unknown" person, whose unions are every fatherless family in the payload. Per-family placeholders (spec Part 1.5) fix the id. `computeSiblingView` should still root at the mother or the person, as the server does.
6. **Child order is undefined.** Families and parent-child rows load without `ORDER BY` (`descendancy/route.ts:88-95`), and the engine never sorts children, so the order of siblings on the chart is whatever Postgres returns. The detail routes sort children by birth date (`families-as-child/route.ts:108-118`). The enricher gives `FamilyChildren.BirthOrder`, which is file order. **Decide:** file order, or birth date with file order as the tie-break. Spec Part 1.5 lists "sibling order" as a suspected bug.
7. **DB uniqueness hides duplicates.** `gedcom_parent_child_v2` is unique per (parent, child), and `gedcom_spouses_v2` per (person, spouse) (`/srv/apps/gonsalves/packages/ligneous-prisma/prisma/schema.prisma`, models `GedcomParentChild` and `GedcomSpouse`). The enricher's tables have no such limit. So the viewer's graph keeps both FAMs of a duplicated couple (the spec bug "two FAM records for the same couple") and a child listed twice. Also, spouse rows exist only when both partners exist (`/srv/apps/gonsalves/ligneous-gedcom-lib/enricher/enricher.go:679-684`), so the server's `spouseCatchAlls` ignore single-parent families. A port based on unions will include them. That is a change, and probably a fix.
8. **DB-only ids.** Uuids drive the birth-family tie-break (item 1), person-chart-options' `personId`, profile links (`src/components/TreeViewer/v2/FamilyTree.tsx:92`) and `rootUuid`, which nothing reads. Everything else keys on xrefs. At least four places assume that a union's `id` is the FAM xref: `pedigreeFamcFamilyXref`, the `famcOverrides` values, `siblingView.adoptiveUnions` (looked up in `getUnionById`, `DescendancyViewStrategy.ts:303`) and `familyUnitScope.familyXref`. So the conversion must set `UnionRecord.id` to the FAM xref, `@…@` included. The enricher keeps the `@` signs (`enricher/enricher_test.go:333`). The fallback id `${husb}-${wife}` (`FamilyTreeBuilder.ts:201, 216`) collides for two FAMs of one couple, so every union needs an id.
9. **The field contract for the conversion:**
   - gender must be "Male", "Female", "Unknown" or "Other" (`individual-mapper.ts:36-42`), because the cards pick their icons from it;
   - first and last names split like `mapIndividualRow` does;
   - years come from the date's year, else the first 4-digit year in the date text (`individual-mapper.ts:79-96`). That regex matches only 1000–2029.
10. **How unknown parents are detected.** Today it's by an empty id (`PedigreeChartBuilder.ts:89-117`) or by `firstName === "Unknown"` (`applyParents.ts:35`, `DescendancyViewStrategy.ts:163`). Per-family placeholder ids such as `<familyId>:unknown-husb` aren't empty, so switch these checks to a flag. `_unknownPlaceholder` already exists (`src/types.ts:35`). A real person named "Unknown" is also misread today.
11. **Getters cost O(N) per call with the whole file.** Every global getter copies a full map (`src/builder/currentBuilder.ts:19-49` → `FamilyTreeBuilder.ts:90-133`). There are 29 call sites, and some run once per node (`build.ts:43-44`, `DescendancyViewStrategy.ts:239`). The server's depth-limited payload hid this cost. Part 1's snapshot indexes are a hard prerequisite. *(Done on `engine-v0.1.0`: the getters are gone and every lookup is an index read on the GraphSnapshot.)*
12. **`pedi` collapses to birth or adopted** (`parents-label-for-family.ts:95-100`). The picker label ("Parents (foster)") needs the finer kind. Option: the conversion puts the kind into `UnionChild.pedi` (`"birth"`, `"adopted"`, `"foster"`, `"step"`, `"sealing"`). The engine only tests `=== "birth"`, so it keeps working. It changes the meaning of a shared field, though, so it needs agreement first (spec Part 2).
13. **Privacy tied to sign-in.** families-as-child and families-as-spouse refuse living people to signed-out visitors (`requireFullPersonDetailAccess`, `families-as-child/route.ts:22-23`). So on the public Gonsalves site, "Choose parent family" and the root's "Show siblings/children" fail on a living root. This doesn't apply to the viewer.
14. **Depth caps differ.** The server allows 1–20 (default 10). The app caps ancestor charts at 4 (`DEFAULT_PEDIGREE_DEPTH`, `src/components/TreeViewer/v2/hooks/useChartFetchBuildPolicy.ts:52-62`), and descendancy defaults to 6. With no fetch, only the build cap remains, and the viewer can choose its own.
15. **Counts don't match the charts.** person-chart-options counts adoptive ancestors (all parent rows) and spouses' step-lines (`tree-ancestry.ts:154-161`), so "N people" isn't what the chart draws. If the viewer shows counts, it should count what the chart draws.
