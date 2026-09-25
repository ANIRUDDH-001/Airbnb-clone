"use client";

import "leaflet/dist/leaflet.css";

import type { LatLngTuple, Map as LeafletMap, Marker } from "leaflet";
import { Star, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { ListingCard as Card } from "@/lib/api/types";
import { cardHeading, formatINR, formatRating, plural, sizedPhoto } from "@/lib/format";

// OpenStreetMap's standard tiles: free and keyless for light use with attribution. globals.css mutes them so the pins stand out.
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const INDIA: LatLngTuple = [22.5, 79];

type Leaflet = typeof import("leaflet");

interface SearchMapProps {
  listings: Card[];
  /** Dates and guests carried to the detail page. */
  linkQuery: string;
  /** The result card under the pointer; its pin is highlighted. */
  hoveredId: number | null;
}

/** Price pins for the current page of results. Leaflet touches `window`, so it is loaded only in the browser. */
export function SearchMap({ listings, linkQuery, hoveredId }: SearchMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<{ L: Leaflet; map: LeafletMap } | null>(null);
  const markersRef = useRef(new Map<number, Marker>());
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = listings.find((listing) => listing.id === selectedId) ?? null;

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    const markers = markersRef.current;
    import("leaflet").then((L) => {
      const container = containerRef.current;
      if (cancelled || !container) return;
      const map = L.map(container, { zoomControl: false, center: INDIA, zoom: 4 });
      map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
      L.control.zoom({ position: "topright" }).addTo(map);
      L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);
      map.on("click", () => setSelectedId(null));
      // The map is resized by the layout (and shown/hidden on phones); Leaflet has to be told.
      observer = new ResizeObserver(() => map.invalidateSize());
      observer.observe(container);
      leafletRef.current = { L, map };
      setReady(true);
    });
    return () => {
      cancelled = true;
      observer?.disconnect();
      leafletRef.current?.map.remove();
      leafletRef.current = null;
      markers.clear();
    };
  }, []);

  // One pin per result, then frame them all.
  useEffect(() => {
    const leaflet = leafletRef.current;
    if (!ready || !leaflet) return;
    const { L, map } = leaflet;
    const markers = markersRef.current;
    for (const listing of listings) {
      const price = formatINR(listing.stay_price?.total ?? listing.nightly_price);
      const marker = L.marker([listing.latitude, listing.longitude], {
        icon: L.divIcon({ className: "map-pin", html: `<span>${price}</span>`, iconSize: [0, 0] }),
        title: listing.title,
        alt: `${price}, ${listing.title}`,
      })
        .on("click", () => setSelectedId(listing.id))
        .addTo(map);
      markers.set(listing.id, marker);
    }
    if (listings.length) {
      // Extra room at the bottom keeps pins clear of the phone "Show list" button.
      map.fitBounds(L.latLngBounds(listings.map((l): LatLngTuple => [l.latitude, l.longitude])), {
        paddingTopLeft: [56, 56],
        paddingBottomRight: [56, 120],
        maxZoom: 13,
      });
    }
    return () => {
      markers.forEach((marker) => marker.remove());
      markers.clear();
    };
  }, [ready, listings]);

  // Highlight the hovered card's pin and the open one, and lift them above their neighbours.
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const active = id === hoveredId || id === selectedId;
      marker.getElement()?.classList.toggle("is-active", active);
      marker.getElement()?.classList.toggle("is-selected", id === selectedId);
      marker.setZIndexOffset(active ? 1000 : 0);
    });
  }, [hoveredId, selectedId, listings, ready]);

  return (
    <div className="relative size-full">
      <div ref={containerRef} className="size-full bg-soft" aria-label="Map of results" role="region" />
      {selected && <MapCard listing={selected} href={`/rooms/${selected.id}${linkQuery}`} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function MapCard({ listing, href, onClose }: { listing: Card; href: string; onClose: () => void }) {
  return (
    // Docked at the top on phones, where the "Show list" button occupies the bottom of the map.
    <div className="absolute inset-x-4 top-4 z-[1000] mx-auto max-w-[340px] overflow-hidden rounded-2xl bg-white shadow-float lg:bottom-6 lg:top-auto">
      <Link href={href} className="block">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote photos are served as-is */}
        <img src={sizedPhoto(listing.photos[0], 720)} alt="" className="aspect-[16/10] w-full object-cover" />
        <div className="p-3 text-[15px] leading-5">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-semibold">{cardHeading(listing.property_type, listing.room_type, listing.city)}</p>
            <span className="flex shrink-0 items-center gap-1">
              {listing.rating_avg !== null ? (
                <>
                  <Star className="size-3 fill-ink" aria-hidden />
                  {formatRating(listing.rating_avg)} ({listing.review_count})
                </>
              ) : (
                "New"
              )}
            </span>
          </div>
          <p className="truncate text-muted">{listing.title}</p>
          <p className="mt-1">
            {listing.stay_price ? (
              <>
                <span className="font-semibold">{formatINR(listing.stay_price.total)}</span> for {plural(listing.stay_price.nights, "night")}
              </>
            ) : (
              <>
                <span className="font-semibold">{formatINR(listing.nightly_price)}</span> night
              </>
            )}
          </p>
        </div>
      </Link>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white/95 shadow-sm hover:scale-105"
      >
        <X className="size-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}
