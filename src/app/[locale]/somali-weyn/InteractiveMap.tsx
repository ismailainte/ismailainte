"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapDefs } from "./MapDefs";
import { MapDetailCard } from "./MapDetailCard";
import { AreaLabels, SettlementLabels, TownLabels } from "./MapLabels";
import { LegendDetail, MapLegend } from "./MapLegend";
import { MapSearch, SearchHit } from "./MapSearch";
import { MapFrame, MapTerrain } from "./MapTerrain";
import { DISTRICTS } from "./mapDistricts";
import { MAP_HEIGHT, MAP_WIDTH, unprojectX, unprojectY } from "./mapGeometry";
import { Area, REGIONS, Region } from "./mapRegions";
import { Town, loadRegionTowns, useRegionTowns } from "./mapTowns";
import { Bounds, viewTransform } from "./mapView";
import { MapLocation, useMapUrlState } from "./useMapUrlState";
import { useMapViewport } from "./useMapViewport";
import styles from "./SomaliWeyn.module.scss";

/** Above this scale the region names are legible enough to be worth drawing. */
const REGION_LABEL_SCALE = 1.8;
/** Half-width of the box a selected town is framed with, in map units. */
const TOWN_FRAME = 26;

const REGION_BY_ID = new Map(REGIONS.map((region) => [region.id, region]));

type Selection = { region?: Region; district?: Area; town?: Town };

/** Deeper zoom earns smaller places a label. */
const labelRankFor = (scale: number) => {
  if (scale < 4) return 2;
  if (scale < 7) return 4;
  if (scale < 11) return 5;
  return 6;
};

const townBounds = (town: Town): Bounds => [
  town.x - TOWN_FRAME,
  town.y - TOWN_FRAME,
  town.x + TOWN_FRAME,
  town.y + TOWN_FRAME,
];

function ClickableArea({
  area,
  active,
  focusable,
  onSelect,
  onHover,
}: {
  area: Area;
  active: boolean;
  focusable: boolean;
  onSelect: (area: Area) => void;
  onHover: (name: string | null) => void;
}) {
  return (
    <path
      d={area.d}
      className={active ? styles.areaActive : styles.area}
      fillRule="evenodd"
      role="button"
      tabIndex={focusable ? 0 : -1}
      aria-label={area.name}
      aria-pressed={active}
      onMouseEnter={() => onHover(area.name)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(area.name)}
      onBlur={() => onHover(null)}
      onClick={() => onSelect(area)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(area);
        }
      }}
    />
  );
}

