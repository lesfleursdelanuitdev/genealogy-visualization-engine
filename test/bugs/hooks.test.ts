// @vitest-environment jsdom
/**
 * Audit bugs in the React hooks. IDs follow docs/v0.1.0-progress.md ("Bug list").
 *
 * The renderer draws the chart at `translate(baseX + pan.x, baseY + pan.y) scale(scale)`
 * (Gonsalves ChartViewport.tsx:173), so layout point L appears on screen at
 * base + pan + L * scale. The zoom repros check that rule.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, createElement, useRef } from "react";
import { knownBug } from "../helpers/bugs";
import { renderHook, settle, deferred, type Deferred } from "../helpers/renderHook";
import { peopleOfAdapter, person } from "../helpers/graph";
import { useChartViewFetch, usePanZoom, useDepth, type PanZoomBounds } from "../../src";

// ─── fetch stub ──────────────────────────────────────────────────────────────

interface FakeResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
}

function ok(payload: unknown): FakeResponse {
  return { ok: true, status: 200, statusText: "OK", json: () => Promise.resolve(payload) };
}

function rootParam(url: string): string {
  return new URL(url, "http://localhost").searchParams.get("root") ?? "";
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("H2: stale chart responses", () => {
  knownBug("H2", "after a quick A→B root switch, A's late answer does not replace B's chart", async () => {
    const pending = new Map<string, Deferred<FakeResponse>>();
    vi.stubGlobal("fetch", (url: string) => {
      const d = deferred<FakeResponse>();
      pending.set(rootParam(url), d);
      return d.promise;
    });

    const h = await renderHook((p: { root: string }) => useChartViewFetch("descendancy", p.root, 4), {
      root: "@A@",
    });
    await h.rerender({ root: "@B@" });

    pending.get("@B@")!.resolve(ok({ rootId: "@B@", people: [person("@B@", "Bea")], unions: [] }));
    await settle();
    pending.get("@A@")!.resolve(ok({ rootId: "@A@", people: [person("@A@", "Ann")], unions: [] }));
    await settle();

    expect(h.current.lastApiRootId).toBe("@B@");
    expect(peopleOfAdapter(h.current.chartAdapter).has("@B@")).toBe(true);
    await h.unmount();
  });
});

describe("B07: loading flag", () => {
  knownBug("B07", "a response that arrives before the 0 ms timer does not leave the chart loading", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(ok({ rootId: "@A@", people: [person("@A@")], unions: [] }))
    );
    const h = await renderHook(() => useChartViewFetch("descendancy", "@A@", 4), undefined);
    await settle();
    expect(h.current.isChartLoading).toBe(false);
    expect(h.current.lastApiRootId).toBe("@A@");
    await h.unmount();
  });

  it("a slow response ends loading", async () => {
    const d = deferred<FakeResponse>();
    vi.stubGlobal("fetch", () => d.promise);
    const h = await renderHook(() => useChartViewFetch("descendancy", "@A@", 4), undefined);
    await settle();
    expect(h.current.isChartLoading).toBe(true);
    d.resolve(ok({ rootId: "@A@", people: [person("@A@")], unions: [] }));
    await settle();
    expect(h.current.isChartLoading).toBe(false);
    await h.unmount();
  });
});

describe("B14: living people", () => {
  knownBug("B14", "a person with no isLiving in the payload counts as living", async () => {
    vi.stubGlobal("fetch", () => {
      const { isLiving: _omit, ...noLivingFlag } = person("@A@", "Ann");
      return Promise.resolve(ok({ rootId: "@A@", people: [noLivingFlag], unions: [] }));
    });
    const h = await renderHook(() => useChartViewFetch("descendancy", "@A@", 4), undefined);
    await settle();
    expect(peopleOfAdapter(h.current.chartAdapter).get("@A@")?.isLiving).toBe(true);
    await h.unmount();
  });
});

// ─── pan / zoom ──────────────────────────────────────────────────────────────

const VIEWPORT = { width: 800, height: 600 };

beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: VIEWPORT.width,
    bottom: VIEWPORT.height,
    width: VIEWPORT.width,
    height: VIEWPORT.height,
    toJSON: () => ({}),
  });
});

interface PanZoomProps {
  bounds: PanZoomBounds;
  baseX: number;
  baseY: number;
}

function usePanZoomHarness(p: PanZoomProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pz = usePanZoom({ svgRef, bounds: p.bounds, baseX: p.baseX, baseY: p.baseY });
  return { svgRef, pz };
}

async function renderPanZoom(props: PanZoomProps) {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
  );
  const h = await renderHook(usePanZoomHarness, props, (r) =>
    // Same wiring as Gonsalves ChartViewport: React onWheel on the <svg>.
    createElement("svg", { ref: r.svgRef, onWheel: r.pz.onWheel })
  );
  await settle();
  const svg = h.container.querySelector("svg");
  if (!svg) throw new Error("harness rendered no <svg>");
  return { h, svg };
}

/** Screen position of layout point (lx, ly) under the current pan/zoom. */
function toScreen(
  pz: { pan: { x: number; y: number }; scale: number },
  base: { x: number; y: number },
  lx: number,
  ly: number
) {
  return { x: base.x + pz.pan.x + lx * pz.scale, y: base.y + pz.pan.y + ly * pz.scale };
}

