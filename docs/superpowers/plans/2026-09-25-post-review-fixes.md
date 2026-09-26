# Post-review fixes: plan

**Constraints from the brief:** Next.js (TS) + FastAPI + **SQLite**. "All bookings must persist", "All listing data must persist". Hosted working demo. **Free tier only** (user decision).
**Goal:** reduce risk before submission. No new features. Every phase ends with the site verified, not just tests passing.
**Decisions so far:** persistence = **Option A** (Render free + Litestream → Backblaze B2). India map = **`@india-boundary-corrector/leaflet-layer`**.

## Review triage (what we act on)

| Review claim | Verdict |
|---|---|
| Ephemeral SQLite on Render Free breaks "bookings must persist" | **Agree. Top issue.** Phase 1. |
| Move to PostgreSQL | **Reject.** The brief mandates SQLite. The disk is the problem, not the database. |
| README placeholders and the "no code changes" claim | **Agree.** Fixed. |
| No E2E tests | **Agree.** Phase 3, a handful of specs. |
| Cold starts | **Agree.** Keep-alive ping (Phase 1) plus a friendlier waking state (Phase 5). |
| `SESSION_SECRET` default | Hygiene only; Render generates it. Phase 5. |
| Alembic | Not needed for one SQLite schema. Skip. |
| Pixel-perfect fidelity | Targeted fixes only, after an audit (Phase 4). |
| Dark mode, uploads, messaging, experiences | Skip; the brief allows them to be bonus or placeholder. |
| Missed by the review: **India's border drawn at the LoC** | **Phase 2, P0.** Every "Anywhere" search shows it. |

---

## Phase 1: Durable SQLite (Option A)

**Done on the branch:** WAL + busy_timeout pragmas, `litestream.yml`, `scripts/install-litestream.sh`, `scripts/start.sh`, `render.yaml` env vars, README, keep-alive workflow. 117 backend tests pass; the no-bucket fallback boots and serves.

**Remaining work**

1. **Harden the install.** Verify the Litestream tarball's SHA-256 in `install-litestream.sh`, so the build fails if the download changes. The checksum is taken from the v0.3.13 release page.
2. **Failure behaviour (keep as is, document it).** If the restore fails (bad keys, B2 down), `start.sh` exits and Render keeps the old instance running. It must **not** fall back to a fresh seed. A fresh database would replicate as a new generation, and the next boot would restore *that*, silently discarding real bookings.
3. **Known risk to document:** Render's zero-downtime deploys briefly run the old and new instance side by side. Writes made to the old one during that window (seconds) can be lost. It's acceptable for a demo: say so in the README, and don't deploy while demoing.
4. **User setup (about 10 min):**
   - Create a private B2 bucket and a key scoped to that bucket.
   - Set the 5 `LITESTREAM_*` vars on Render.
   - Set the build and start commands if the service wasn't created from the Blueprint.
5. **Verify on the site:**
   - The Render logs show `restored` or `initialized`, then `replicating`.
   - Book a stay, then **Manual Deploy** on Render.
   - The trip still appears in My Trips, its nights are still struck through on the calendar, and search for those dates still excludes the listing.
   - Repeat after a 15+ min idle sleep.
   - Create a listing as the host, redeploy, and confirm it's still there.
6. **Interview notes:** why SQLite plus Litestream, what WAL is, the ~1 s loss window, the generation problem, and the single-writer limit.

**Exit:** a booking survives a redeploy and a sleep on the live site.

## Phase 2: India's official boundary on every map

**Done on the branch:** both maps (search + listing) go through `frontend/src/lib/map.ts`; the listing page's OSM iframe is replaced by a Leaflet `ListingMap`.

**Remaining work**

1. **Install** `@india-boundary-corrector/leaflet-layer@0.2.2` and `@india-boundary-corrector/data@0.2.2` (pinned). *Blocked: this session isn't permitted to run the install. It needs the user's permission rule, or the user runs it.*
2. `lib/map.ts`: call `extendLeaflet(L)` once, and use `L.tileLayer.indiaBoundaryCorrected(TILES, { layerConfig: "osm-carto", pmtilesUrl })`. Keep one function, so both maps change together.
3. **Self-host the boundary data** (1.6 MB PMTiles):
   - A `predev`/`prebuild` script copies it from `node_modules` into `frontend/public/maps/`, which is gitignored, so it can't drift from the package version.
   - This avoids a runtime dependency on jsDelivr.
4. **Failure mode:** listen for `correctionerror` and log once. The tiles still render, uncorrected.
5. **Verify visually** with Playwright screenshots, on local and the Vercel preview:
   - The search map at zoom 4–6 over J&K, Ladakh, Aksai Chin and Arunachal Pradesh.
   - A listing map zoomed out to zoom 5.
   - PMTiles requests return `206 Partial Content` on Vercel.
6. **README:** one line in Features ("boundaries as per Government of India"). Known limit: the corrector fixes **lines**, not **labels**, so some OSM place names in the region stay as OSM has them.

**Exit:** no map on the site shows the LoC as India's border, at any zoom.

## Phase 3: Browser tests + CI

1. Playwright against local servers (FastAPI on a temp SQLite file + `next start`), using the pre-installed Chromium:
   1. Search → listing → reserve → confirmation → My Trips.
   2. The booked nights are blocked on the calendar and excluded from search for those dates; a second overlapping booking gets a 409.
   3. The wishlist heart survives a reload.
   4. The host creates, edits and deletes a listing.
   5. A guest reviews a past stay, and the listing rating updates.
2. `.github/workflows/ci.yml` runs:
   - Backend: pytest.
   - Frontend: lint, typecheck, vitest and build.
   - Playwright E2E, uploading the report as an artifact on failure.
3. README "Tests" section: update counts and add how to run E2E.

**Exit:** CI green on the PR.

## Phase 4: Targeted Airbnb fidelity (after an audit)

1. Compare Airbnb and our site side by side, at desktop and mobile widths, on: home, search + map, listing, checkout, trips, host.
2. Fix only the highest-visibility gaps (the audit decides). Likely candidates are the search-bar dropdown behaviour, photo tour/gallery, "Guest favourite" styling, and header/nav spacing.
3. Cap: roughly half a day. No new features.

## Phase 5: Hygiene (if time allows)

- Refuse to boot with the default `SESSION_SECRET` when `COOKIE_SECURE=true`.
- Replace the generic error with a "waking the server" state while the API cold-starts.
- A few component tests (ReserveCard price breakdown, SearchBar).
- Split the largest client components (listing form, reserve card).

## Shipping

- One PR from `claude/airbnb-map-persistence-v4negn` to the default branch after Phases 1–2 are verified. The keep-alive cron only runs from the default branch.
- Phases 3–5 go in follow-up commits or PRs.
- A final check on the live site with the README walkthrough, as both the guest and host accounts.

## Open questions

1. **Submission deadline?** It sets how far past Phase 3 we go.
2. **E2E in CI, or local-only?** Default: CI.
3. **Phase 4 audit:** can you share current Airbnb screenshots? airbnb.com may be unreachable from this container.
