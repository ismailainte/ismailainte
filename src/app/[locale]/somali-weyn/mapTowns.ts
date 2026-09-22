"use client";

import { useEffect, useState } from "react";

/** [name, x, y, rank] — rank 0 is a national capital, 6 a hamlet. */
export type TownTuple = [string, number, number, number];

export type Town = { name: string; x: number; y: number; rank: number; districtId: string };

/** [name, regionId, districtId, x, y, rank] */
export type IndexTuple = [string, string, string, number, number, number];

const regionCache = new Map<string, Town[]>();
const pending = new Map<string, Promise<Town[]>>();
let indexCache: IndexTuple[] | null = null;
let indexPending: Promise<IndexTuple[]> | null = null;

async function fetchRegionTowns(regionId: string): Promise<Town[]> {
  const response = await fetch(`/map/towns/${regionId}.json`);
  if (!response.ok) throw new Error(`towns for ${regionId}: ${response.status}`);
  const payload = (await response.json()) as Record<string, TownTuple[]>;
  return Object.entries(payload).flatMap(([districtId, list]) =>
    list.map(([name, x, y, rank]) => ({ name, x, y, rank, districtId })),
  );
}

export function loadRegionTowns(regionId: string): Promise<Town[]> {
  const cached = regionCache.get(regionId);
  if (cached) return Promise.resolve(cached);
  const existing = pending.get(regionId);
  if (existing) return existing;
  const request = fetchRegionTowns(regionId)
    .then((towns) => {
      regionCache.set(regionId, towns);
      return towns;
    })
    .catch(() => [] as Town[])
    .finally(() => pending.delete(regionId));
  pending.set(regionId, request);
  return request;
}

export function loadTownIndex(): Promise<IndexTuple[]> {
  if (indexCache) return Promise.resolve(indexCache);
  indexPending ??= fetch("/map/towns-index.json")
    .then((response) => (response.ok ? response.json() : []))
    .then((data: IndexTuple[]) => {
      indexCache = data;
      return data;
    })
    .catch(() => [] as IndexTuple[]);
  return indexPending;
}

/** Towns of the open region, fetched once and kept for the rest of the session. */
export function useRegionTowns(regionId: string | undefined) {
  const [towns, setTowns] = useState<Town[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!regionId) {
      setTowns([]);
      return;
    }
    const cached = regionCache.get(regionId);
    if (cached) {
      setTowns(cached);
      return;
    }
    let active = true;
    setLoading(true);
    setTowns([]);
    loadRegionTowns(regionId).then((loaded) => {
      if (!active) return;
      setTowns(loaded);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [regionId]);

  return { towns, loading };
}
