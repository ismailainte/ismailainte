// Builds every data file the Soomaali Weyn map renders from.
//
//   node scripts/map/fetch.mjs      # once, downloads the sources
//   node scripts/map/generate.mjs
//
// Writes src/app/[locale]/somali-weyn/{mapGeometry,mapRegions,mapDistricts}.ts
// and public/map/towns/*.json plus public/map/towns-index.json.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  PROJECTION,
  bboxOf,
  boundsOf,
  centreOf,
  clipTo,
  escapeForSource,
  geomToPath,
  geodesicMultiAreaKm2,
  haversineKm,
  inMulti,
  intersectsWindow,
  labelPoint,
  multiArea,
  multiToPath,
  overlaps,
  px,
  py,
  readJson,
  ringArea,
  round,
  safeDifference,
  safeUnion,
  slug,
  stats,
  titleCase,
  toMulti,
  within,
} from "./lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(HERE, ".cache");
const ROOT = path.resolve(HERE, "../..");
const APP = path.join(ROOT, "src/app/[locale]/somali-weyn");
const TOWNS_DIR = path.join(ROOT, "public/map/towns");

const rawAliases = JSON.parse(fs.readFileSync(path.join(HERE, "aliases.json"), "utf8"));
const ALIASES = new Map(
  Object.entries(rawAliases)
    .filter(([key]) => !key.startsWith("_"))
    .map(([key, value]) => [key.toLowerCase(), value]),
);
/** Source spellings are old transliterations; prefer the map's own orthography. */
const preferredName = (raw) => ALIASES.get(raw.trim().toLowerCase()) ?? titleCase(raw);

const read = (name) => readJson(CACHE, name);

// --- territory -------------------------------------------------------------
const COUNTRIES = new Set([
  "Somalia", "Somaliland", "Ethiopia", "Kenya", "Djibouti", "Eritrea", "Yemen",
  "Saudi Arabia", "Oman", "Sudan", "South Sudan", "Uganda",
  "United Republic of Tanzania",
]);
const SOCOTRA_BOX = [51.8, 11.8, 54.8, 13.0];

const landPaths = [];
let allLand = [];
let somalia = [];
let djibouti = [];
let socotra = [];

for (const feature of read("ne_countries").features) {
  const name = feature.properties.NAME || feature.properties.ADMIN;
  if (!COUNTRIES.has(name)) continue;
  if (!intersectsWindow(bboxOf(feature.geometry.coordinates))) continue;
  const fine = name === "Somalia" || name === "Somaliland" || name === "Djibouti";
  landPaths.push(geomToPath(feature.geometry, fine ? 0.18 : 0.45));

  const multi = toMulti(feature.geometry);
  allLand = safeUnion(allLand, multi);
  if (name === "Somalia" || name === "Somaliland") somalia = safeUnion(somalia, multi);
  else if (name === "Djibouti") djibouti = multi;
  else if (name === "Yemen") socotra = multi.filter((poly) => within(bboxOf(poly[0]), SOCOTRA_BOX));
}

const ethRegions = read("ETH_ADM1");
const ogadenGeom = ethRegions.features.find((f) => f.properties.shapeName === "Somali").geometry;
const ogaden = safeDifference(ogadenGeom, somalia, djibouti);
// Harar and Diridhaba sit immediately west of the Somali Region and are part
// of the wider historical/cultural map represented here. Keep their published
// administrative outlines intact instead of drawing an invented claim line.
const WESTERN_HISTORIC_NAMES = new Set(["Dire Dawa", "Hareri"]);
const westernHistoricFeatures = ethRegions.features.filter((f) =>
  WESTERN_HISTORIC_NAMES.has(f.properties.shapeName),
);
// East Harerge is the surrounding corridor that joins Harar and Diridhaba to
// the Somali Region. Including the whole published unit keeps the western edge
// closed and lets its districts and towns participate in drill-down/search.
const hararConnectorFeatures = read("ETH_ADM2").features.filter(
  (f) => f.properties.shapeName === "East Harerge",
);
const westernHistoric = [...westernHistoricFeatures, ...hararConnectorFeatures].reduce(
  (acc, feature) => safeUnion(acc, toMulti(feature.geometry)),
  [],
);

