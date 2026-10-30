"use client";

import { useState, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { PERSON_WIDTH } from "../strategies/descendancy/constants";

export interface PanZoomBounds {
  minX: number;
  maxX: number;
  maxY: number;
}

const ZOOM_MIN = 0.2;
const ZOOM_MAX = 3;
const ZOOM_STEP = 1.2;
/** Initial scale when opening the chart (zoomed out a bit so more context is visible). */
const INITIAL_SCALE = 0.72;
/** Vertical offset for root when applying initial view and fit-to-screen. */
const INITIAL_TOP_PADDING = 110;
/** A press becomes a pan only after moving this far (px), so taps with finger jitter stay taps. */
const PAN_THRESHOLD_PX = 4;
/** Targets that must keep their own press, focus and click: card buttons, links, fields. */
const INTERACTIVE_SELECTOR =
  'button, a[href], input, select, textarea, label, [role="button"], [data-chart-interactive]';

function isInteractive(target: EventTarget | null): boolean {
  return typeof Element !== "undefined" && target instanceof Element && target.closest(INTERACTIVE_SELECTOR) != null;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  startPan: { x: number; y: number };
  target: Element;
  panning: boolean;
}

export interface UsePanZoomOptions {
  svgRef: React.RefObject<SVGSVGElement | null>;
  bounds: PanZoomBounds | null;
  baseX: number;
  baseY: number;
  /**
   * When true, skip layout-origin initial pan/zoom (descendancy-style root at layout 0,0).
   * Pedigree / vertical pedigree call `scheduleCenterOnPerson(rootId)` after layout instead.
   */
  deferLayoutOriginInitialPan?: boolean;
  /** When true, use fit-to-screen for initial view (non-pedigree) or left-align root (pedigree via embedCenterOnPosition). */
  embedMode?: boolean;
  /**
   * What the chart shows, e.g. `${chartType}:${rootId}`. The initial view is applied once, and
   * again only when this changes. A bounds change alone (a partner revealed, a branch opened)
   * keeps the user's pan and zoom, and the content stays where it was on screen.
   */
  viewKey?: string;
}

/**
 * Pan and zoom for a chart drawn at `translate(baseX + pan.x, baseY + pan.y) scale(scale)`:
 * layout point L appears on screen at base + pan + L · scale.
 */
export function usePanZoom({
  svgRef,
  bounds,
  baseX,
  baseY,
  deferLayoutOriginInitialPan = false,
  embedMode = false,
  viewKey,
}: UsePanZoomOptions) {
  const [pan, setPanState] = useState({ x: 0, y: 0 });
  const [scale, setScaleState] = useState(INITIAL_SCALE);
  const [dragging, setDragging] = useState(false);
  /** The press in progress (one pointer). In a ref: fast events must not see stale state. */
  const dragRef = useRef<DragState | null>(null);
  /** Set when a pan ends: the click the browser sends next is part of the pan, not a tap. */
  const suppressClickRef = useRef(false);
  const hasSetInitialView = useRef(false);
  const boundsRef = useRef(bounds);
  const baseRef = useRef({ x: baseX, y: baseY });
  const viewKeyRef = useRef<string | undefined>(viewKey);
  /** Pinch-to-zoom (mobile): avoid applying single-finger pan while two fingers are down */
  const isPinchingRef = useRef(false);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(INITIAL_SCALE);
  const pinchStartPanRef = useRef({ x: 0, y: 0 });
  const pinchStartCenterRef = useRef({ x: 0, y: 0 });
  /** Tracks the element + pointer ID for the captured single-finger pointer so it can be released when a pinch starts. */
  const capturedPointerRef = useRef<{ el: Element; id: number } | null>(null);
  // Refs follow every change at once, so several wheel or touch events between two renders
  // build on each other instead of on a stale value.
  const scaleRef = useRef(scale);
  const panRef = useRef(pan);
  const embedModeRef = useRef(embedMode);
  boundsRef.current = bounds;
  embedModeRef.current = embedMode;

  const setPan = useCallback((next: { x: number; y: number }) => {
    panRef.current = next;
    setPanState(next);
  }, []);
  const setScale = useCallback((next: number | ((s: number) => number)) => {
    const value = typeof next === "function" ? next(scaleRef.current) : next;
    scaleRef.current = value;
    setScaleState(value);
  }, []);

  if (viewKey !== viewKeyRef.current) {
    viewKeyRef.current = viewKey;
    hasSetInitialView.current = false;
  }

  // Keep the content still when the base offset moves (B08): base + pan stays the same.
  useLayoutEffect(() => {
    const prev = baseRef.current;
    baseRef.current = { x: baseX, y: baseY };
    if (!hasSetInitialView.current) return;
    const dx = baseX - prev.x;
    const dy = baseY - prev.y;
    if (dx === 0 && dy === 0) return;
    setPan({ x: panRef.current.x - dx, y: panRef.current.y - dy });
  }, [baseX, baseY, setPan]);

  /** Zoom from `fromScale` to `toScale` keeping screen point (mx, my) over the same layout point. */
  const zoomAround = useCallback(
    (mx: number, my: number, fromScale: number, toScale: number, fromPan: { x: number; y: number }) => {
      const r = toScale / fromScale;
      const b = baseRef.current;
      setPan({
        x: mx - b.x - r * (mx - b.x - fromPan.x),
        y: my - b.y - r * (my - b.y - fromPan.y),
      });
      setScale(toScale);
    },
    [setPan, setScale]
  );

  /** Scale and pan that fit the bounds' width and height, centred horizontally (S3). */
  const fitView = useCallback((rect: { width: number }, b: PanZoomBounds, rectHeight: number) => {
    const tw = Math.max(1, b.maxX - b.minX);
    const th = b.maxY + 100;
    const fitScale = Math.min(1, Math.min((rect.width - 160) / tw, (rectHeight - 80) / th));
    const s = Math.max(0.25, Math.min(1.2, fitScale));
    const base = baseRef.current;
    return {
      scale: s,
      pan: { x: rect.width / 2 - base.x - ((b.minX + b.maxX) / 2) * s, y: INITIAL_TOP_PADDING - base.y },
    };
  }, []);

  // Initial view, once per viewKey, as soon as the SVG has a size.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !bounds) return;

    const applyInitialView = () => {
      if (hasSetInitialView.current) return;
      const b = boundsRef.current;
      if (!b) return;
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      hasSetInitialView.current = true;
      if (deferLayoutOriginInitialPan) return;
      const view = embedModeRef.current
        ? fitView(rect, b, rect.height)
        : {
            scale: INITIAL_SCALE,
            pan: { x: rect.width / 2 - baseRef.current.x, y: INITIAL_TOP_PADDING - baseRef.current.y },
          };
      // Defer so layout is complete (SVG may not have final size in same frame)
      requestAnimationFrame(() => {
        setPan(view.pan);
        setScale(view.scale);
      });
    };

    applyInitialView();
    const ro = new ResizeObserver(() => applyInitialView());
    ro.observe(svg);
    return () => ro.disconnect();
  }, [bounds, svgRef, deferLayoutOriginInitialPan, viewKey, fitView, setPan, setScale]);

  const zoomIn = useCallback(() => setScale((s) => Math.min(ZOOM_MAX, s * ZOOM_STEP)), [setScale]);
  const zoomOut = useCallback(() => setScale((s) => Math.max(ZOOM_MIN, s / ZOOM_STEP)), [setScale]);

  /** Same view as initial load: root centered, near top, initial scale. */
  const goToInitialView = useCallback(() => {
    const svg = svgRef.current;
    if (!svg || !bounds) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    setPan({ x: rect.width / 2 - baseX, y: INITIAL_TOP_PADDING - baseY });
    setScale(INITIAL_SCALE);
  }, [svgRef, bounds, baseX, baseY, setPan, setScale]);

  /** Pan and zoom so that the given layout position (e.g. a person's center) is centered in the viewport at initial scale. */
  const centerOnPosition = useCallback(
    (layoutX: number, layoutY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const s = INITIAL_SCALE;
      setPan({ x: rect.width / 2 - baseX - layoutX * s, y: INITIAL_TOP_PADDING - baseY - layoutY * s });
      setScale(s);
    },
    [svgRef, baseX, baseY, setPan, setScale]
  );

  /** Embed pedigree: root person's left edge at 10px from container left, vertically centered. */
  const embedCenterOnPosition = useCallback(
    (layoutX: number, layoutY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const s = INITIAL_SCALE;
      setPan({
        x: 10 + (PERSON_WIDTH / 2) * s - baseX - layoutX * s,
        y: rect.height / 2 - baseY - layoutY * s,
      });
      setScale(s);
    },
    [svgRef, baseX, baseY, setPan, setScale]
  );

  /** Fit the whole chart width (and height) in the viewport, centred horizontally. */
  const fitToScreen = useCallback(() => {
    const svg = svgRef.current;
    if (!svg || !bounds) return;
    const rect = svg.getBoundingClientRect();
    const view = fitView(rect, bounds, rect.height);
    setScale(view.scale);
    setPan(view.pan);
  }, [svgRef, bounds, fitView, setPan, setScale]);

  /**
   * One-pointer pan (T31). A press on a card button, link or field keeps its default (focus,
   * :active) and stays a tap unless the pointer moves past PAN_THRESHOLD_PX; the pointer is
   * captured only once a pan starts, so a tap's pointerup and click land on the button.
   */
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 || isPinchingRef.current) return;
    suppressClickRef.current = false;
    // Elsewhere, stop text selection and native image drag from starting.
    if (!isInteractive(e.target)) e.preventDefault();
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startPan: { ...panRef.current },
      target: e.target as Element,
      panning: false,
    };
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d || isPinchingRef.current || e.pointerId !== d.pointerId) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (!d.panning) {
        if (Math.hypot(dx, dy) < PAN_THRESHOLD_PX) return;
        d.panning = true;
        d.target.setPointerCapture?.(d.pointerId);
        capturedPointerRef.current = { el: d.target, id: d.pointerId };
        setDragging(true);
      }
      e.preventDefault();
      setPan({ x: d.startPan.x + dx, y: d.startPan.y + dy });
    },
    [setPan]
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (d && e.pointerId === d.pointerId) {
      if (d.panning) suppressClickRef.current = true;
      dragRef.current = null;
    }
    const el = e.target as Element;
    if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture?.(e.pointerId);
    if (capturedPointerRef.current?.id === e.pointerId) capturedPointerRef.current = null;
    setDragging(false);
  }, []);

  // Wheel and pinch zoom, attached with { passive: false } so preventDefault() stops the page
  // from scrolling or zooming too (B02; React's onWheel is passive).
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const s = scaleRef.current;
      const ns = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s * (1 - e.deltaY * 0.001)));
      zoomAround(e.clientX - rect.left, e.clientY - rect.top, s, ns, panRef.current);
    };

    const getDist = (t1: Touch, t2: Touch) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const getCenter = (t1: Touch, t2: Touch) => {
      const rect = el.getBoundingClientRect();
      return { x: (t1.clientX + t2.clientX) / 2 - rect.left, y: (t1.clientY + t2.clientY) / 2 - rect.top };
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      // Non-passive, so iOS Safari doesn't claim the pinch for its own page zoom.
      e.preventDefault();
      isPinchingRef.current = true;
      dragRef.current = null; // a pinch ends any one-finger pan
      setDragging(false);
      if (capturedPointerRef.current) {
        const { el: captured, id } = capturedPointerRef.current;
        if ((captured as HTMLElement).hasPointerCapture?.(id)) (captured as HTMLElement).releasePointerCapture(id);
        capturedPointerRef.current = null;
      }
      pinchStartDistRef.current = getDist(e.touches[0], e.touches[1]);
      pinchStartCenterRef.current = getCenter(e.touches[0], e.touches[1]);
      pinchStartScaleRef.current = scaleRef.current;
      pinchStartPanRef.current = { ...panRef.current };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || pinchStartDistRef.current === null) return;
      e.preventDefault();
      const center = getCenter(e.touches[0], e.touches[1]);
      const startScale = pinchStartScaleRef.current;
      const factor = getDist(e.touches[0], e.touches[1]) / pinchStartDistRef.current;
      const ns = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, startScale * factor));
      // The layout point that was under the fingers' first midpoint follows the midpoint now:
      // pinch zooms around it and moving both fingers pans (T31).
      const start = pinchStartCenterRef.current;
      const startPan = pinchStartPanRef.current;
      const b = baseRef.current;
      const lx = (start.x - b.x - startPan.x) / startScale;
      const ly = (start.y - b.y - startPan.y) / startScale;
      setPan({ x: center.x - b.x - lx * ns, y: center.y - b.y - ly * ns });
      setScale(ns);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isPinchingRef.current = false;
        pinchStartDistRef.current = null;
      }
    };

    // A click right after a pan is the end of the pan, not a tap: stop it before it reaches
    // the card (capture phase). Keyboard clicks (detail 0) always pass.
    const onClickCapture = (e: MouseEvent) => {
      if (!suppressClickRef.current || e.detail === 0) return;
      suppressClickRef.current = false;
      e.stopPropagation();
      e.preventDefault();
    };

    // The browser must not scroll or zoom the page from gestures on the chart (T31).
    const previousTouchAction = el.style.touchAction;
    el.style.touchAction = "none";

    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      el.style.touchAction = previousTouchAction;
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [svgRef, zoomAround]);

  return {
    pan,
    setPan,
    scale,
    setScale,
    zoomIn,
    zoomOut,
    fitToScreen,
    goToInitialView,
    centerOnPosition,
    embedCenterOnPosition,
    dragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