const BOUNDS: PanZoomBounds = { minX: -420, maxX: 1500, maxY: 900 };
const BASE = { x: 500, y: 80 };
const panZoomProps: PanZoomProps = { bounds: BOUNDS, baseX: BASE.x, baseY: BASE.y };

async function resetView(pz: { setPan(p: { x: number; y: number }): void; setScale(s: number): void }) {
  await act(async () => {
    pz.setPan({ x: 0, y: 0 });
    pz.setScale(1);
  });
}

describe("B01: zoom keeps the point under the pointer", () => {
  knownBug("B01", "wheel zoom keeps the layout point under the mouse in place", async () => {
    const { h, svg } = await renderPanZoom(panZoomProps);
    await resetView(h.current.pz);
    const mouse = { x: 400, y: 300 };
    const under = { x: (mouse.x - BASE.x) / 1, y: (mouse.y - BASE.y) / 1 };

    await act(async () => {
      svg.dispatchEvent(
        new WheelEvent("wheel", { deltaY: -100, clientX: mouse.x, clientY: mouse.y, bubbles: true, cancelable: true })
      );
    });

    expect(h.current.pz.scale).toBeGreaterThan(1);
    const after = toScreen(h.current.pz, BASE, under.x, under.y);
    expect(after.x).toBeCloseTo(mouse.x, 6);
    expect(after.y).toBeCloseTo(mouse.y, 6);
    await h.unmount();
  });

  knownBug("B01", "pinch zoom keeps the layout point under the fingers in place", async () => {
    const { h, svg } = await renderPanZoom(panZoomProps);
    await resetView(h.current.pz);
    const touchEvent = (type: string, xs: [number, number]) => {
      const e = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(e, "touches", {
        value: xs.map((x) => ({ clientX: x, clientY: 300 })),
      });
      return e;
    };
    const center = { x: 400, y: 300 };
    const under = { x: center.x - BASE.x, y: center.y - BASE.y };

    await act(async () => {
      svg.dispatchEvent(touchEvent("touchstart", [300, 500]));
      svg.dispatchEvent(touchEvent("touchmove", [250, 550]));
    });

    expect(h.current.pz.scale).toBeCloseTo(1.5, 6);
    const after = toScreen(h.current.pz, BASE, under.x, under.y);
    expect(after.x).toBeCloseTo(center.x, 6);
    expect(after.y).toBeCloseTo(center.y, 6);
    await h.unmount();
  });
});

describe("B02: wheel listener", () => {
  knownBug("B02", "the wheel handler can cancel page scrolling (non-passive listener)", async () => {
    const { h, svg } = await renderPanZoom(panZoomProps);
    const wheel = new WheelEvent("wheel", { deltaY: -100, clientX: 10, clientY: 10, bubbles: true, cancelable: true });
    await act(async () => {
      svg.dispatchEvent(wheel);
    });
    expect(wheel.defaultPrevented).toBe(true);
    await h.unmount();
  });
});

describe("B08: bounds changes", () => {
  knownBug("B08", "a change of bounds (e.g. a partner revealed) keeps the user's zoom", async () => {
    const { h } = await renderPanZoom(panZoomProps);
    await act(async () => {
      h.current.pz.setScale(2);
    });
    await h.rerender({ ...panZoomProps, bounds: { ...BOUNDS, maxX: BOUNDS.maxX + 370 } });
    await settle();
    expect(h.current.pz.scale).toBe(2);
    await h.unmount();
  });
});

describe("S3 (suspected): fit to screen", () => {
  knownBug("S3", "fit to screen puts the whole chart width inside the viewport", async () => {
    const bounds: PanZoomBounds = { minX: 0, maxX: 2000, maxY: 1000 };
    const base = { x: 80, y: 80 };
    const { h } = await renderPanZoom({ bounds, baseX: base.x, baseY: base.y });
    await act(async () => {
      h.current.pz.fitToScreen();
    });
    const left = toScreen(h.current.pz, base, bounds.minX, 0).x;
    const right = toScreen(h.current.pz, base, bounds.maxX, 0).x;
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThanOrEqual(VIEWPORT.width);
    await h.unmount();
  });
});

describe("B15: no console.log in production", () => {
  knownBug("B15", "changing the depth from the dropdown logs nothing", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const h = await renderHook(
      () => useDepth({ dispatch: () => {}, viewState: {}, maxDepthRendered: 0, builder: null }),
      undefined
    );
    await act(async () => {
      h.current.handleMaxDepthChange(3);
    });
    expect(log).not.toHaveBeenCalled();
    await h.unmount();
  });
});