// Banaadir was enlarged in 2024 with Garasbaaley, Daarusalaam and Gubadley.
// The public ADM files still contain the older municipal outline, so this
// land-clipped envelope follows the expanded boundary shown by Google Maps
// (including the Muqdisho Cusub / north-eastern coastal extension).
const banadirSource = read("SOM_ADM1").features.find(
  (feature) => feature.properties.shapeName.toLowerCase() === "banadir",
);
const oldBanadir = toMulti(banadirSource.geometry);
const BANADIR_2024_ENVELOPE = [[[
  [45.145, 1.94],
  [45.125, 2.075],
  [45.105, 2.14],
  [45.155, 2.205],
  [45.295, 2.205],
  [45.425, 2.305],
  [45.76, 2.35],
  [45.82, 1.90],
  [45.145, 1.94],
]]];
const expandedBanadir = safeUnion(oldBanadir, clipTo(BANADIR_2024_ENVELOPE, somalia));
// Approximate municipal partition masks for the three new districts. They are
// applied after the 17 established districts have been generated, so every
// remaining part of expanded Banaadir belongs to one of the new districts.
// This can be replaced by an official COD layer when one is issued.
const rectangle = (minLon, minLat, maxLon, maxLat) => [[[
  [minLon, minLat], [maxLon, minLat], [maxLon, maxLat], [minLon, maxLat], [minLon, minLat],
]]];
const daarusalaamMask = [[[
  [45.05, 2.17], [45.31, 2.17], [45.47, 2.36], [45.05, 2.36], [45.05, 2.17],
]]];

const kenRegions = read("KEN_ADM1");
const NFD = new Set(["Mandera", "Wajir", "Garissa"]);
const TANA_CLAIM = new Set(["Tana River", "Lamu"]);
const nfdFeatures = kenRegions.features.filter((f) => NFD.has(f.properties.shapeName));
const tanaFeatures = kenRegions.features.filter((f) => TANA_CLAIM.has(f.properties.shapeName));

// The south-western claim line follows the Tana. A cutting polygon is built from
// the river downstream of 38.3E and closed far outside the counties it is tested
// against, so its interior is exactly "north-east of the Tana".
const TANA_CUT_LON = 38.3;
const tana = read("ne_rivers").features
  .filter((f) => f.properties.name === "Tana")
  .map((f) => f.geometry.coordinates.flat())
  .sort((a, b) => b.length - a.length)[0];
const tanaDownstream = tana.slice(tana.findIndex((point) => point[0] >= TANA_CUT_LON));
const northOfTana = [[[
  ...tanaDownstream,
  [43, -3.3],
  [43, 5],
  [TANA_CUT_LON, 5],
  tanaDownstream[0],
]]];

const nfd = safeDifference(
  nfdFeatures.reduce((acc, f) => safeUnion(acc, toMulti(f.geometry)), []),
  somalia,
  ogaden,
);
const tanaStrip = clipTo(
  tanaFeatures.reduce((acc, f) => safeUnion(acc, toMulti(f.geometry)), []),
  northOfTana,
);

const mainlandWeyn = [somalia, djibouti, ogaden, westernHistoric, nfd, tanaStrip].reduce(
  (acc, part) => safeUnion(acc, part),
  [],
);
const weyn = safeUnion(mainlandWeyn, socotra);

// --- provincial borders ----------------------------------------------------
const PROVINCE_TOLERANCE = 0.12;
const provinces = [];
const neAdmin1 = read("ne_admin1");

