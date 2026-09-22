// Every upstream file the map is built from. Run `node scripts/map/fetch.mjs`
// to download them into scripts/map/.cache before generating.
const NE = (name) =>
  `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/${name}.geojson`;

// geoBoundaries stores its releases in Git LFS, so the media host is required.
const GB = (iso, level) =>
  `https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/main/releaseData/gbOpen/${iso}/${level}/geoBoundaries-${iso}-${level}_simplified.geojson`;

export const GEOJSON = {
  ne_countries: NE("ne_10m_admin_0_countries"),
  ne_admin1: NE("ne_10m_admin_1_states_provinces"),
  ne_rivers: NE("ne_10m_rivers_lake_centerlines"),
  ne_lakes: NE("ne_10m_lakes"),
  SOM_ADM1: GB("SOM", "ADM1"),
  SOM_ADM2: GB("SOM", "ADM2"),
  ETH_ADM1: GB("ETH", "ADM1"),
  ETH_ADM2: GB("ETH", "ADM2"),
  ETH_ADM3: GB("ETH", "ADM3"),
  KEN_ADM1: GB("KEN", "ADM1"),
  KEN_ADM2: GB("KEN", "ADM2"),
  DJI_ADM1: GB("DJI", "ADM1"),
  DJI_ADM2: GB("DJI", "ADM2"),
  YEM_ADM2: GB("YEM", "ADM2"),
};

/** GeoNames country dumps, used for the town layer. */
export const GEONAMES = ["SO", "DJ", "ET", "KE", "YE"];
export const geonamesUrl = (code) => `https://download.geonames.org/export/dump/${code}.zip`;
