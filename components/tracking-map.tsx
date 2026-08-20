"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

type LatLng = { lat: number; lng: number };

type TrackingMapProps = {
  pickup: LatLng;
  dropoff: LatLng;
  /** Called once if the tile layer never manages to render a single tile. */
  onTilesUnavailable?: () => void;
};

const BRAND_BLUE = "#2E7BC4";
const CHARITY_GREEN = "#12924A";

// Lucide's "map-pin" path — reused so these pins match the icon used
// everywhere else in the app (including the illustrated fallback).
const PIN_PATH =
  "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0";

function pinIconHtml(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${PIN_PATH}" fill="white"/><circle cx="12" cy="10" r="3" fill="white" stroke="${color}"/></svg>`;
}

// Renders imperatively via the Leaflet API rather than react-leaflet — one
// fewer dependency, and it sidesteps react-leaflet's SSR quirks. Leaflet
// itself touches `window` at import time, so it's dynamically imported
// inside the effect (which never runs during server rendering) instead of
// a top-level import.
export function TrackingMap({ pickup, dropoff, onTilesUnavailable }: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const leaflet = await import("leaflet");
      const L = leaflet.default ?? leaflet;
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current);
      mapRef.current = map;

      const pickupIcon = L.divIcon({
        html: pinIconHtml(BRAND_BLUE),
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
      const dropoffIcon = L.divIcon({
        html: pinIconHtml(CHARITY_GREEN),
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      L.marker([pickup.lat, pickup.lng], { icon: pickupIcon }).addTo(map);
      L.marker([dropoff.lat, dropoff.lng], { icon: dropoffIcon }).addTo(map);

      map.fitBounds(L.latLngBounds([pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]), {
        padding: [40, 40],
      });

      let tilesLoaded = 0;
      const tileLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      });

      tileLayer.on("tileload", () => {
        tilesLoaded += 1;
      });
      tileLayer.on("load", () => {
        // Fires once the current batch of tile requests has settled,
        // successful or not — if none succeeded, fall back rather than
        // leave a blank grey grid on screen.
        if (tilesLoaded === 0 && !cancelled) onTilesUnavailable?.();
      });

      tileLayer.addTo(map);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Pickup/charity coordinates are fixed for the life of a dispatched
    // delivery — no need to re-run this on every poll tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}
