# @ligneous/visualization-engine

Headless chart engine for family trees: it turns people and unions into laid-out chart nodes for descendancy, pedigree, vertical pedigree and fan charts.

**Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

The engine does the hard part of a family tree viewer: deciding which people and families appear, and where. It does not draw anything itself. It gives you nodes with `x`/`y` positions, connector geometry, bounds, and (for fan charts) SVG path strings. Your React app renders those as SVG or HTML.

## Screenshots

These come from the Gonsalves family site and its admin app running on a demo database, loaded with the public US-presidents sample tree (`pres2020.ged`) through the real import pipeline. No family data is shown.

<img src="docs/screenshots/pub-chart-descendancy.png" alt="Descendancy chart">

*Descendancy chart.*

<img src="docs/screenshots/pub-chart-pedigree.png" alt="Pedigree chart">

*Pedigree chart.*

<img src="docs/screenshots/pub-chart-fan.png" alt="Fan chart, five generations">

*Fan chart, five generations.*

<img src="docs/screenshots/pub-chart-fan-phone.png" alt="Fan chart on a phone" width="270">

*Fan chart on a phone.*

## What it does

- **Four chart types**, each a "view strategy":
  - `descendancy`: a person, their unions, and their descendants, top-down.
  - `pedigree`: ancestors left to right (proband in column 0, parents in column 1, and so on).
  - `vertical_pedigree`: ancestors bottom-up, proband at the bottom.
  - `fan_chart`: ancestors as rings of annular sectors around the proband.
- **Layout algorithms**
  - Descendancy uses a two-pass tree layout: subtree widths are computed post-order, then positions are assigned pre-order (`src/strategies/descendancy/layout.ts`).
  - Pedigree centers each person between their parents, father branch above mother branch, with tighter gaps for inner generations (`src/strategies/pedigree/pedigreeLayout.ts`).
  - Vertical pedigree centers each person under their parents' midpoint and reserves width per subtree (`src/strategies/verticalPedigree/verticalPedigreeLayout.ts`).
  - Fan chart geometry is polar: ring thickness per generation, sector paths, text-on-arc paths, label rotation and avatar placement (`src/strategies/fanChart/geometry.ts`, `render.ts`).
- **Real genealogy cases**: multiple spouses, adopted and foster children (GEDCOM `PEDI`), people who are a child in more than one family (`FAMC` choice per person), sibling views, collapsed subtrees, and "+N hidden descendants" badges at the depth limit.
- **Interaction state**: a reducer (`treeReducer`) with back/forward history (up to 21 entries), re-rooting, revealing spouses, showing parents/siblings/children, and panning to a person.
- **React hooks** for the viewer: pan/zoom, search, depth control, fetching chart data, spouse drawer, panel visibility.

## Where it fits in Ligneous

Ligneous is a genealogy platform. A Go library parses GEDCOM files; the data lives in Postgres and is read through Prisma by Next.js apps.

This package powers the interactive family tree on the public site, `the-gonsalves-family` (private). That app imports it through a TypeScript path alias (`@/genealogy-visualization-engine`) and renders the charts in `src/components/TreeViewer/v2`.

### Data it consumes

The engine works on its own small graph shape, defined in `src/types.ts`:

```ts
interface DescendancyPerson {
  id: string;            // GEDCOM xref, e.g. "@I123@"
  firstName: string;
  lastName: string;
  birthYear?: number | null;
  deathYear?: number | null;
  birthPlace?: string | null;
  deathPlace?: string | null;
  photoUrl?: string | null;
  isLiving?: boolean;    // used for living-person privacy on the public site
  gender?: string | null;
  // ...plus uuid and internal layout flags
}

interface UnionRecord {
  id?: string;           // family xref, or `${husb}-${wife}`
  husb: string;          // person id (rendered left)
  wife: string;          // person id (rendered right)
  children: { id: string; pedi: string }[]; // pedi: "birth", "adopted", "foster", ...
}
```