for (const feature of neAdmin1.features) {
  if (feature.properties.admin !== "Djibouti") continue;
  provinces.push(geomToPath(feature.geometry, PROVINCE_TOLERANCE));
}
for (const feature of read("SOM_ADM1").features) {
  const isBanadir = feature.properties.shapeName.toLowerCase() === "banadir";
  const multi = isBanadir
    ? expandedBanadir
    : safeDifference(feature.geometry, expandedBanadir);
  if (multi.length) provinces.push(multiToPath(multi, PROVINCE_TOLERANCE));
}
// Natural Earth knows the Somali Region as one polygon; its zones come from ADM2.
const ogadenRaw = toMulti(ogadenGeom);
for (const feature of read("ETH_ADM2").features) {
  if (!inMulti(centreOf(feature.geometry), ogadenRaw)) continue;
  const trimmed = safeDifference(feature.geometry, somalia, djibouti);
  if (trimmed.length) provinces.push(multiToPath(trimmed, PROVINCE_TOLERANCE));
}
for (const feature of westernHistoricFeatures) {
  provinces.push(geomToPath(feature.geometry, PROVINCE_TOLERANCE));
}
for (const feature of nfdFeatures) {
  const trimmed = safeDifference(feature.geometry, somalia, ogaden);
  if (trimmed.length) provinces.push(multiToPath(trimmed, PROVINCE_TOLERANCE));
}
for (const feature of neAdmin1.features) {
  const admin = feature.properties.admin;
  if (admin !== "Ethiopia" && admin !== "Kenya") continue;
  if (!intersectsWindow(bboxOf(feature.geometry.coordinates))) continue;
  const trimmed = safeDifference(feature.geometry, somalia, ogaden, nfd, tanaStrip);
  if (trimmed.length) provinces.push(multiToPath(trimmed, 0.35));
}

const rivers = read("ne_rivers").features
  .filter((f) => intersectsWindow(bboxOf(f.geometry.coordinates)))
  .map((f) => geomToPath(f.geometry, 0.5, false));
const lakes = read("ne_lakes").features
  .filter((f) => intersectsWindow(bboxOf(f.geometry.coordinates)))
  .map((f) => geomToPath(f.geometry, 0.4));

// --- regions ---------------------------------------------------------------
const MIN_REGION_PART = 6;
/** Mogadishu's districts are a couple of square map units; keep them. */
const MIN_DISTRICT_PART = 0.2;

const regions = [];
const regionShapes = new Map();

const addRegion = ({ id, name, group, multi, source }) => {
  const d = multiToPath(multi, 0.2, MIN_REGION_PART);
  if (!d) return;
  regions.push({ id, name, group, d, bounds: boundsOf(multi), label: labelPoint(multi) });
  regionShapes.set(id, { multi, bbox: bboxOf(multi), source });
};

for (const feature of read("SOM_ADM1").features) {
  const isBanadir = feature.properties.shapeName.toLowerCase() === "banadir";
  const multi = isBanadir
    ? expandedBanadir
    : safeDifference(clipTo(feature.geometry, somalia), expandedBanadir);
  if (!multi.length) continue;
  const raw = feature.properties.shapeName;
  const name = preferredName(raw);
  addRegion({ id: `so-${slug(raw)}`, name, group: "Soomaaliya", multi, source: "SOM" });
}
for (const feature of read("ETH_ADM2").features) {
  if (!inMulti(centreOf(feature.geometry), ogadenRaw)) continue;
  const multi = clipTo(feature.geometry, ogaden);
  if (!multi.length) continue;
  const raw = feature.properties.shapeName;
  const name = preferredName(raw);
  addRegion({ id: `et-${slug(raw)}`, name, group: "Soomaali Galbeed", multi, source: "ETH" });
}
for (const feature of westernHistoricFeatures) {
  const multi = toMulti(feature.geometry);
  const raw = feature.properties.shapeName;
  const name = raw === "Dire Dawa" ? "Diridhaba" : "Harar";
  const regionMulti = raw === "Hareri"
    ? hararConnectorFeatures.reduce((acc, connector) => safeUnion(acc, toMulti(connector.geometry)), multi)
    : multi;
  addRegion({ id: `et-${slug(name)}`, name, group: "Soomaali Galbeed", multi: regionMulti, source: "ETH" });
}
for (const feature of [...nfdFeatures, ...tanaFeatures]) {
  const raw = feature.properties.shapeName;
  const multi = NFD.has(raw)
    ? safeDifference(feature.geometry, somalia, ogaden)
    : clipTo(feature.geometry, northOfTana);
  if (!multi.length) continue;
  const name = preferredName(raw);
  addRegion({ id: `ke-${slug(raw)}`, name, group: "Waqooyi Bari Kenya (NFD)", multi, source: "KEN" });
}
for (const feature of read("DJI_ADM1").features) {
  const multi = clipTo(feature.geometry, djibouti);
  if (!multi.length) continue;
  const raw = feature.properties.shapeName;
  const name = preferredName(raw);
  addRegion({ id: `dj-${slug(raw)}`, name, group: "Jabuuti", multi, source: "DJI" });
}
if (socotra.length) {
  addRegion({ id: "sq-socotra", name: "Suqadara", group: "Suqadara", multi: socotra, source: "YEM" });
}

