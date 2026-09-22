import { projectX, projectY } from "./mapGeometry";
import { CAPITAL, CITIES, ISLANDS, Place } from "./mapPlaces";
import type { Area } from "./mapRegions";
import type { Town } from "./mapTowns";

/**
 * Labels live inside the zoom transform so they stay pinned to their feature,
 * but every size is divided by the scale so the type keeps its on-screen size.
 */
type Scaled = { scale: number };

function CityLabel({ place, scale, capital = false }: { place: Place; capital?: boolean } & Scaled) {
  const x = projectX(place.lon);
  const y = projectY(place.lat) + (place.dy ?? 0);
  const left = place.side === "left";
  const gap = (capital ? 26 : 14) / scale;

  return (
    <g>
      {capital ? (
        <circle
          cx={x}
          cy={y}
          r={13 / scale}
          fill="#ffffff"
          stroke="#111111"
          strokeWidth={4 / scale}
        />
      ) : (
        <circle cx={x} cy={y} r={8 / scale} fill="#111111" />
      )}
      <text
        x={left ? x - gap : x + gap}
        y={y}
        textAnchor={left ? "end" : "start"}
        dominantBaseline="middle"
        fontSize={(capital ? 34 : 20) / scale}
        fontWeight={capital ? 700 : 400}
        letterSpacing={capital ? 1.5 / scale : 0}
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth={(capital ? 5 : 3.5) / scale}
        strokeLinejoin="round"
      >
        {place.name}
      </text>
    </g>
  );
}

export function SettlementLabels({ scale }: Scaled) {
  return (
    <g fontFamily="Georgia, 'Times New Roman', serif" fill="#111111" pointerEvents="none">
      {CITIES.map((city) => (
        <CityLabel key={city.name} place={city} scale={scale} />
      ))}
      <CityLabel place={CAPITAL} capital scale={scale} />
      {ISLANDS.map((island) => (
        <text
          key={island.name}
          x={projectX(island.lon)}
          y={projectY(island.lat)}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={22 / scale}
          fontStyle="italic"
          letterSpacing={1 / scale}
          paintOrder="stroke"
          stroke="#ffffff"
          strokeWidth={3.5 / scale}
          strokeLinejoin="round"
        >
          {island.name}
        </text>
      ))}
    </g>
  );
}

/**
 * Towns of the open region. Every town gets a dot; labels are thinned by rank so
 * that a zoomed-out region shows its seats and a zoomed-in one shows hamlets.
 */
export function TownLabels({
  towns,
  scale,
  labelRank,
  activeDistrictId,
  onSelect,
  selectedName,
}: {
  towns: Town[];
  labelRank: number;
  activeDistrictId?: string;
  onSelect: (town: Town) => void;
  selectedName?: string;
} & Scaled) {
  return (
    <g fontFamily="Georgia, 'Times New Roman', serif" fill="#111111">
      {towns.map((town) => {
        const dimmed = activeDistrictId ? town.districtId !== activeDistrictId : false;
        const selected = town.name === selectedName;
        const showLabel = selected || (!dimmed && town.rank <= labelRank);
        const radius = (town.rank <= 2 ? 7 : town.rank <= 4 ? 5.5 : 4) / scale;

        return (
          <g
            key={`${town.districtId}-${town.name}-${town.x}-${town.y}`}
            opacity={dimmed ? 0.35 : 1}
            role="button"
            tabIndex={showLabel ? 0 : -1}
            aria-label={town.name}
            style={{ cursor: "pointer" }}
            onClick={() => onSelect(town)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(town);
              }
            }}
          >
            <circle
              cx={town.x}
              cy={town.y}
              r={radius}
              fill={selected ? "#a3252b" : "#1b1b1b"}
              stroke="#ffffff"
              strokeWidth={1.2 / scale}
            />
            {showLabel ? (
              <text
                x={town.x + radius + 4 / scale}
                y={town.y}
                dominantBaseline="middle"
                fontSize={(town.rank <= 2 ? 17 : 14) / scale}
                fontWeight={selected ? 700 : 400}
                paintOrder="stroke"
                stroke="#ffffff"
                strokeWidth={3 / scale}
                strokeLinejoin="round"
              >
                {town.name}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

export function AreaLabels({
  areas,
  scale,
  size,
  muted = false,
}: { areas: Area[]; size: number; muted?: boolean } & Scaled) {
  return (
    <g
      fontFamily="Georgia, 'Times New Roman', serif"
      fill={muted ? "#4a4a4a" : "#1b1b1b"}
      pointerEvents="none"
    >
      {areas.map((area) => (
        <text
          key={area.id}
          x={area.label[0]}
          y={area.label[1]}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size / scale}
          letterSpacing={0.6 / scale}
          paintOrder="stroke"
          stroke="#ffffff"
          strokeWidth={4 / scale}
          strokeLinejoin="round"
        >
          {area.name}
        </text>
      ))}
    </g>
  );
}
