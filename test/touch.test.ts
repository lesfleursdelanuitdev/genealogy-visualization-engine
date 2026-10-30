// @vitest-environment jsdom
/**
 * T31: pan and zoom on phones. The chart is drawn at translate(base + pan) scale(scale), so a
 * layout point L appears at base + pan + L · scale.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, createElement, useRef } from "react";
import { renderHook, settle } from "./helpers/renderHook";
import { usePanZoom, type PanZoomBounds } from "../src";

const BASE = { x: 500, y: 80 };
const BOUNDS: PanZoomBounds = { minX: -420, maxX: 1500, maxY: 900 };

beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, right: 390, bottom: 800, width: 390, height: 800, toJSON: () => ({}),
  });
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  // jsdom has no pointer capture.
  for (const name of ["setPointerCapture", "releasePointerCapture"] as const) {
    if (!(name in Element.prototype)) Object.defineProperty(Element.prototype, name, { value: () => {}, configurable: true });
  }
  if (!("hasPointerCapture" in Element.prototype)) {
    Object.defineProperty(Element.prototype, "hasPointerCapture", { value: () => false, configurable: true });
  }
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function useHarness() {
  const svgRef = useRef<SVGSVGElement>(null);
  const pz = usePanZoom({ svgRef, bounds: BOUNDS, baseX: BASE.x, baseY: BASE.y });
  return { svgRef, pz };
}

async function renderChart(onCardButton = () => {}) {
  const h = await renderHook(useHarness, undefined, (r) =>
    // Same wiring as the Gonsalves ChartViewport: pointer handlers on the <svg>, cards inside.
    createElement(
      "svg",
      { ref: r.svgRef, onPointerDown: r.pz.onPointerDown, onPointerMove: r.pz.onPointerMove, onPointerUp: r.pz.onPointerUp },
      createElement("g", { "data-card": "1" }, createElement("rect", { "data-testid": "card" })),
      createElement("foreignObject", null, createElement("button", { type: "button", onClick: onCardButton }, "Partners"))
    )
  );
  await settle();
  await act(async () => {
    h.current.pz.setPan({ x: 0, y: 0 });
    h.current.pz.setScale(1);
  });
  const svg = h.container.querySelector("svg")!;
  return { h, svg, card: h.container.querySelector("rect")!, button: h.container.querySelector("button")! };
}

function pointer(type: string, x: number, y: number, id = 1): Event {
  const Ctor = typeof PointerEvent === "function" ? PointerEvent : MouseEvent;
  const e = new Ctor(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
  if (!("pointerId" in e) || (e as PointerEvent).pointerId !== id) Object.defineProperty(e, "pointerId", { value: id });
  Object.defineProperty(e, "pointerType", { value: "touch" });
  return e;
}

function touch(type: string, points: Array<[number, number]>): Event {
  const e = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(e, "touches", { value: points.map(([clientX, clientY]) => ({ clientX, clientY })) });
  return e;
}

const screenOf = (pz: { pan: { x: number; y: number }; scale: number }, lx: number, ly: number) => ({
  x: BASE.x + pz.pan.x + lx * pz.scale,
  y: BASE.y + pz.pan.y + ly * pz.scale,
});

describe("one finger", () => {
  it("pans the chart with the finger", async () => {
    const { h, card } = await renderChart();
    await act(async () => {
      card.dispatchEvent(pointer("pointerdown", 100, 100));
      card.dispatchEvent(pointer("pointermove", 130, 120));
      card.dispatchEvent(pointer("pointermove", 160, 150));
      card.dispatchEvent(pointer("pointerup", 160, 150));
    });
    expect(h.current.pz.pan).toEqual({ x: 60, y: 50 });
    expect(h.current.pz.dragging).toBe(false);
    await h.unmount();
  });

  it("a tap on a card button reaches the button and does not pan", async () => {
    const onButton = vi.fn();
    const { h, button } = await renderChart(onButton);
    await act(async () => {
      button.dispatchEvent(pointer("pointerdown", 200, 300));
      button.dispatchEvent(pointer("pointermove", 202, 301)); // finger jitter, under the pan threshold
      button.dispatchEvent(pointer("pointerup", 202, 301));
      button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }));
    });
    expect(onButton).toHaveBeenCalledTimes(1);
    expect(h.current.pz.pan).toEqual({ x: 0, y: 0 });
    await h.unmount();
  });

  it("a pointerdown on a card button is not cancelled (focus and press states still work)", async () => {
    const { h, button } = await renderChart();
    const down = pointer("pointerdown", 200, 300);
    await act(async () => {
      button.dispatchEvent(down);
    });
    expect(down.defaultPrevented).toBe(false);
    await h.unmount();
  });

  it("a pan that starts on a card button pans, and the click that follows it is not a tap", async () => {
    const onButton = vi.fn();
    const { h, button } = await renderChart(onButton);
    await act(async () => {
      button.dispatchEvent(pointer("pointerdown", 200, 300));
      button.dispatchEvent(pointer("pointermove", 260, 340));
      button.dispatchEvent(pointer("pointerup", 260, 340));
      button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }));
    });
    expect(h.current.pz.pan).toEqual({ x: 60, y: 40 });
    expect(onButton).not.toHaveBeenCalled();
    // The next tap works again.
    await act(async () => {
      button.dispatchEvent(pointer("pointerdown", 200, 300));
      button.dispatchEvent(pointer("pointerup", 200, 300));
      button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }));
    });
    expect(onButton).toHaveBeenCalledTimes(1);
    await h.unmount();
  });
});

describe("two fingers", () => {
  it("pinch keeps the point between the fingers fixed", async () => {
    const { h, svg } = await renderChart();
    const mid = { x: 200, y: 400 };
    const under = { x: mid.x - BASE.x, y: mid.y - BASE.y };
    await act(async () => {
      svg.dispatchEvent(touch("touchstart", [[150, 400], [250, 400]]));
      svg.dispatchEvent(touch("touchmove", [[100, 400], [300, 400]]));
    });
    expect(h.current.pz.scale).toBeCloseTo(2, 6);
    const at = screenOf(h.current.pz, under.x, under.y);
    expect(at.x).toBeCloseTo(mid.x, 6);
    expect(at.y).toBeCloseTo(mid.y, 6);
    await h.unmount();
  });

  it("when both fingers also move, the chart follows the midpoint", async () => {
    const { h, svg } = await renderChart();
    const startMid = { x: 200, y: 400 };
    const under = { x: startMid.x - BASE.x, y: startMid.y - BASE.y };
    await act(async () => {
      svg.dispatchEvent(touch("touchstart", [[150, 400], [250, 400]]));
      svg.dispatchEvent(touch("touchmove", [[180, 450], [280, 450]])); // same distance, moved 30 right, 50 down
    });
    expect(h.current.pz.scale).toBeCloseTo(1, 6);
    const at = screenOf(h.current.pz, under.x, under.y);
    expect(at.x).toBeCloseTo(230, 6);
    expect(at.y).toBeCloseTo(450, 6);
    await h.unmount();
  });

  it("pinch out and in stop at the zoom limits (3 and 0.2)", async () => {
    const { h, svg } = await renderChart();
    await act(async () => {
      svg.dispatchEvent(touch("touchstart", [[190, 400], [210, 400]]));
      svg.dispatchEvent(touch("touchmove", [[0, 400], [390, 400]])); // ×19.5
    });
    expect(h.current.pz.scale).toBe(3);
    await act(async () => {
      svg.dispatchEvent(touch("touchend", []));
      svg.dispatchEvent(touch("touchstart", [[0, 400], [390, 400]]));
      svg.dispatchEvent(touch("touchmove", [[195, 400], [196, 400]])); // ÷390
    });
    expect(h.current.pz.scale).toBeCloseTo(0.2, 10);
    await h.unmount();
  });

  it("a pinch cancels a one-finger pan in progress", async () => {
    const { h, svg, card } = await renderChart();
    await act(async () => {
      card.dispatchEvent(pointer("pointerdown", 100, 100));
      card.dispatchEvent(pointer("pointermove", 140, 100));
      svg.dispatchEvent(touch("touchstart", [[100, 400], [200, 400]]));
      card.dispatchEvent(pointer("pointermove", 300, 300)); // ignored while pinching
    });
    expect(h.current.pz.dragging).toBe(false);
    expect(h.current.pz.pan).toEqual({ x: 40, y: 0 });
    await h.unmount();
  });
});

describe("nothing leaks to the page", () => {
  it("the chart surface has touch-action: none, so the browser does not scroll or zoom the page", async () => {
    const { h, svg } = await renderChart();
    expect(svg.style.touchAction).toBe("none");
    await h.unmount();
  });

  it("two-finger touchstart and touchmove are cancelled (no page pinch-zoom, e.g. iOS Safari)", async () => {
    const { h, svg } = await renderChart();
    const start = touch("touchstart", [[150, 400], [250, 400]]);
    const move = touch("touchmove", [[100, 400], [300, 400]]);
    await act(async () => {
      svg.dispatchEvent(start);
      svg.dispatchEvent(move);
    });
    expect(start.defaultPrevented).toBe(true);
    expect(move.defaultPrevented).toBe(true);
    await h.unmount();
  });

  it("the wheel is cancelled too (no page scroll on desktop)", async () => {
    const { h, svg } = await renderChart();
    const wheel = new WheelEvent("wheel", { deltaY: 40, clientX: 100, clientY: 100, bubbles: true, cancelable: true });
    await act(async () => {
      svg.dispatchEvent(wheel);
    });
    expect(wheel.defaultPrevented).toBe(true);
    await h.unmount();
  });

  it("a pan cancels its pointer moves (no text selection or native drag)", async () => {
    const { h, card } = await renderChart();
    const move = pointer("pointermove", 160, 150);
    await act(async () => {
      card.dispatchEvent(pointer("pointerdown", 100, 100));
      card.dispatchEvent(move);
    });
    expect(move.defaultPrevented).toBe(true);
    await h.unmount();
  });
});
