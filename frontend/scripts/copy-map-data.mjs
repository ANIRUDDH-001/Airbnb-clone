// Copies the India boundary corrections (PMTiles) from the pinned npm package into public/maps/,
// so the site serves them itself instead of fetching them from a CDN at runtime. Runs before dev and build.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FILE = "india_boundary_corrections.pmtiles";
const source = fileURLToPath(import.meta.resolve("@india-boundary-corrector/data/pmtiles"));
const target = join(import.meta.dirname, "..", "public", "maps", FILE);

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log(`copied ${FILE} to public/maps/`);