// --- Soomaali Weyn overview statistics ------------------------------------
// These figures follow the exact geometry rendered by this map. They therefore
// update automatically whenever an outer boundary or source layer is corrected.
const lineParts = (geometry) =>
  geometry.type === "LineString" ? [geometry.coordinates] : geometry.coordinates;
const pointOrMidpointInside = (line, multi) => {
  for (let i = 0; i < line.length; i++) {
    if (inMulti(line[i], multi)) return true;
    if (i && inMulti([(line[i - 1][0] + line[i][0]) / 2, (line[i - 1][1] + line[i][1]) / 2], multi)) {
      return true;
    }
  }
  return false;
};
const RIVER_NAME_ALIASES = new Map([["Shebele", "Shabeelle"]]);
const riverNames = new Set();
for (const feature of read("ne_rivers").features) {
  if (!lineParts(feature.geometry).some((line) => pointOrMidpointInside(line, mainlandWeyn))) continue;
  const raw = feature.properties.name?.trim();
  if (raw) riverNames.add(RIVER_NAME_ALIASES.get(raw) ?? raw);
}

// An outer edge is coastline when one side belongs to Soomaali Weyn and the
// other side is water rather than neighbouring land. Socotra is deliberately
// excluded: the requested coast runs from Jabuuti to the Tana River.
const COAST_TEST_OFFSET = 0.004;
let coastlineKm = 0;
for (const poly of mainlandWeyn) {
  const ring = poly[0];
  for (let i = 1; i < ring.length; i++) {
    const a = ring[i - 1];
    const b = ring[i];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const length = Math.hypot(dx, dy);
    if (!length) continue;
    const midpoint = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const offset = [-dy / length * COAST_TEST_OFFSET, dx / length * COAST_TEST_OFFSET];
    const left = [midpoint[0] + offset[0], midpoint[1] + offset[1]];
    const right = [midpoint[0] - offset[0], midpoint[1] - offset[1]];
    const leftInside = inMulti(left, mainlandWeyn);
    const rightInside = inMulti(right, mainlandWeyn);
    if (leftInside === rightInside) continue;
    const outside = leftInside ? right : left;
    if (!inMulti(outside, allLand)) coastlineKm += haversineKm(a, b);
  }
}

const renderedParts = weyn.filter((poly) => ringArea(poly[0]) >= 6);
const largestPart = renderedParts.reduce(
  (largest, poly) => geodesicMultiAreaKm2([poly]) > geodesicMultiAreaKm2([largest]) ? poly : largest,
  renderedParts[0],
);
const mapStats = {
  areaKm2: Math.round(geodesicMultiAreaKm2(weyn)),
  regions: regions.length,
  rivers: riverNames.size,
  coastlineKm: Math.round(coastlineKm),
  islands: renderedParts.filter((poly) => poly !== largestPart).length,
};

