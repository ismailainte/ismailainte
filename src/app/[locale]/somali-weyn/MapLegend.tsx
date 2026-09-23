import { CoatOfArms } from "./CoatOfArms";
import { MAP_STATS } from "./mapGeometry";

export const LEGEND_BOX = { x: 1180, y: 295, width: 636, height: 736 };

const { x: X, y: Y, width: W } = LEGEND_BOX;
const RIGHT = X + W;

const BAR_X = 1330;
const BAR_W = 340;

type BarProps = {
  y: number;
  left: string;
  centre: string;
  right: string;
  children: React.ReactNode;
};

function Bar({ y, left, centre, right, children }: BarProps) {
  return (
    <g>
      <text x={BAR_X} y={y} fontSize={17}>
        {left}
      </text>
      <text x={BAR_X + BAR_W / 2} y={y} fontSize={20} fontWeight="700" textAnchor="middle">
        {centre}
      </text>
      <text x={BAR_X + BAR_W} y={y} fontSize={17} textAnchor="end">
        {right}
      </text>
      {children}
    </g>
  );
}

export type LegendDetail = {
  kicker: string;
  title: string;
  rows: { label: string; value: string }[];
};

/** Long names have to drop a size or two to stay inside the box. */
const titleSize = (title: string) => {
  if (title.length <= 10) return 54;
  if (title.length <= 15) return 42;
  if (title.length <= 22) return 32;
  return 25;
};

function DetailRows({ rows }: { rows: LegendDetail["rows"] }) {
  const top = 690;
  const step = 42;
  return (
    <g>
      {rows.slice(0, 5).map((row, index) => {
        const y = top + index * step;
        return (
          <g key={row.label}>
            <text x={X + 28} y={y} fontSize={20} dominantBaseline="middle" fill="#5a5a5a">
              {row.label}
            </text>
            <text
              x={RIGHT - 28}
              y={y}
              fontSize={22}
              fontWeight="700"
              textAnchor="end"
              dominantBaseline="middle"
            >
              {row.value}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function MapLegend({ detail }: { detail?: LegendDetail }) {
  const overviewRows = [
    { label: "Bedka guud", value: `${MAP_STATS.areaKm2.toLocaleString("en-US")} km²` },
    { label: "Gobollada", value: MAP_STATS.regions.toLocaleString("en-US") },
    { label: "Webiyada", value: MAP_STATS.rivers.toLocaleString("en-US") },
    { label: "Dhererka xeebta", value: `${MAP_STATS.coastlineKm.toLocaleString("en-US")} km` },
    { label: "Jasiiradaha", value: MAP_STATS.islands.toLocaleString("en-US") },
  ];
  return (
    <g fontFamily="Georgia, 'Times New Roman', serif" fill="#111111" pointerEvents="none">
      <rect
        x={X}
        y={Y}
        width={W}
        height={LEGEND_BOX.height}
        fill="#ffffff"
        stroke="#111111"
        strokeWidth="3"
      />

      {/* national symbols */}
      <g>
        <rect x={1246} y={338} width={222} height={148} fill="#4189dd" />
        <path
          d="M1357 371 L1367.7 404 L1402.4 404 L1374.3 424.4 L1385 457.4 L1357 437 L1329 457.4 L1339.7 424.4 L1311.6 404 L1346.3 404 Z"
          fill="#ffffff"
        />
        <g transform="translate(1560 310)">
          <CoatOfArms />
        </g>
      </g>

      <line x1={X} y1={540} x2={RIGHT} y2={540} stroke="#111111" strokeWidth="3" />

      {/* title, which becomes the name of whatever is selected */}
      <g textAnchor="middle">
        <text x={X + 318} y={582} fontSize={23} letterSpacing="1.5">
          {detail ? detail.kicker : "DHULKA"}
        </text>
        <text
          x={X + 318}
          y={630}
          fontSize={detail ? titleSize(detail.title) : 54}
          fontWeight="700"
          letterSpacing={detail ? 1.5 : 3}
        >
          {detail ? detail.title.toUpperCase() : "SOOMAALI WEYN"}
        </text>
      </g>

      <line x1={X} y1={646} x2={RIGHT} y2={646} stroke="#111111" strokeWidth="3" />

      {/* Overview figures become the selected region's details on drill-down. */}
      <DetailRows rows={detail ? detail.rows : overviewRows} />

      <line x1={X} y1={872} x2={RIGHT} y2={872} stroke="#111111" strokeWidth="3" />

      {/* measurement bars */}
      <Bar y={902} left="0 m" centre="Bathymetry" right="10,000 m">
        <rect
          x={BAR_X}
          y={910}
          width={BAR_W}
          height={16}
          fill="url(#legend-bathymetry)"
          stroke="#111111"
          strokeWidth="2"
        />
      </Bar>

      <Bar y={951} left="Low" centre="Elevation" right="High">
        <rect
          x={BAR_X}
          y={959}
          width={BAR_W}
          height={16}
          fill="url(#legend-elevation)"
          stroke="#111111"
          strokeWidth="2"
        />
      </Bar>

      <Bar y={1000} left="0 km" centre="Scale" right="500 km">
        <g stroke="#111111" strokeWidth="2">
          <rect x={BAR_X} y={1008} width={BAR_W} height={16} fill="#ffffff" />
          {Array.from({ length: 5 }, (_, i) => (
            <rect
              key={i}
              x={BAR_X + (i * 2 * BAR_W) / 10}
              y={1008}
              width={BAR_W / 10}
              height={16}
              fill="#111111"
            />
          ))}
        </g>
      </Bar>
    </g>
  );
}
