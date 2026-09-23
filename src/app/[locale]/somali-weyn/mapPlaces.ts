export type Place = {
  name: string;
  lon: number;
  lat: number;
  /** Label side relative to the marker. */
  side?: "left" | "right";
  /** Extra vertical nudge in map units, used where labels would collide. */
  dy?: number;
};

export const CAPITAL: Place = { name: "MOGADISHU", lon: 45.34, lat: 2.04, side: "left" };

export const CITIES: Place[] = [
  { name: "Obock", lon: 43.29, lat: 11.97 },
  { name: "Tadjoura", lon: 42.88, lat: 11.79, side: "left" },
  { name: "Djibouti", lon: 43.15, lat: 11.59 },
  { name: "Ali Sabih", lon: 42.71, lat: 11.16, dy: 12 },
  { name: "Dikhil", lon: 42.37, lat: 11.1, side: "left" },
  { name: "Caluula", lon: 50.75, lat: 11.96 },
  { name: "Boosaaso", lon: 49.18, lat: 11.28 },
  { name: "Maydh", lon: 47.1, lat: 11.0 },
  { name: "Ceerigaabo", lon: 47.37, lat: 10.62 },
  { name: "Berbera", lon: 45.01, lat: 10.44 },
  { name: "Hurdiyo", lon: 51.14, lat: 10.58, side: "left" },
  { name: "Boorama", lon: 43.18, lat: 9.94 },
  { name: "Diridhaba", lon: 41.87, lat: 9.60, side: "left", dy: -12 },
  { name: "Harar", lon: 42.12, lat: 9.31, side: "left", dy: 12 },
  { name: "Hargeisa", lon: 44.07, lat: 9.56 },
  { name: "Burco", lon: 45.53, lat: 9.52 },
  { name: "Qardho", lon: 49.09, lat: 9.5, side: "left" },
  { name: "Bandarbeyla", lon: 50.81, lat: 9.49, side: "left" },
  { name: "Jijiga", lon: 42.8, lat: 9.35 },
  { name: "Laascaanood", lon: 47.36, lat: 8.48, side: "left" },
  { name: "Garoowe", lon: 48.48, lat: 8.41 },
  { name: "Eyl", lon: 49.82, lat: 7.98, side: "left" },
  { name: "Gaalkacyo", lon: 47.43, lat: 6.77, side: "left" },
  { name: "Gode", lon: 43.55, lat: 5.95 },
  { name: "Dhuusa Mareeb", lon: 46.39, lat: 5.54 },
  { name: "Ferfer", lon: 45.08, lat: 5.09 },
  { name: "Beledweyne", lon: 45.2, lat: 4.74 },
  { name: "Hudur", lon: 43.89, lat: 4.12 },
  { name: "Dolo Bay", lon: 42.06, lat: 4.18, side: "left", dy: -10 },
  { name: "Mandera", lon: 41.87, lat: 3.94, side: "left", dy: 10 },
  { name: "Luuq", lon: 42.54, lat: 3.8 },
  { name: "Mereeg", lon: 47.28, lat: 3.77, side: "left" },
  { name: "Garbahaarey", lon: 42.22, lat: 3.33, side: "left" },
  { name: "Baydhabo", lon: 43.65, lat: 3.12, side: "left" },
  { name: "Buurhakaba", lon: 44.08, lat: 2.79, side: "left" },
  { name: "Jawhar", lon: 45.5, lat: 2.78 },
  { name: "Marka", lon: 44.77, lat: 1.71, side: "left" },
  { name: "Wajir", lon: 40.06, lat: 1.75 },
  { name: "Bu'aale", lon: 42.59, lat: 1.08 },
  { name: "Jamaame", lon: 42.75, lat: 0.07, side: "left" },
  { name: "Kismaayo", lon: 42.55, lat: -0.36, side: "left" },
  { name: "Garissa", lon: 39.66, lat: -0.45 },
  { name: "Buur Gaabo", lon: 41.84, lat: -1.22, side: "left" },
];

/** Island names carry a label but no settlement marker. */
export const ISLANDS: Place[] = [{ name: "Socotra", lon: 53.85, lat: 11.72 }];

export const GRATICULE_LONGITUDES = [40, 44, 48, 52, 56, 60];
export const GRATICULE_LATITUDES = [12, 8, 4, 0];