export function InteractiveMap() {
  const { view, svgRef, dragged, handlers, zoomIn, zoomOut, flyToBounds, reset } = useMapViewport();
  const [selection, setSelection] = useState<Selection>({});
  const [hovered, setHovered] = useState<string | null>(null);

  const { towns, loading } = useRegionTowns(selection.region?.id);

  const districts = useMemo(
    () => (selection.region ? (DISTRICTS[selection.region.id] ?? []) : []),
    [selection.region],
  );

  const openRegion = useCallback(
    (region: Region) => {
      setSelection({ region });
      flyToBounds(region.bounds);
    },
    [flyToBounds],
  );

  const onRegionPath = useCallback(
    (area: Area) => {
      if (dragged.current) return;
      const region = REGION_BY_ID.get(area.id);
      if (region) openRegion(region);
    },
    [dragged, openRegion],
  );

  const onDistrictPath = useCallback(
    (area: Area) => {
      if (dragged.current) return;
      setSelection((current) => ({ region: current.region, district: area }));
      flyToBounds(area.bounds);
    },
    [dragged, flyToBounds],
  );

  const onTown = useCallback(
    (town: Town) => {
      if (dragged.current) return;
      setSelection((current) => ({
        region: current.region,
        district: districts.find((d) => d.id === town.districtId) ?? current.district,
        town,
      }));
      flyToBounds(townBounds(town));
    },
    [districts, dragged, flyToBounds],
  );

  const showAll = useCallback(() => {
    setSelection({});
    reset();
  }, [reset]);

  const backToRegion = useCallback(() => {
    const region = selection.region;
    if (!region) return;
    setSelection({ region });
    flyToBounds(region.bounds);
  }, [flyToBounds, selection.region]);

  const backToDistrict = useCallback(() => {
    const district = selection.district;
    if (!district) return;
    setSelection((current) => ({ region: current.region, district }));
    flyToBounds(district.bounds);
  }, [flyToBounds, selection.district]);

  const goUp = useCallback(() => {
    if (selection.town) backToDistrict();
    else if (selection.district) backToRegion();
    else if (selection.region) showAll();
  }, [backToDistrict, backToRegion, selection.district, selection.region, selection.town, showAll]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key !== "Escape" || target?.tagName === "INPUT") return;
      goUp();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goUp]);

  const onSearchPick = useCallback(
    async (hit: SearchHit) => {
      const region = REGION_BY_ID.get(hit.kind === "region" ? hit.id : hit.regionId);
      if (!region) return;

      if (hit.kind === "region") {
        openRegion(region);
        return;
      }

      if (hit.kind === "district") {
        const district = (DISTRICTS[region.id] ?? []).find((area) => area.id === hit.id);
        setSelection({ region, district });
        flyToBounds(district ? district.bounds : region.bounds);
        return;
      }

      const loaded = await loadRegionTowns(region.id);
      const town =
        loaded.find((candidate) => candidate.name === hit.name && candidate.x === hit.x) ??
        ({ name: hit.name, x: hit.x, y: hit.y, rank: 5, districtId: hit.districtId } as Town);
      setSelection({
        region,
        district: (DISTRICTS[region.id] ?? []).find((area) => area.id === hit.districtId),
        town,
      });
      flyToBounds(townBounds(town));
    },
    [flyToBounds, openRegion],
  );

  const coordinates = (x: number, y: number) => {
    const lon = unprojectX(x);
    const lat = unprojectY(y);
    return `${Math.abs(lat).toFixed(2)}°${lat < 0 ? "S" : "N"}, ${Math.abs(lon).toFixed(2)}°${lon < 0 ? "W" : "E"}`;
  };

  const detail = useMemo<LegendDetail | undefined>(() => {
    if (selection.town) {
      return {
        kicker: "TOWN",
        title: selection.town.name,
        rows: [
          { label: "District", value: selection.district?.name ?? "—" },
          { label: "Region", value: selection.region?.name ?? "—" },
          { label: "Group", value: selection.region?.group ?? "—" },
          { label: "Position", value: coordinates(selection.town.x, selection.town.y) },
        ],
      };
    }
    if (selection.district) {
      const places = towns.filter((town) => town.districtId === selection.district?.id).length;
      return {
        kicker: "DISTRICT",
        title: selection.district.name,
        rows: [
          { label: "Region", value: selection.region?.name ?? "—" },
          { label: "Group", value: selection.region?.group ?? "—" },
          { label: "Places", value: String(places) },
          { label: "Centre", value: coordinates(selection.district.label[0], selection.district.label[1]) },
        ],
      };
    }
    if (selection.region) {
      return {
        kicker: "REGION",
        title: selection.region.name,
        rows: [
          { label: "Group", value: selection.region.group },
          { label: "Districts", value: String(districts.length) },
          { label: "Places", value: String(selection.region.towns) },
          { label: "Centre", value: coordinates(selection.region.label[0], selection.region.label[1]) },
        ],
      };
    }
    return undefined;
  }, [districts.length, selection.district, selection.region, selection.town, towns]);

  // Only the towns inside the visible rectangle are drawn; a region like Bay has
  // 900 of them and there is no point mounting the ones that are off screen.
  const visibleTowns = useMemo(() => {
    const margin = 60 / view.k;
    const x0 = -view.x / view.k - margin;
    const x1 = (MAP_WIDTH - view.x) / view.k + margin;
    const y0 = -view.y / view.k - margin;
    const y1 = (MAP_HEIGHT - view.y) / view.k + margin;
    return towns.filter((town) => town.x >= x0 && town.x <= x1 && town.y >= y0 && town.y <= y1);
  }, [towns, view.k, view.x, view.y]);

  const { publish } = useMapUrlState({
    onRestore: useCallback((location: MapLocation) => {
      const region = location.region ? REGION_BY_ID.get(location.region) : undefined;
      if (!region) {
        setSelection({});
        reset();
        return;
      }
      const district = location.district
        ? (DISTRICTS[region.id] ?? []).find((area) => area.id === location.district)
        : undefined;
      setSelection({ region, district });
      flyToBounds((district ?? region).bounds);
      if (!location.town) return;
      loadRegionTowns(region.id).then((loaded) => {
        const town = loaded.find(
          (candidate) =>
            candidate.name === location.town &&
            (!district || candidate.districtId === district.id),
        );
        if (!town) return;
        setSelection((current) => ({ ...current, town }));
        flyToBounds(townBounds(town));
      });
    }, [flyToBounds, reset]),
  });

  useEffect(() => {
    publish({
      region: selection.region?.id,
      district: selection.district?.id,
      town: selection.town?.name,
    });
  }, [publish, selection.district?.id, selection.region?.id, selection.town?.name]);

  const focus = selection.district ?? selection.region;
  const veil = focus ? `M0 0H${MAP_WIDTH}V${MAP_HEIGHT}H0Z${focus.d}` : null;
  const labelRank = labelRankFor(view.k);

  const status = selection.town
    ? `${selection.town.name} · ${selection.district?.name ?? ""}`
    : selection.district
      ? `${selection.district.name} · ${towns.filter((t) => t.districtId === selection.district?.id).length} places`
      : selection.region
        ? `${selection.region.group} · ${districts.length} district${districts.length === 1 ? "" : "s"} · ${selection.region.towns} places`
        : "Scroll to zoom · drag to pan · click a region to open it";

  return (
    <div className={styles.stage}>
      <svg
        ref={svgRef}
        className={styles.canvas}
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-labelledby="somali-weyn-title somali-weyn-desc"
        {...handlers}
      >
        <title id="somali-weyn-title">Interactive physical map of Soomaali Weyn</title>
        <desc id="somali-weyn-desc">
          Relief map of Soomaali Weyn. Scroll or pinch to zoom, drag to pan, and select a region to
          open its districts and towns.
        </desc>

        <MapDefs />

        <g clipPath="url(#map-clip)">
          <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#ocean)" />

          <g transform={viewTransform(view)}>
            <MapTerrain />

            {veil ? (
              <path d={veil} fillRule="evenodd" fill="#ffffff" opacity="0.5" pointerEvents="none" />
            ) : null}

            <g className={styles.areas}>
              {/* Regions stay clickable while one is open, so a single click
                  moves straight from one region to another. */}
              {REGIONS.filter((region) => region.id !== selection.region?.id).map((region) => (
                <ClickableArea
                  key={region.id}
                  area={region}
                  active={false}
                  /* Once a region is open its districts carry the tab order, so
                     the background regions drop out of it. */
                  focusable={!selection.region}
                  onSelect={onRegionPath}
                  onHover={setHovered}
                />
              ))}
              {/* Keep the selected region itself above neighbouring regions.
                  This catch-all makes every point inside an enlarged/adjusted
                  region belong to it even where source district vintages leave
                  a tiny seam between polygons. Districts remain on top. */}
              {selection.region ? (
                <ClickableArea
                  area={selection.region}
                  active={false}
                  focusable={false}
                  onSelect={onRegionPath}
                  onHover={setHovered}
                />
              ) : null}
              {districts.map((district) => (
                <ClickableArea
                  key={district.id}
                  area={district}
                  active={district.id === selection.district?.id}
                  focusable
                  onSelect={onDistrictPath}
                  onHover={setHovered}
                />
              ))}
            </g>

            {focus ? (
              <path
                d={focus.d}
                fill="none"
                fillRule="evenodd"
                stroke="#1b1b1b"
                strokeWidth="4"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            ) : null}

            {selection.region ? null : <SettlementLabels scale={view.k} />}

            {selection.region ? (
              <>
                <AreaLabels areas={districts} scale={view.k} size={17} muted />
                <TownLabels
                  towns={visibleTowns}
                  scale={view.k}
                  labelRank={labelRank}
                  activeDistrictId={selection.district?.id}
                  selectedName={selection.town?.name}
                  onSelect={onTown}
                />
              </>
            ) : view.k >= REGION_LABEL_SCALE ? (
              <AreaLabels areas={REGIONS} scale={view.k} size={19} muted />
            ) : null}
          </g>

          <g className={styles.legend}>
            <MapLegend detail={detail} />
          </g>

          {hovered ? (
            <text
              x={1000}
              y={800}
              textAnchor="middle"
              fontFamily="Georgia, 'Times New Roman', serif"
              fontSize={32}
              fontWeight="700"
              fill="#111111"
              stroke="rgba(255, 255, 255, 0.92)"
              strokeWidth={7}
              paintOrder="stroke fill"
              pointerEvents="none"
            >
              {hovered}
            </text>
          ) : null}
        </g>

        <MapFrame showDegrees={view.k < 1.02} />
      </svg>

      <div className={styles.topBar}>
        <nav className={styles.breadcrumb} aria-label="Map location">
          <button type="button" onClick={showAll} disabled={!selection.region}>
            Soomaali Weyn
          </button>
          {selection.region ? (
            <>
              <span aria-hidden>/</span>
              <button
                type="button"
                onClick={backToRegion}
                disabled={!selection.district && !selection.town}
              >
                {selection.region.name}
              </button>
            </>
          ) : null}
          {selection.district ? (
            <>
              <span aria-hidden>/</span>
              <button type="button" onClick={backToDistrict} disabled={!selection.town}>
                {selection.district.name}
              </button>
            </>
          ) : null}
          {selection.town ? (
            <>
              <span aria-hidden>/</span>
              <span className={styles.current}>{selection.town.name}</span>
            </>
          ) : null}
        </nav>

        <MapSearch onPick={onSearchPick} />
      </div>

      <div className={styles.controls}>
        <button type="button" onClick={zoomIn} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={zoomOut} aria-label="Zoom out">
          −
        </button>
        <button type="button" onClick={goUp} aria-label="Go up one level" disabled={!selection.region}>
          ↑
        </button>
        <button type="button" onClick={showAll} aria-label="Reset the map">
          ⤾
        </button>
      </div>

      <MapDetailCard detail={detail} />

      <p className={styles.hint} aria-live="polite">
        {loading ? "Loading places…" : status}
      </p>
    </div>
  );
}
