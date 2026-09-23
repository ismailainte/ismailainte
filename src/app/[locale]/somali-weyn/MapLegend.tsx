import { CoatOfArms } from "./CoatOfArms";

export const LEGEND_BOX = { x: 1180, y: 295, width: 636, height: 736 };

const { x: X, y: Y, width: W } = LEGEND_BOX;
const RIGHT = X + W;

const BAR_X = 1330;
const BAR_W = 340;

type KeyRowProps = {
  y: number;
  label: string;
  size?: number;
  children: React.ReactNode;
};

function KeyRow({ y, label, size = 20, children }: KeyRowProps) {
  return (
    <g>
      {children}
      <text x={X + 70} y={y} fontSize={size} dominantBaseline="middle">
        {label}
      </text>
    </g>
  );
}

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
          {detail ? detail.kicker : "FEDERAL REPUBLIC OF"}
        </text>
        <text
          x={X + 318}
          y={630}
          fontSize={detail ? titleSize(detail.title) : 54}
          fontWeight="700"
          letterSpacing={detail ? 1.5 : 3}
        >
          {detail ? detail.title.toUpperCase() : "SOMALIA"}
        </text>
      </g>

      <line x1={X} y1={646} x2={RIGHT} y2={646} stroke="#111111" strokeWidth="3" />

      {/* keys, replaced by the selection's details once something is open */}
      {detail ? (
        <DetailRows rows={detail.rows} />
      ) : (
      <g>
        <KeyRow y={676} label="CAPITAL" size={36}>
          <circle cx={X + 44} cy={676} r={11} fill="none" stroke="#111111" strokeWidth="3.5" />
        </KeyRow>
        <KeyRow y={720} label="Major City">
          <circle cx={X + 44} cy={720} r={8} fill="#111111" />
        </KeyRow>
        <KeyRow y={751} label="Soomaali Weyn Outer Boundary">
          <line x1={X + 22} y1={751} x2={X + 62} y2={751} stroke="#111111" strokeWidth="5" />
        </KeyRow>
        <KeyRow y={782} label="Provincial Borders">
          <line x1={X + 22} y1={782} x2={X + 62} y2={782} stroke="#a3252b" strokeWidth="3" />
        </KeyRow>
        <KeyRow y={813} label="Rivers">
          <line x1={X + 22} y1={813} x2={X + 62} y2={813} stroke="#2d6f9e" strokeWidth="3" />
        </KeyRow>
        <KeyRow y={846} label="Lakes">
          <path
            d="M1202 850 C1210 840 1222 856 1232 846 C1240 838 1244 848 1242 852 C1234 860 1220 848 1212 856 C1206 861 1202 856 1202 850 Z"
            fill="none"
            stroke="#2d6f9e"
            strokeWidth="2.5"
          />
        </KeyRow>
      </g>
      )}

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
