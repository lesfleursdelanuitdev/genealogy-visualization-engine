# Genealogy visualization engine — refactor plan

This document turns the architectural goals into a concrete, phased plan. It targets **`@ligneous/visualization-engine`** (`packages/genealogy-visualization-engine`).

## Current weaknesses (why refactor)

The package has a clear **boundary** (exports, folder layout) but **behavioral coupling** remains:

- **`builder/build.ts`** imports graph accessors from **`testdata`** while production data is supposed to flow through **`FamilyTreeBuilder`** / **`currentBuilder`**.
- **`currentBuilder.ts`** is a **global bridge** (`setCurrentBuilder`, module-level state), so the engine is not a pure “input → output” function.
- **`useDescendancyFetch`** couples **HTTP** (hardcoded `/api/tree/...` routes), **wire formats** (`ApiPerson`, `ApiUnion`), and **domain** (`FamilyTreeBuilder`, `setCurrentBuilder`) in one hook.
- **`strategies/descendancy/DescendancyViewStrategy.ts`** imports **`getUnionById` / `getUnionsByPerson` from `testdata`**, even though `BuildContext` already carries `people` and union lists — test harness leaking into runtime strategy code.

Together, the flow is still partly:

`input data + legacy/global compatibility layer + strategy behavior`

instead of strictly:

`input data → builder → strategy → layout → output tree`

---

## Goal state (definition of done)

The package exposes a **single explicit pipeline**:

**Normalized graph input → builder (materialize registries) → `buildTree` / strategies → layout helpers → chart model**

No **production** path should depend on:

- **`testdata`** (except tests, demos, or explicit test helpers)
- **`setCurrentBuilder` / `getPeople()`-style ambient accessors**
- Hooks that **both** know HTTP routes **and** own domain construction

---

## Phase 0 — Inventory & guardrails (short)

**Deliverables**

- Dependency map: every module that imports **`testdata`**, **`currentBuilder`**, or constructs **`FamilyTreeBuilder`** inside hooks.
- **Semver policy**: expect **breaking** API changes unless deprecated shims are kept for one release.

**Acceptance**

- Agreed target public API for apps (e.g. `createDescendancySession({ graph, viewState, options })` vs today’s scattered calls).

---

## Phase 1 — Introduce formal **graph input** (no globals)

**Problem today:** `buildTree` pulls `getPeople`, `getUnionsByPerson`, `getAllChildrenOf` from **`testdata`**, while real data is routed through **`currentBuilder`**. Two incompatible “sources of truth.”

**Deliverables**

- A **`GraphSnapshot`** (name flexible) holding everything `buildTree` + strategies need, e.g.:
  - `people: Map<id, DescendancyPerson>`
  - `unionsByPerson`, `unionById`, `parentUnionsByChild`, `birthUnionByChild`, etc. — only what is required; derive redundant indexes in **one** place.
- **`FamilyTreeBuilder`** (or a slimmer `GraphBuilder`) produces a `GraphSnapshot` from API JSON — conversion should **not** be the only path inside a React hook.

**Acceptance**

- `buildTree(rootId, strategy, options)` receives an explicit **`graph: GraphSnapshot`** (or equivalent on `BuildTreeOptions`) and **does not import `testdata`**.

---

## Phase 2 — Remove `testdata` from production strategies

**Problem today:** `DescendancyViewStrategy` imports from **`testdata`** despite `BuildContext` already exposing `people` and `allUnionsFor`.

**Deliverables**

- Strategy code uses **only**:
  - `BuildContext` (`ctx`), and
  - indexes on **`GraphSnapshot`** or passed into the strategy constructor (e.g. `unionById`).
- Keep **`testdata`** for fixtures and optional `createTestGraphSnapshot()` used only in tests/dev.

**Acceptance**

- No `from ".../testdata"` in `strategies/**` except dedicated test-only modules if needed.

---

## Phase 3 — Remove the **global builder bridge** from the default API

**Problem today:** `currentBuilder.ts` is module-level mutable state.

**Deliverables**

- Deprecate or move `setCurrentBuilder` / `clearCurrentBuilder` to `internal/` or `compat/`.
- Replace globals with:
  - **`GraphSnapshot` everywhere**, or
  - an explicit **`BuildSession`** (`{ snapshot, ... }`) per navigation/root change.

**Acceptance**

- Two chart builds can run **without shared mutable module state** (verifiable in tests).

---

## Phase 4 — Decouple **`useDescendancyFetch`** from Next / app routes

**Problem today:** Hardcoded `/api/tree/descendancy` and `/api/tree/sibling-view`, plus wire types and `FamilyTreeBuilder` / `setCurrentBuilder` in one hook.

**Deliverables (choose one primary pattern)**

**Option A (recommended):** Split responsibilities:

1. **Pure package:** `parseDescendancyPayload(json: unknown): GraphSnapshot` (and related parsers) — **no `fetch`**.
2. **App (`the-gonsalves-family`):** `fetch` + call parser.

**Option B:** Single repo, two entry points:

- Package root: **pure only**
- `@ligneous/visualization-engine/react`: thin hooks with **injected** `fetchDescendancy: (args) => Promise<unknown>` — **no default URL** to a specific app.

**Acceptance**

- No `/api/tree/` strings in the core package.
- Apps can change API shape/version without forking the engine.

---

## Phase 5 — Clarify **builder vs `buildTree`** responsibilities

**Problem today:** Overlap between `FamilyTreeBuilder` and `buildTree`; comments still describe “current builder” as the data source.

**Deliverables**

- Document and enforce:
  - **Builder:** wire JSON → **normalized snapshot** (indexes, validation).
  - **`buildTree`:** snapshot + strategy → **ChartNode** tree.
- Remove duplicate accessors (same union maps on builder vs free functions).

**Acceptance**

- One obvious app-facing entry (e.g. `buildDescendancyChart({ snapshot, viewState, maxDepth })`) if desired.

---

## Phase 6 — Migrate **`the-gonsalves-family`**

**Deliverables**

- Fetch in app layer; call pure parsers from the package; pass **`GraphSnapshot`** into chart UI.
- Optional **compat shim** for one release if needed.

**Acceptance**

- No user-visible regression; package contains no app-specific HTTP.

---

## Phase 7 — Tests & non-goals

**Deliverables**

- Unit tests: snapshot construction, strategy logic **without** globals, `buildTree` depth/collapse.
- React layer memoizes **snapshot** to avoid rebuilding maps every render.

**Non-goals for this refactor**

- Visual redesign or changing layout rules — **data plumbing and boundaries** unless a bug blocks correctness.

---

## Suggested order of work

1. **GraphSnapshot + explicit `buildTree` input** (Phase 1) — unblocks the rest.
2. **Strategies stop importing `testdata`** (Phase 2).
3. **Remove global `currentBuilder` from the hot path** (Phase 3).
4. **Split / inject `useDescendancyFetch`** (Phase 4).
5. **Clarify builder vs `buildTree`** (Phase 5).
6. **App migration** (Phase 6).
7. **Tests** (Phase 7).

---

## Risk notes

- Expect **semver major** or a maintained **`compat`** layer for one version.
- After each phase, grep for **`testdata`**, **`currentBuilder`**, and **`/api/tree/`** in the package to prevent regressions.