fs.writeFileSync(
  path.join(APP, "mapGeometry.ts"),
  [
    "// Generated by scripts/map/generate.mjs - do not edit by hand.",
    "// Natural Earth 1:10m (public domain) and geoBoundaries gbOpen (CC BY 4.0).",
    "",
    `export const MAP_WIDTH = ${MAP_WIDTH};`,
    `export const MAP_HEIGHT = ${MAP_HEIGHT};`,
    `export const MAP_STATS = ${JSON.stringify(mapStats)} as const;`,
    "",
    `const LON0 = ${PROJECTION.LON0};`,
    `const LAT0 = ${PROJECTION.LAT0};`,
    `const PX_LON = ${PROJECTION.PX_LON};`,
    `const PX_LAT = ${PROJECTION.PX_LAT};`,
    "",
    "export const projectX = (lon: number) => (lon - LON0) * PX_LON;",
    "export const projectY = (lat: number) => (LAT0 - lat) * PX_LAT;",
    "",
    "export const unprojectX = (x: number) => LON0 + x / PX_LON;",
    "export const unprojectY = (y: number) => LAT0 - y / PX_LAT;",
    "",
    "/** Every landmass in the window, for the base fill and national outlines. */",
    `export const ALL_LAND =\n  "${escapeForSource(landPaths.join(""))}";`,
    "",
    "/** Soomaali Weyn territory rendered by the interactive map. */",
    `export const SOMALI_WEYN =\n  "${escapeForSource(multiToPath(weyn, 0.18, 6))}";`,
    "",
    `export const PROVINCE_BORDERS =\n  "${escapeForSource(provinces.join(""))}";`,
    "",
    `export const RIVERS =\n  "${escapeForSource(rivers.join(""))}";`,
    "",
    `export const LAKES =\n  "${escapeForSource(lakes.join(""))}";`,
    "",
  ].join("\n"),
);

// --- districts -------------------------------------------------------------
// Districts clip to the territory, not to their region: the ADM1 and ADM2 layers
// come from different vintages and do not line up, so clipping to the region
// would shave real districts away. The region is only a grouping, chosen by
// largest overlap, with a nearest-extent fallback for units whose parent outline
// has since moved.
const SOURCES = {
  SOM: read("SOM_ADM2").features,
  ETH: read("ETH_ADM3").features,
  KEN: read("KEN_ADM2").features,
  DJI: read("DJI_ADM2").features,
  YEM: read("YEM_ADM2").features,
};
const TERRITORY = {
  SOM: somalia,
  ETH: safeUnion(ogaden, westernHistoric),
  KEN: Array.from(regionShapes.values())
    .filter((shape) => shape.source === "KEN")
    .reduce((acc, shape) => safeUnion(acc, shape.multi), []),
  DJI: djibouti,
  YEM: socotra,
};
/** Sources whose every feature belongs to the territory by definition. */
const WHOLLY_INSIDE = new Set(["SOM", "DJI", "YEM"]);

const regionsBySource = new Map();
for (const [id, shape] of regionShapes) {
  const list = regionsBySource.get(shape.source) ?? [];
  list.push({ id, shape });
  regionsBySource.set(shape.source, list);
}

const districts = {};
const districtShapes = new Map();
let unmatched = 0;

const distanceToRegion = (centre, shape) => {
  const [minLon, minLat, maxLon, maxLat] = shape.bbox;
  return Math.hypot(
    Math.max(minLon - centre[0], 0, centre[0] - maxLon),
    Math.max(minLat - centre[1], 0, centre[1] - maxLat),
  );
};

