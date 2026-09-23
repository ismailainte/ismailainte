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
  inMulti,
  intersectsWindow,
  labelPoint,
  multiArea,
  multiToPath,
  overlaps,
  px,
  py,
  readJson,
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

const weyn = [somalia, djibouti, ogaden, westernHistoric, nfd, tanaStrip, socotra].reduce(
  (acc, part) => safeUnion(acc, part),
  [],
);

// --- provincial borders ----------------------------------------------------
const PROVINCE_TOLERANCE = 0.12;
const provinces = [];
const neAdmin1 = read("ne_admin1");

for (const feature of neAdmin1.features) {
  if (feature.properties.admin !== "Djibouti") continue;
  provinces.push(geomToPath(feature.geometry, PROVINCE_TOLERANCE));
}
for (const feature of read("SOM_ADM1").features) {
  provinces.push(geomToPath(feature.geometry, PROVINCE_TOLERANCE));
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

fs.writeFileSync(
  path.join(APP, "mapGeometry.ts"),
  [
    "// Generated by scripts/map/generate.mjs - do not edit by hand.",
    "// Natural Earth 1:10m (public domain) and geoBoundaries gbOpen (CC BY 4.0).",
    "",
    `export const MAP_WIDTH = ${MAP_WIDTH};`,
    `export const MAP_HEIGHT = ${MAP_HEIGHT};`,
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
    "/**",
    " * Soomaali Weyn as one polygon: Somalia, Djibouti, the Somali Region of",
    " * Ethiopia, the Northern Frontier District and Tana claim in Kenya, and the",
    " * Socotra archipelago.",
    " */",
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
  const multi = clipTo(feature.geometry, somalia);
  if (!multi.length) continue;
  const name = preferredName(feature.properties.shapeName);
  addRegion({ id: `so-${slug(name)}`, name, group: "Somalia", multi, source: "SOM" });
}
for (const feature of read("ETH_ADM2").features) {
  if (!inMulti(centreOf(feature.geometry), ogadenRaw)) continue;
  const multi = clipTo(feature.geometry, ogaden);
  if (!multi.length) continue;
  const name = preferredName(feature.properties.shapeName);
  addRegion({ id: `et-${slug(name)}`, name, group: "Somali Region", multi, source: "ETH" });
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
  addRegion({ id: `ke-${slug(name)}`, name, group: "NFD", multi, source: "KEN" });
}
for (const feature of read("DJI_ADM1").features) {
  const multi = clipTo(feature.geometry, djibouti);
  if (!multi.length) continue;
  const name = preferredName(feature.properties.shapeName);
  addRegion({ id: `dj-${slug(name)}`, name, group: "Djibouti", multi, source: "DJI" });
}
if (socotra.length) {
  addRegion({ id: "sq-socotra", name: "Socotra", group: "Socotra", multi: socotra, source: "YEM" });
}

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

    const clipped = clipTo(feature.geometry, TERRITORY[source]);
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
console.log("districts          ", districtTotal, "across", Object.keys(districts).length, "regions");
console.log("regions w/o districts", regions.filter((r) => !districts[r.id]).map((r) => r.id).join(", ") || "none");
console.log("towns              ", townCount);
console.log("unmatched districts", unmatched);
console.log("clip fallbacks     ", stats.clipFallbacks, "union fallbacks", stats.unionFallbacks);
