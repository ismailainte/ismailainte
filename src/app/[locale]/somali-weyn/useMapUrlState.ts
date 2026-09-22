"use client";

import { useCallback, useEffect, useRef } from "react";

export type MapLocation = { region?: string; district?: string; town?: string };

const PARAMS = ["region", "district", "town"] as const;

const readLocation = (search: string): MapLocation => {
  const params = new URLSearchParams(search);
  const location: MapLocation = {};
  for (const key of PARAMS) {
    const value = params.get(key);
    if (value) location[key] = value;
  }
  return location;
};

const toSearch = (location: MapLocation) => {
  const params = new URLSearchParams();
  for (const key of PARAMS) {
    if (location[key]) params.set(key, location[key] as string);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
};

const same = (a: MapLocation, b: MapLocation) =>
  PARAMS.every((key) => (a[key] ?? "") === (b[key] ?? ""));

/**
 * Keeps the open region, district and town in the query string so a view can be
 * linked and survives a reload. The History API is used directly rather than the
 * router so the page stays statically rendered and no navigation is triggered.
 */
export function useMapUrlState({
  onRestore,
}: {
  onRestore: (location: MapLocation) => void;
}) {
  const applied = useRef<MapLocation>({});
  const restore = useRef(onRestore);
  restore.current = onRestore;

  useEffect(() => {
    const initial = readLocation(window.location.search);
    applied.current = initial;
    if (initial.region) restore.current(initial);

    const onPopState = () => {
      const next = readLocation(window.location.search);
      applied.current = next;
      restore.current(next);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  /** Called whenever the selection changes; writes without adding history noise. */
  const publish = useCallback((location: MapLocation) => {
    if (typeof window === "undefined" || same(applied.current, location)) return;
    applied.current = location;
    const url = `${window.location.pathname}${toSearch(location)}`;
    window.history.replaceState(window.history.state, "", url);
  }, []);

  return { publish };
}