for (const [source, features] of Object.entries(SOURCES)) {
  const candidates = regionsBySource.get(source) ?? [];
  if (!candidates.length) continue;

  for (const feature of features) {
    const bbox = bboxOf(feature.geometry.coordinates);
    if (!candidates.some(({ shape }) => overlaps(bbox, shape.bbox))) continue;

    let clipped = clipTo(feature.geometry, TERRITORY[source]);
    if (!clipped.length || multiArea(clipped) < MIN_DISTRICT_PART) continue;

    const name = preferredName(feature.properties.shapeName);
    const centre = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];

    // A unit carrying its region's own name belongs to it whatever the overlap
    // says; Djibouti city is the clearest case.
    const named = candidates.find(({ id }) => regions.find((r) => r.id === id)?.name === name);
    let best = named ? { id: named.id, area: Infinity } : null;

    for (const candidate of candidates) {
      if (best?.area === Infinity) break;
      if (!overlaps(bbox, candidate.shape.bbox)) continue;
      const overlap = clipTo(clipped, candidate.shape.multi);
      const area = overlap.length ? multiArea(overlap) : 0;
      if (area > 0 && (!best || area > best.area)) best = { id: candidate.id, area };
    }

    if (!best && WHOLLY_INSIDE.has(source)) {
      const nearest = candidates
        .map((candidate) => ({ id: candidate.id, distance: distanceToRegion(centre, candidate.shape) }))
        .sort((a, b) => a.distance - b.distance)[0];
      if (nearest) best = { id: nearest.id, area: 0 };
    }
    if (!best) {
      unmatched++;
      continue;
    }

    // The source ADM2 layer predates the Banaadir enlargement. Remove the new
    // municipal land from neighbouring legacy districts to avoid overlaps.
    if (source === "SOM" && best.id !== "so-banadir") {
      clipped = safeDifference(clipped, expandedBanadir);
      if (!clipped.length || multiArea(clipped) < MIN_DISTRICT_PART) continue;
    }

    const id = `${best.id}-${slug(name)}`;
    const d = multiToPath(clipped, 0.2, MIN_DISTRICT_PART);
    if (!d) continue;
    (districts[best.id] ||= []).push({
      id,
      name,
      d,
      bounds: boundsOf(clipped),
      label: labelPoint(clipped),
    });
    districtShapes.set(id, { regionId: best.id, multi: clipped, bbox: bboxOf(clipped) });
  }
}

// Fill the whole enlarged Banaadir region. The older ADM1 and ADM2 releases do
// not share an exact edge, so using only the outer expansion can leave slivers
// that still receive clicks from Lower or Middle Shabelle. Subtract every
// established Banaadir district first, then partition every remaining point
// among the three new districts.
const legacyBanadir = Array.from(districtShapes.values())
  .filter((shape) => shape.regionId === "so-banadir")
  .reduce((acc, shape) => safeUnion(acc, shape.multi), []);
const availableBanadir = safeDifference(expandedBanadir, legacyBanadir);
const garasbaaley = clipTo(availableBanadir, rectangle(45.05, 1.85, 45.285, 2.19));
const withoutGarasbaaley = safeDifference(availableBanadir, garasbaaley);
const daarusalaam = clipTo(withoutGarasbaaley, daarusalaamMask);
const gubadley = safeDifference(withoutGarasbaaley, daarusalaam);

for (const [name, multi] of [
  ["Garasbaaley", garasbaaley],
  ["Daarusalaam", daarusalaam],
  ["Gubadley", gubadley],
]) {
  if (!multi.length) continue;
  const regionId = "so-banadir";
  const id = `${regionId}-${slug(name)}`;
  (districts[regionId] ||= []).push({
    id,
    name,
    d: multiToPath(multi, 0.2, MIN_DISTRICT_PART),
    bounds: boundsOf(multi),
    label: labelPoint(multi),
  });
  districtShapes.set(id, { regionId, multi, bbox: bboxOf(multi) });
}
for (const list of Object.values(districts)) list.sort((a, b) => a.name.localeCompare(b.name));

// --- towns -----------------------------------------------------------------
// GeoNames feature codes, ordered so the map can thin labels by importance.
const RANKS = { PPLC: 0, PPLA: 1, PPLA2: 2, PPLA3: 3, PPLA4: 3, PPL: 5, PPLL: 5, PPLX: 6, PPLF: 6, PPLQ: 7 };

const townsByDistrict = new Map();
let townCount = 0;

for (const country of ["SO", "DJ", "ET", "KE", "YE"]) {
  for (const line of fs.readFileSync(path.join(CACHE, `${country}.txt`), "utf8").split("\n")) {
    const f = line.split("\t");
    if (f[6] !== "P") continue;
    const lat = +f[4];
    const lon = +f[5];
    if (!(lon > 37 && lon < 55 && lat > -3.5 && lat < 13.5)) continue;

    let districtId = null;
    for (const [id, shape] of districtShapes) {
      const b = shape.bbox;
      if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) continue;
      if (!inMulti([lon, lat], shape.multi)) continue;
      districtId = id;
      break;
    }
    if (!districtId) continue;

    const list = townsByDistrict.get(districtId) ?? [];
    list.push({
      n: preferredName(f[1]),
      x: round(px(lon)),
      y: round(py(lat)),
      r: RANKS[f[7]] ?? 6,
      p: +f[14] || 0,
    });
    townsByDistrict.set(districtId, list);
    townCount++;
  }
}

