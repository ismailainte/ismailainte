import {
  ALL_LAND,
  LAKES,
  MAP_HEIGHT,
  MAP_WIDTH,
  PROVINCE_BORDERS,
  RIVERS,
  SOMALI_WEYN,
  projectX,
  projectY,
} from "./mapGeometry";
import { GRATICULE_LATITUDES, GRATICULE_LONGITUDES } from "./mapPlaces";
import { FRAME, TICK } from "./mapView";

/**
 * Every geographic layer, drawn in map units. Strokes use non-scaling-stroke so
 * that zooming reveals more detail instead of thickening every line.
 */
export function MapTerrain() {
  return (
    <g vectorEffect="non-scaling-stroke">
      {/* continental shelf glow hugging the coast */}
      <g filter="url(#shelf-blur)" opacity="0.95">
        <path d={ALL_LAND} fill="#cfe6f6" fillRule="evenodd" />
      </g>

      <path d={ALL_LAND} fill="url(#relief-neighbour)" fillRule="evenodd" />
      <path d={SOMALI_WEYN} fill="url(#relief)" fillRule="evenodd" />

      {/* Cal Madow and Ethiopian highland shading */}
      <g clipPath="url(#weyn-clip)">
        <ellipse cx={projectX(47.3)} cy={projectY(10.7)} rx={95} ry={52} fill="url(#highland)" />
        <ellipse cx={projectX(43.9)} cy={projectY(9.9)} rx={130} ry={58} fill="url(#highland)" />
      </g>
      <path
        d={ALL_LAND}
        fill="#6b5a42"
        fillRule="evenodd"
        opacity="0.5"
        filter="url(#relief-shade)"
      />

      {/* hydrography */}
      <path
        d={RIVERS}
        fill="none"
        stroke="#3d7fae"
        strokeWidth="2.6"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={LAKES}
        fill="#79b4de"
        stroke="#3d7fae"
        strokeWidth="1.6"
        fillRule="evenodd"
        vectorEffect="non-scaling-stroke"
      />

      {/* borders */}
      <path
        d={PROVINCE_BORDERS}
        fill="none"
        stroke="#a3252b"
        strokeWidth="2.6"
        vectorEffect="non-scaling-stroke"
      />
      {/* Only Soomaali Weyn's outer edge is black. Former international borders
          inside the combined territory remain ordinary red provincial lines. */}
      <path
        d={SOMALI_WEYN}
        fill="none"
        fillRule="evenodd"
        stroke="#111111"
        strokeWidth="3.4"
        vectorEffect="non-scaling-stroke"
      />

      {/* graticule */}
      <g stroke="#3f3f3f" strokeWidth="1.6" opacity="0.75" vectorEffect="non-scaling-stroke">
        {GRATICULE_LONGITUDES.map((lon) => (
          <line key={lon} x1={projectX(lon)} y1={0} x2={projectX(lon)} y2={MAP_HEIGHT} />
        ))}
        {GRATICULE_LATITUDES.map((lat) => (
          <line key={lat} x1={0} y1={projectY(lat)} x2={MAP_WIDTH} y2={projectY(lat)} />
        ))}
      </g>
    </g>
  );
}

const degreeLabel = (value: number, axis: "lon" | "lat") =>
  `${Math.abs(value)}°${axis === "lon" ? "E" : "N"}`;

/**
 * The printed frame. It never zooms, so its degree labels only describe the map
 * at rest; they are hidden once the view moves away from that.
 */
export function MapFrame({ showDegrees }: { showDegrees: boolean }) {
  return (
    <>
      <g>
        <rect
          x={FRAME / 2}
          y={FRAME / 2}
          width={MAP_WIDTH - FRAME}
          height={MAP_HEIGHT - FRAME}
          fill="none"
          stroke="#111111"
          strokeWidth={FRAME}
        />
        <g stroke="#ffffff" strokeWidth={FRAME}>
          {GRATICULE_LONGITUDES.map((lon) => (
            <g key={lon}>
              <line x1={projectX(lon)} y1={FRAME} x2={projectX(lon)} y2={TICK} />
              <line
                x1={projectX(lon)}
                y1={MAP_HEIGHT - TICK}
                x2={projectX(lon)}
                y2={MAP_HEIGHT - FRAME}
              />
            </g>
          ))}
          {GRATICULE_LATITUDES.map((lat) => (
            <g key={lat}>
              <line x1={FRAME} y1={projectY(lat)} x2={TICK} y2={projectY(lat)} />
              <line
                x1={MAP_WIDTH - TICK}
                y1={projectY(lat)}
                x2={MAP_WIDTH - FRAME}
                y2={projectY(lat)}
              />
            </g>
          ))}
        </g>
      </g>

      <g
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize={22}
        fill="#111111"
        opacity={showDegrees ? 1 : 0}
      >
        {GRATICULE_LONGITUDES.map((lon) => (
          <g key={lon} textAnchor="middle">
            <text x={projectX(lon) + 34} y={FRAME + 30}>
              {degreeLabel(lon, "lon")}
            </text>
            <text x={projectX(lon) + 34} y={MAP_HEIGHT - FRAME - 14}>
              {degreeLabel(lon, "lon")}
            </text>
          </g>
        ))}
        {GRATICULE_LATITUDES.map((lat) => (
          <g key={lat} dominantBaseline="middle">
            <text x={FRAME + 14} y={projectY(lat) - 16}>
              {degreeLabel(lat, "lat")}
            </text>
            <text x={MAP_WIDTH - FRAME - 14} y={projectY(lat) - 16} textAnchor="end">
              {degreeLabel(lat, "lat")}
            </text>
          </g>
        ))}
      </g>
    </>
  );
}
