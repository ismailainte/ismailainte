// Shared geometry helpers for the Soomaali Weyn map pipeline.
import fs from "node:fs";
import path from "node:path";
import polygonClipping from "polygon-clipping";
import polylabel from "polylabel";

export const pc = polygonClipping;

/** Plate carree window matched to the reference physical map's graticule. */
export const PROJECTION = { LON0: 37.26, LAT0: 13.91, PX_LON: 74.75, PX_LAT: 74.9 };
export const MAP_WIDTH = 2000;
export const MAP_HEIGHT = 1330;

export const px = (lon) => (lon - PROJECTION.LON0) * PROJECTION.PX_LON;
export const py = (lat) => (PROJECTION.LAT0 - lat) * PROJECTION.PX_LAT;
export const round = (n) => Math.round(n * 10) / 10;

export const WINDOW = [
  PROJECTION.LON0,
  PROJECTION.LAT0 - MAP_HEIGHT / PROJECTION.PX_LAT,
  PROJECTION.LON0 + MAP_WIDTH / PROJECTION.PX_LON,
  PROJECTION.LAT0,
];

export const readJson = (dir, name) => JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), "utf8"));

export const toMulti = (geom) => (geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates);

/**
 * polygon-clipping is sensitive to near-duplicate vertices, which these source
 * files are full of. Snapping to roughly a metre removes most of the failures.
 */
const SNAP = 1e5;
const snap = (value) => Math.round(value * SNAP) / SNAP;
export const snapMulti = (multi) =>
  multi.map((poly) =>
    poly.map((ring) => {
      const snapped = ring.map(([lon, lat]) => [snap(lon), snap(lat)]);
      const deduped = snapped.filter(
        (point, i) => i === 0 || point[0] !== snapped[i - 1][0] || point[1] !== snapped[i - 1][1],
      );
      return deduped.length >= 4 ? deduped : snapped;
    }),
  );

export const bboxOf = (coords) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const walk = (c) => {
    if (typeof c[0] === "number") {
      if (c[0] < minX) minX = c[0];
      if (c[0] > maxX) maxX = c[0];
      if (c[1] < minY) minY = c[1];
      if (c[1] > maxY) maxY = c[1];
      return;
    }
    c.forEach(walk);
  };
  walk(coords);
  return [minX, minY, maxX, maxY];
};

export const overlaps = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
export const within = (a, b) => a[0] >= b[0] && a[2] <= b[2] && a[1] >= b[1] && a[3] <= b[3];
export const intersectsWindow = (bbox) => overlaps(bbox, WINDOW);

// Douglas-Peucker, run in projected pixel space so the tolerance is in map units.
export const simplify = (points, tolerance) => {
  if (points.length < 3) return points;
  const sqTol = tolerance * tolerance;
  const sqSegDist = (p, a, b) => {
    let [x, y] = a;
    let dx = b[0] - x;
    let dy = b[1] - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) { x = b[0]; y = b[1]; }
      else if (t > 0) { x += dx * t; y += dy * t; }
    }
    dx = p[0] - x;
    dy = p[1] - y;
    return dx * dx + dy * dy;
  };
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let index = -1;
    let maxDist = sqTol;
    for (let i = first + 1; i < last; i++) {
      const d = sqSegDist(points[i], points[first], points[last]);
      if (d > maxDist) { index = i; maxDist = d; }
    }
    if (index !== -1) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
};

export const ringArea = (ring) => {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (px(ring[j][0]) + px(ring[i][0])) * (py(ring[j][1]) - py(ring[i][1]));
  }
  return Math.abs(sum) / 2;
};

export const multiArea = (multi) =>
  multi.reduce(
    (total, poly) => total + poly.reduce((a, ring, i) => a + (i ? -1 : 1) * ringArea(ring), 0),
    0,
  );

export const ringToPath = (ring, tolerance, close = true) => {
  const projected = ring.map(([lon, lat]) => [px(lon), py(lat)]);
  const thinned = simplify(projected, tolerance);
  if (thinned.length < (close ? 3 : 2)) return "";
  return (
    `M${round(thinned[0][0])} ${round(thinned[0][1])}` +
    thinned.slice(1).map(([x, y]) => `L${round(x)} ${round(y)}`).join("") +
    (close ? "Z" : "")
  );
};

/** `minArea` drops islands too small to read, which would otherwise render as
 *  a smudge of outlines (the Lamu archipelago is the worst offender). */
export const multiToPath = (multi, tolerance, minArea = 0) =>
  multi
    .filter((poly) => ringArea(poly[0]) >= minArea)
    .map((poly) => poly.map((ring) => ringToPath(ring, tolerance)).join(""))
    .join("");

export const geomToPath = (geom, tolerance, close = true) => {
  const { type, coordinates } = geom;
  if (type === "Polygon" || type === "MultiPolygon") return multiToPath(toMulti(geom), tolerance);
  if (type === "LineString") return ringToPath(coordinates, tolerance, close);
  if (type === "MultiLineString") return coordinates.map((l) => ringToPath(l, tolerance, close)).join("");
  return "";
};

export const boundsOf = (multi) => {
  const [minLon, minLat, maxLon, maxLat] = bboxOf(multi);
  return [px(minLon), py(maxLat), px(maxLon), py(minLat)].map(round);
};

/** Pole of inaccessibility of the largest part, so labels stay inside the shape. */
export const labelPoint = (multi) => {
  const largest = multi.reduce((a, b) => (ringArea(b[0]) > ringArea(a[0]) ? b : a));
  const projected = largest.map((ring) => ring.map(([lon, lat]) => [px(lon), py(lat)]));
  const [x, y] = polylabel(projected, 1.0);
  return [round(x), round(y)];
};

const inRing = (point, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > point[1] !== yj > point[1]) {
      const x = ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
      if (point[0] < x) inside = !inside;
    }
  }
  return inside;
};

/** Respects holes: inside an outer ring and not inside any of its inner rings. */
export const inMulti = (point, multi) =>
  multi.some((poly) => inRing(point, poly[0]) && !poly.slice(1).some((hole) => inRing(point, hole)));

export const centreOf = (geom) => {
  const [minLon, minLat, maxLon, maxLat] = bboxOf(geom.coordinates ?? geom);
  return [(minLon + maxLon) / 2, (minLat + maxLat) / 2];
};

export const stats = { clipFallbacks: 0, unionFallbacks: 0 };

/** Both operations fall back rather than drop a unit off the map. */
export const clipTo = (geom, multi) => {
  const raw = snapMulti(Array.isArray(geom) ? geom : toMulti(geom));
  try {
    return pc.intersection(raw, snapMulti(multi));
  } catch {
    stats.clipFallbacks++;
    return raw;
  }
};

export const safeDifference = (geom, ...subtract) => {
  const raw = snapMulti(Array.isArray(geom) ? geom : toMulti(geom));
  try {
    return pc.difference(raw, ...subtract.map(snapMulti));
  } catch {
    stats.clipFallbacks++;
    return raw;
  }
};

export const safeUnion = (a, b) => {
  if (!a.length) return b;
  try {
    return pc.union(snapMulti(a), snapMulti(b));
  } catch {
    stats.unionFallbacks++;
    return a.concat(b);
  }
};

export const slug = (name) =>
  name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const titleCase = (name) =>
  name.toLowerCase().replace(/(^|[\s\-/()])([a-z])/g, (_, lead, ch) => lead + ch.toUpperCase());

export const escapeForSource = (value) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
