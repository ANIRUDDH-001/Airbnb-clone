import type { Map as LeafletMap } from "leaflet";

type Leaflet = typeof import("leaflet");

// OpenStreetMap's standard tiles: free and keyless for light use with attribution. globals.css mutes them so the pins stand out.
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** The one place every map gets its base tiles, so all maps on the site draw the same borders. */
export function addBaseLayer(L: Leaflet, map: LeafletMap) {
  map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
  L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);
}
