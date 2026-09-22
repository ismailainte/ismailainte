"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DISTRICTS } from "./mapDistricts";
import { REGIONS } from "./mapRegions";
import { IndexTuple, loadTownIndex } from "./mapTowns";
import styles from "./SomaliWeyn.module.scss";

const MAX_RESULTS = 8;

export type SearchHit =
  | { kind: "region"; id: string; name: string; context: string }
  | { kind: "district"; id: string; regionId: string; name: string; context: string }
  | {
      kind: "town";
      name: string;
      regionId: string;
      districtId: string;
      x: number;
      y: number;
      context: string;
    };

const normalise = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "");

/** Regions and districts ship with the page; the town index is fetched on first use. */
export function MapSearch({ onPick }: { onPick: (hit: SearchHit) => void }) {
  const [query, setQuery] = useState("");
  const [townIndex, setTownIndex] = useState<IndexTuple[]>([]);
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (query.length < 2 || townIndex.length) return;
    let active = true;
    loadTownIndex().then((data) => {
      if (active) setTownIndex(data);
    });
    return () => {
      active = false;
    };
  }, [query, townIndex.length]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const hits = useMemo<SearchHit[]>(() => {
    const needle = normalise(query.trim());
    if (needle.length < 2) return [];

    const regionName = new Map(REGIONS.map((region) => [region.id, region.name]));
    const results: SearchHit[] = [];
    const push = (hit: SearchHit, exact: boolean) => {
      if (exact) results.unshift(hit);
      else results.push(hit);
    };

    for (const region of REGIONS) {
      const name = normalise(region.name);
      if (name.includes(needle)) {
        push(
          { kind: "region", id: region.id, name: region.name, context: region.group },
          name.startsWith(needle),
        );
      }
    }

    for (const [regionId, list] of Object.entries(DISTRICTS)) {
      for (const district of list) {
        const name = normalise(district.name);
        if (!name.includes(needle)) continue;
        push(
          {
            kind: "district",
            id: district.id,
            regionId,
            name: district.name,
            context: regionName.get(regionId) ?? "",
          },
          name.startsWith(needle),
        );
      }
    }

    for (const [name, regionId, districtId, x, y] of townIndex) {
      const candidate = normalise(name);
      if (!candidate.startsWith(needle)) continue;
      results.push({
        kind: "town",
        name,
        regionId,
        districtId,
        x,
        y,
        context: regionName.get(regionId) ?? "",
      });
      if (results.length > MAX_RESULTS * 4) break;
    }

    return results.slice(0, MAX_RESULTS);
  }, [query, townIndex]);

  return (
    <div className={styles.search} ref={container}>
      <input
        type="search"
        value={query}
        placeholder="Search region, district or town"
        aria-label="Search the map"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "Enter" && hits.length) {
            onPick(hits[0]);
            setOpen(false);
          }
        }}
      />
      {open && hits.length ? (
        <ul className={styles.results}>
          {hits.map((hit) => (
            <li key={`${hit.kind}-${"id" in hit ? hit.id : `${hit.name}-${hit.x}`}`}>
              <button
                type="button"
                onClick={() => {
                  onPick(hit);
                  setOpen(false);
                }}
              >
                <strong>{hit.name}</strong>
                <span>
                  {hit.kind} · {hit.context}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
