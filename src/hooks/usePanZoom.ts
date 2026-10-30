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
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panAtDrag, setPanAtDrag] = useState({ x: 0, y: 0 });
  const hasSetInitialView = useRef(false);
  const boundsRef = useRef(bounds);
  const baseRef = useRef({ x: baseX, y: baseY });
  const viewKeyRef = useRef<string | undefined>(viewKey);
  /** Pinch-to-zoom (mobile): avoid applying single-finger pan while two fingers are down */
  const isPinchingRef = useRef(false);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(INITIAL_SCALE);
  const pinchStartPanRef = useRef({ x: 0, y: 0 });
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

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      if (isPinchingRef.current) return;
      e.preventDefault();
      const capturedEl = e.target as HTMLElement;
      capturedEl.setPointerCapture(e.pointerId);
      capturedPointerRef.current = { el: capturedEl, id: e.pointerId };
      setDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setPanAtDrag(pan);
    },
    [pan]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isPinchingRef.current || !dragging) return;
      e.preventDefault();
      setPan({ x: panAtDrag.x + (e.clientX - dragStart.x), y: panAtDrag.y + (e.clientY - dragStart.y) });
    },
    [dragging, panAtDrag, dragStart, setPan]
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const el = e.target as HTMLElement;
    if (el.hasPointerCapture?.(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
    if (capturedPointerRef.current?.id === e.pointerId) {
      capturedPointerRef.current = null;
    }
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
      setDragging(false);
      if (capturedPointerRef.current) {
        const { el: captured, id } = capturedPointerRef.current;
        if ((captured as HTMLElement).hasPointerCapture?.(id)) (captured as HTMLElement).releasePointerCapture(id);
        capturedPointerRef.current = null;
      }
      pinchStartDistRef.current = getDist(e.touches[0], e.touches[1]);
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
      zoomAround(center.x, center.y, startScale, ns, pinchStartPanRef.current);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isPinchingRef.current = false;
        pinchStartDistRef.current = null;
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
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
