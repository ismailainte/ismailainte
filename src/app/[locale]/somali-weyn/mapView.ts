import { MAP_HEIGHT, MAP_WIDTH } from "./mapGeometry";

/** Thickness of the printed frame; the live map sits inside it. */
export const FRAME = 18;
export const TICK = 26;

export const MIN_SCALE = 1;
export const MAX_SCALE = 24;

export type View = { x: number; y: number; k: number };

export const IDENTITY: View = { x: 0, y: 0, k: 1 };

export type Bounds = readonly [number, number, number, number];

const clamp = (value: number, min: number, max: number) =>
  value < min ? min : value > max ? max : value;

/** Keeps the map covering the frame, so no empty gutter can be panned into view. */
export const clampView = ({ x, y, k }: View): View => {
  const scale = clamp(k, MIN_SCALE, MAX_SCALE);
  return {
    k: scale,
    x: clamp(x, MAP_WIDTH * (1 - scale), 0),
    y: clamp(y, MAP_HEIGHT * (1 - scale), 0),
  };
};

/** Zooms by `factor` while holding the map point under (px, py) still. */
export const zoomAt = (view: View, factor: number, px: number, py: number): View => {
  const k = clamp(view.k * factor, MIN_SCALE, MAX_SCALE);
  const ratio = k / view.k;
  return clampView({ k, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio });
};

export const panBy = (view: View, dx: number, dy: number): View =>
  clampView({ ...view, x: view.x + dx, y: view.y + dy });

/** Frames `bounds`, leaving a margin so the shape does not touch the edges. */
export const fitBounds = (bounds: Bounds, margin = 0.78): View => {
  const [x0, y0, x1, y1] = bounds;
  const width = Math.max(x1 - x0, 1);
  const height = Math.max(y1 - y0, 1);
  const inner = { w: MAP_WIDTH - FRAME * 2, h: MAP_HEIGHT - FRAME * 2 };
  const k = clamp(Math.min(inner.w / width, inner.h / height) * margin, MIN_SCALE, MAX_SCALE);
  return clampView({
    k,
    x: MAP_WIDTH / 2 - (k * (x0 + x1)) / 2,
    y: MAP_HEIGHT / 2 - (k * (y0 + y1)) / 2,
  });
};

export const sameView = (a: View, b: View) =>
  Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.k - b.k) < 0.002;

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const interpolateView = (from: View, to: View, t: number): View => {
  const e = easeInOutCubic(t);
  return {
    x: from.x + (to.x - from.x) * e,
    y: from.y + (to.y - from.y) * e,
    k: from.k + (to.k - from.k) * e,
  };
};

export const viewTransform = ({ x, y, k }: View) =>
  `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${k.toFixed(4)})`;
