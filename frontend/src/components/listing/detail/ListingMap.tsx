"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useRef } from "react";

import { addBaseLayer } from "@/lib/map";

interface ListingMapProps {
  latitude: number;
  longitude: number;
  label: string;
}

/** The listing's neighbourhood, with a soft circle rather than a pin: the exact address is shared after booking. */
export function ListingMap({ latitude, longitude, label }: ListingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | undefined;
    import("leaflet").then((L) => {
      const container = containerRef.current;
      if (cancelled || !container) return;
      map = L.map(container, { center: [latitude, longitude], zoom: 13, zoomControl: false, scrollWheelZoom: false });
      L.control.zoom({ position: "topright" }).addTo(map);
      addBaseLayer(L, map);
      L.circle([latitude, longitude], { radius: 600, stroke: false, fillColor: "#FF385C", fillOpacity: 0.18 }).addTo(map);
      L.marker([latitude, longitude], {
        icon: L.divIcon({ className: "map-home", html: "<span></span>", iconSize: [0, 0] }),
        keyboard: false,
        interactive: false,
      }).addTo(map);
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [latitude, longitude]);

  return <div ref={containerRef} role="region" aria-label={`Map of ${label}`} className="h-[360px] w-full overflow-hidden rounded-xl bg-soft md:h-[480px]" />;
}