These are GEDCOM concepts (xrefs, `HUSB`/`WIFE`/`CHIL`, `PEDI`), but the engine does not read the Go parser's intermediate representation directly. In the Gonsalves app, the `/api/tree/descendancy`, `/api/tree/pedigree` and `/api/tree/sibling-view` routes query Postgres through Prisma and return `{ rootId, people, unions }` JSON, which `parseChartApiResponse` turns into engine input. The standalone viewer (tree-viewer.ligneous.org) builds the same input from a whole GEDCOM file in the browser.

## Install

The package is not published to npm (`"private": true`). `npm run build` writes ESM and `.d.ts` files to `dist/`; `main`, `types` and `exports` point there. The emitted imports have no file extensions, so `dist/` is meant for bundlers (Vite, Next, webpack, vitest), not bare Node ESM.

From a GitHub tag (the `prepare` script builds `dist/` on install):

```json
{
  "dependencies": {
    "@ligneous/visualization-engine": "github:lesfleursdelanuitdev/genealogy-visualization-engine#v0.1.0"
  }
}
```

Peer dependencies: `react` 19 (for the hooks) and `@tanstack/react-query` 5 (declared, though the current source does not import it).

## Usage

Build the graph once per file, then make a chart session for each chart and view state:

```ts
import {
  createGraphSnapshot,
  createChartSession,
  createTreeReducer,
  createInitialState,
  type DescendancyPerson,
  type UnionRecord,
} from "@ligneous/visualization-engine";

const people: DescendancyPerson[] = [
  { id: "@I1@", firstName: "Ana", lastName: "Silva", birthYear: 1901 },
  { id: "@I2@", firstName: "João", lastName: "Silva", birthYear: 1898 },
  { id: "@I3@", firstName: "Rosa", lastName: "Silva", birthYear: 1925 },
];
const unions: UnionRecord[] = [
  { id: "@F1@", husb: "@I2@", wife: "@I1@", children: [{ id: "@I3@", pedi: "birth" }] },
];

const graph = createGraphSnapshot({ people, unions }); // indexes built once

const session = createChartSession({
  graph,
  viewState: { revealedUnions: new Map([["@I2@", ["@I1@"]]]) },
  options: { strategy: "descendancy", maxDepth: 4 },
});
const { root, bounds, baseX, baseY } = session.buildChart("@I2@");
// Draw at translate(baseX + pan.x, baseY + pan.y) scale(scale): walk root.children for
// person cards and union diamonds, and use session.descriptor.connectors for the lines.

// Interaction state: a reducer bound to the same graph (works with React's useReducer).
const reduce = createTreeReducer(graph);
const next = reduce(createInitialState("descendancy", "@I2@"), { type: "REVEAL_ALL_SPOUSES" });
```

`strategy` can also be `"pedigree"`, `"vertical_pedigree"` or `"fan_chart"`. Sessions hold no shared state, so a page chart and a modal chart can build side by side. They are cheap; make a new one when the view state changes and keep reusing the snapshot.

A viewer with the whole file in memory needs nothing else: build one snapshot, then a session per view. The pure functions in `src/graph/queries.ts` answer what a server used to (parent families, sibling view, ancestor and descendant counts), and `searchPeople(graph, query)` searches names and years, 10 at a time.

An app that loads a chart's graph from a server uses `useChartViewFetch` with its own fetch function; the engine builds no URLs:

```ts
const { chartAdapter, graph, isChartLoading, error } = useChartViewFetch({
  fetchGraph: async (request) => {
    const res = await fetch(urlFor(request), { signal: request.signal }); // the app's own route
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return parseChartApiResponse(await res.json()); // Gonsalves wire format
  },
  strategyName: "descendancy",
  rootId,
  maxDepth: 4,
});
```

Only the newest request counts: a new root aborts the old request and late answers are ignored.

**"+N" chips.** On all four charts, a card at the depth limit or on a collapsed branch has `_hiddenCount`: how many different people are hidden beyond it (descendants, or ancestors on the ancestor charts). Dispatch `{ type: "SHOW_HIDDEN", personId }` when the chip is tapped: that branch gets one more generation, and a history entry is pushed.

