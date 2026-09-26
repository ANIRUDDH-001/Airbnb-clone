import { extendLeaflet } from "@india-boundary-corrector/leaflet-layer";
import type { Map as LeafletMap } from "leaflet";

type Leaflet = typeof import("leaflet");

// OpenStreetMap's standard tiles: free and keyless for light use with attribution. globals.css mutes them so the pins stand out.
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
// OSM draws India's northern boundary along the Line of Control. The corrector redraws each tile with India's
// official boundary, read from this vector file (copied from the npm package into public/ by scripts/copy-map-data.mjs).
const BOUNDARY_CORRECTIONS = "/maps/india_boundary_corrections.pmtiles";

/** The one place every map gets its base tiles, so all maps on the site draw the same borders. */
export function addBaseLayer(L: Leaflet, map: LeafletMap) {
  extendLeaflet(L); // a no-op after the first call
  map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
  const tiles = L.tileLayer.indiaBoundaryCorrected(TILES, {
    attribution: ATTRIBUTION,
    maxZoom: 19,
    layerConfig: "osm-carto",
    pmtilesUrl: BOUNDARY_CORRECTIONS,
  });
  // If the corrections can't load, tiles still show, just uncorrected; say so once rather than per tile.
  tiles.once("correctionerror", (e) => console.warn("India boundary corrections unavailable:", (e as unknown as { error: unknown }).error));
  tiles.addTo(map);
}
