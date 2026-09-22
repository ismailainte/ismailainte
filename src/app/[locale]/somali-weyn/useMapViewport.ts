"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { MAP_HEIGHT, MAP_WIDTH } from "./mapGeometry";
import {
  Bounds,
  IDENTITY,
  View,
  clampView,
  fitBounds,
  interpolateView,
  panBy,
  sameView,
  zoomAt,
} from "./mapView";

const FLIGHT_MS = 560;

/** Honours the OS setting: no easing, just arrive. */
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Pointer travel below this (in map units) still counts as a click, not a drag. */
const DRAG_SLOP = 9;

type Pointer = { x: number; y: number };

export function useMapViewport() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [view, setView] = useState<View>(IDENTITY);
  const viewRef = useRef<View>(IDENTITY);
  const frameRef = useRef<number | null>(null);
  const pointers = useRef(new Map<number, Pointer>());
  const pinchDistance = useRef(0);
  const dragged = useRef(false);

  const apply = useCallback((next: View) => {
    viewRef.current = next;
    setView(next);
  }, []);

  const stopFlight = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const flyTo = useCallback(
    (target: View) => {
      stopFlight();
      const from = viewRef.current;
      if (sameView(from, target)) return;
      if (prefersReducedMotion()) {
        apply(target);
        return;
      }
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min((now - start) / FLIGHT_MS, 1);
        apply(interpolateView(from, target, t));
        frameRef.current = t < 1 ? requestAnimationFrame(step) : null;
      };
      frameRef.current = requestAnimationFrame(step);
    },
    [apply, stopFlight],
  );

  useEffect(() => stopFlight, [stopFlight]);

  /** Screen coordinates to the SVG's own coordinate system. */
  const toMapPoint = useCallback((event: { clientX: number; clientY: number }): Pointer => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return { x: 0, y: 0 };
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  }, []);

  // React attaches wheel passively, so the listener is bound by hand to be able
  // to stop the page from scrolling while the map is being zoomed.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      stopFlight();
      const { x, y } = toMapPoint(event);
      apply(zoomAt(viewRef.current, Math.exp(-event.deltaY * 0.0016), x, y));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [apply, stopFlight, toMapPoint]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      stopFlight();
      dragged.current = false;
      pointers.current.set(event.pointerId, toMapPoint(event));
      if (pointers.current.size === 2) {
        const [a, b] = Array.from(pointers.current.values());
        pinchDistance.current = Math.hypot(a.x - b.x, a.y - b.y);
      }
      // Capture is claimed only once the gesture turns into a drag. Capturing on
      // pointerdown would retarget the following click to the <svg>, and the
      // region paths would never receive it.
    },
    [stopFlight, toMapPoint],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const previous = pointers.current.get(event.pointerId);
      if (!previous) return;
      const current = toMapPoint(event);
      pointers.current.set(event.pointerId, current);

      if (pointers.current.size >= 2) {
        const [a, b] = Array.from(pointers.current.values());
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDistance.current > 0 && distance > 0) {
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          apply(zoomAt(viewRef.current, distance / pinchDistance.current, midX, midY));
        }
        pinchDistance.current = distance;
        dragged.current = true;
        return;
      }

      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      if (!dragged.current && Math.hypot(dx, dy) > DRAG_SLOP) {
        dragged.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      apply(panBy(viewRef.current, dx, dy));
    },
    [apply, toMapPoint],
  );

  const onPointerUp = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchDistance.current = 0;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      stopFlight();
      flyTo(zoomAt(viewRef.current, factor, MAP_WIDTH / 2, MAP_HEIGHT / 2));
    },
    [flyTo, stopFlight],
  );

  const flyToBounds = useCallback((bounds: Bounds) => flyTo(fitBounds(bounds)), [flyTo]);
  const reset = useCallback(() => flyTo(IDENTITY), [flyTo]);

  return {
    view,
    svgRef,
    /** True when the last pointer sequence moved far enough to be a pan. */
    dragged,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
    zoomIn: () => zoomBy(1.7),
    zoomOut: () => zoomBy(1 / 1.7),
    flyToBounds,
    reset,
    setView: (next: View) => apply(clampView(next)),
  };
}