// The unit's seat is the town sharing its name; promote it so it labels first.
for (const [districtId, list] of townsByDistrict) {
  const regionId = districtShapes.get(districtId).regionId;
  const districtName = districts[regionId]?.find((d) => d.id === districtId)?.name.toLowerCase();
  for (const town of list) {
    if (town.n.toLowerCase() === districtName && town.r > 4) town.r = 4;
  }
  list.sort((a, b) => a.r - b.r || b.p - a.p || a.n.localeCompare(b.n));
}

fs.rmSync(TOWNS_DIR, { recursive: true, force: true });
fs.mkdirSync(TOWNS_DIR, { recursive: true });

const townsPerRegion = {};
const townIndex = [];
for (const region of regions) {
  const payload = {};
  for (const district of districts[region.id] ?? []) {
    const list = townsByDistrict.get(district.id);
    if (!list?.length) continue;
    payload[district.id] = list.map(({ n, x, y, r }) => [n, x, y, r]);
    for (const town of list) townIndex.push([town.n, region.id, district.id, town.x, town.y, town.r]);
  }
  townsPerRegion[region.id] = Object.values(payload).reduce((n, l) => n + l.length, 0);
  fs.writeFileSync(path.join(TOWNS_DIR, `${region.id}.json`), JSON.stringify(payload));
}
townIndex.sort((a, b) => a[5] - b[5] || a[0].localeCompare(b[0]));
fs.writeFileSync(path.join(ROOT, "public/map/towns-index.json"), JSON.stringify(townIndex));

// --- emit ------------------------------------------------------------------
fs.writeFileSync(
  path.join(APP, "mapRegions.ts"),
  "// Generated by scripts/map/generate.mjs - do not edit by hand.\n" +
    "// geoBoundaries gbOpen SOM/KEN/DJI ADM1 and ETH ADM2 (CC BY 4.0).\n\n" +
    "export type Area = {\n  id: string;\n  name: string;\n  d: string;\n" +
    "  /** [minX, minY, maxX, maxY] in map units. */\n  bounds: [number, number, number, number];\n" +
    "  /** Point inside the shape, for its label. */\n  label: [number, number];\n};\n\n" +
    "export type Region = Area & { group: string; towns: number };\n\n" +
    `export const REGIONS: Region[] = ${JSON.stringify(
      regions.map((r) => ({ ...r, towns: townsPerRegion[r.id] ?? 0 })),
    )};\n`,
);

fs.writeFileSync(
  path.join(APP, "mapDistricts.ts"),
  "// Generated by scripts/map/generate.mjs - do not edit by hand.\n" +
    "// geoBoundaries gbOpen SOM/KEN/DJI/YEM ADM2 and ETH ADM3 (CC BY 4.0).\n\n" +
    'import type { Area } from "./mapRegions";\n\n' +
    `export const DISTRICTS: Record<string, Area[]> = ${JSON.stringify(districts)};\n`,
);

const districtTotal = Object.values(districts).reduce((n, l) => n + l.length, 0);
console.log("regions            ", regions.length);
console.log("map statistics      ", mapStats);
console.log("named rivers        ", [...riverNames].sort().join(", "));
console.log("districts          ", districtTotal, "across", Object.keys(districts).length, "regions");
console.log("regions w/o districts", regions.filter((r) => !districts[r.id]).map((r) => r.id).join(", ") || "none");
console.log("towns              ", townCount);
console.log("unmatched districts", unmatched);
console.log("clip fallbacks     ", stats.clipFallbacks, "union fallbacks", stats.unionFallbacks);