**Pan and zoom** (`usePanZoom`): draw at `translate(baseX + pan.x, baseY + pan.y) scale(scale)`. The hook adds its own non-passive wheel and touch listeners and sets `touch-action: none` on the `<svg>`; wire only `onPointerDown/Move/Up`. Pass `viewKey` (e.g. `${chart}:${root}`) so the initial view applies once per chart. A press on a `button`, link or `[data-chart-interactive]` stays a tap unless it moves 4 px.

See `CHANGELOG.md` for what changed in 0.1.0.

## API summary

| Area | Main exports |
| --- | --- |
| Data in | `createGraphSnapshot`, `GraphSnapshot`, `GraphInput`, `DescendancyPerson`, `UnionRecord`, `ViewState`, `parseChartApiResponse` |
| Graph queries | `parentFamiliesOf`, `birthFamilyOf`, `defaultFamc`, `computeSiblingView`, `siblingsOf`, `familiesAsPartnerOf`, `countAncestors`, `countDescendants`, `countDescendantsWithin`, `searchPeople` |
| Charts | `createChartSession`, `ChartSession`, `ChartLayout`, `layoutChart`, `buildTree`, `CHART_VIEW_STRATEGIES` |
| Layout | `layout`, `getBounds`, `computeFitToViewport`, `defaultConnectors`, size constants (`PERSON_WIDTH`, `PERSON_HEIGHT`, `GAP`, ...) |
| Fan chart geometry | `buildFanGeometry`, `buildAnnularSectorPath`, `buildTextArcPath`, `polarToCartesian`, `computeAvatarPlacement`, `FAN_CHART_DEFAULTS` |
| Node model | `PersonNode`, `UnionNode`, `NormalUnionNode`, `CatchAllNode`, `LinkedParentNode`, `SiblingAdoptiveUnionNode` |
| State | `treeReducer(state, action, graph)`, `createTreeReducer(graph)`, `createInitialState`, `TreeState`, `TreeAction`, `HistoryEntry` |
| React hooks | `useChartViewFetch`, `useTreeBuild`, `usePanZoom`, `usePanToPerson`, `useChartSearch`, `useDepth`, `useSpouseDrawer`, `usePanelVisibility` |
| Helpers | `handlePersonCardAction`, `buildLegendItems`, `countVisibleNodes`, `createGraphIndividualsSearch` |

Everything is exported from the package root.

## Build and test

```sh
npm install
npm run typecheck   # tsc --noEmit over src/ and test/
npm test            # vitest run
npm run build       # dist/: ESM + .d.ts
npm run check       # all three
```

`test/app/` holds the 74 engine tests copied from the Gonsalves app (two adapted to 0.1.0, marked in place). `test/bugs/` holds the repros for the 2026-10-17 audit's bugs, all fixed in 0.1.0. A new known bug can be added with `knownBug()` (`test/helpers/bugs.ts`): an `it.fails` until its fix lands; `BUGS_STRICT=1 npx vitest run test/bugs` shows the real failures. `test/fixtures/smith` is a small fictional family for tests and demos.

## Known limits

- `dist/` is for bundlers only in v0.1.0 (T22): its imports have no file extensions, so bare Node ESM can't load it.
- Redaction of living people is the renderer's job (spec Part 3, `privacy: "hide-living"`); the engine only treats a missing `isLiving` as living.
- The 8 "TBD" card actions are decided with the renderer (step 3, T23).

Progress and decisions: `docs/v0.1.0-progress.md`. Server logic ported from Gonsalves: `docs/server-logic-for-standalone.md`.

## Stack

TypeScript (strict) and React 19 hooks. No D3 or canvas: the engine computes geometry and the app renders SVG.

## Related repos

- [Ligneous](https://github.com/lesfleursdelanuitdev/Ligneous): project overview
- [ligneous-gedcom-lib](https://github.com/lesfleursdelanuitdev/ligneous-gedcom-lib): Go GEDCOM parser, validator and exporter
- `the-gonsalves-family` (private): public site that uses this engine

## License

No license file: all rights reserved.

Part of Ligneous: https://github.com/lesfleursdelanuitdev/Ligneous
