# Post-review hardening: implementation plan (final)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce submission risk without adding features:
- Make SQLite durable on Render's free plan.
- Draw India's boundary correctly on every map.
- Prove the core flows with browser tests in CI.
- Close the most visible Airbnb look-and-feel gaps.

**Architecture:**
- **Persistence.** SQLite stays the database, as the brief requires. Litestream v0.3.13 restores the file from a private Backblaze B2 bucket on boot, then streams every WAL write back.
- **Maps.** Both maps get their base layer from `frontend/src/lib/map.ts`. That layer is the `india-boundary-corrector` Leaflet layer, reading a self-hosted PMTiles file.
- **Tests.** Playwright drives `next start` against a fresh FastAPI + SQLite pair.

**Tech stack:** FastAPI, SQLAlchemy 2, SQLite (WAL), Litestream 0.3.13, Backblaze B2 (S3 API), Next.js 16, Leaflet 1.9, `@india-boundary-corrector/leaflet-layer@0.2.2`, Playwright, GitHub Actions.

**Spec:** `Assignment Airbnb Clone.docx`. Relevant lines: "All bookings must persist and block those dates on the listing", "All listing data must persist", and "Database: SQLite". This also incorporates the two external reviews pasted on 2026-09-26.

## Global constraints

- Free tier only (Render Free, Vercel Hobby, Backblaze B2 free 10 GB).
- SQLite stays. No PostgreSQL or Turso.
- No new features: no dark mode, uploads, messaging or Experiences.
- Secrets live only in Render env vars. They never go in the repo or in logs.
- The user commits and pushes; Claude never runs `git commit`. Each phase ends with a list of the files it changed, so the user can commit it on its own.
- Every phase ends with the running site verified, not just tests passing.

## Decisions taken on the two reviews

| Point | Decision |
|---|---|
| Restore fails → never seed a fresh DB | **Keep.** A fresh DB would replicate as a newer generation and hide the real one. `start.sh` exits non-zero and Render keeps the old instance. |
| Litestream smoke test before deploying | **Add, and put it in CI** (Task 1.3). It uses a local S3 server (moto), so it exercises *our* `start.sh` + `litestream.yml` end to end with no B2 account. |
| Use the pasted **Master** Application Key | **Counter: it cannot work.** Backblaze does not support the master key on the S3-compatible API. The user must create a bucket-restricted key: Read and Write, "Allow List All Bucket Names" enabled. It is also advisable to regenerate the master key, since it was pasted into chat. |
| Bucket details | The **bucket name** is still needed; only the bucket ID was shared. Endpoint `https://s3.us-east-005.backblazeb2.com`, region `us-east-005`. |
| B2 lifecycle "Keep all versions" | **Change it to "Keep only the last version".** Litestream's files are immutable, and Litestream deletes old segments itself; kept versions would only pile up (Litestream's own B2 guide recommends this). |
| B2 addressing | `force-path-style: true`. Litestream 0.3.x needs it for B2; only 0.5+ auto-detects it. |
| "Verify restore after idle/sleep" | **Adjust.** The keep-alive ping stops the service sleeping, so waiting out 15 idle minutes proves little. **Restart service** on Render gives the same cold boot on a fresh disk, on demand. One natural sleep check stays optional. |
| Rollback | **Add.** The fastest rollback needs no code: remove `LITESTREAM_BUCKET` and `start.sh` starts plain uvicorn (today's behaviour). Also record the current build and start commands and the last good deploy (`7459e68`) for Render's **Rollback**. Nothing ever deletes objects in the bucket; restore only reads. |
| Staged shipping (persistence live-verified before the map) | **Keep.** Phase 1 is committed and deployed alone, then Phase 2. Phases 3–4 follow. The user commits each stage. |
| "Government of India" wording | **Counter, neutrally.** The brief doesn't mention it. The README says what the code does ("India's boundary drawn per the official Survey of India depiction, via india-boundary-corrector") and nothing more. |
| Self-host PMTiles | **Keep.** It's copied from `node_modules` at `predev`/`prebuild`, gitignored, and always matches the package version. |
| Pin the Litestream download | **Keep, honestly.** v0.3.13 publishes no checksums, so we pin the SHA-256 we measured (`eb75a3de…818ba0`). The build fails if the file ever changes. |
| Phase 4 cap | **Keep.** Audit, fix the top 3–5 visible gaps, stop. |

## Review focus (failure modes no happy-path test covers)

1. **SIGTERM right after a write** (Render spin-down or deploy): the last write must still reach the replica. *Pinned by Task 1.3's smoke test, which writes and then stops at once.*
2. **Bad B2 credentials or an unreachable bucket:** the boot must fail instead of seeding. *Pinned by the smoke test's "bad credentials" case.*
3. **An empty bucket on the first boot:** seed once, replicate, and never re-seed on later boots. *Pinned by the smoke test (boot 1 seeds; boot 2 restores and its user count is unchanged).*
4. **PMTiles served without Range support:** the corrections fail but the map must still render. *Pinned by `correctionerror` handling, and by checking for a 206 in Task 2.3.*
5. **Double booking through the UI:** the second overlapping reservation is refused and the dates show as blocked. *Pinned by E2E spec 2.*

---

## Phase 1: Durable SQLite (Litestream → B2)

### Task 1.1: Harden the Litestream install and config

**Files:**
- Modify: `backend/scripts/install-litestream.sh`
- Modify: `backend/litestream.yml`

- [ ] Verify the tarball checksum before extracting it:
  ```sh
  #!/usr/bin/env sh
  # Render build step: fetch the Litestream binary into backend/bin, refusing a download whose checksum changed.
  set -eu
  VERSION=v0.3.13
  SHA256=eb75a3de5cab03875cdae9f5f539e6aedadd66607003d9b1e7a9077948818ba0
  TARBALL="litestream-${VERSION}-linux-amd64.tar.gz"
  mkdir -p bin
  curl -fsSL -o "bin/${TARBALL}" "https://github.com/benbjohnson/litestream/releases/download/${VERSION}/${TARBALL}"
  echo "${SHA256}  bin/${TARBALL}" | sha256sum -c -
  tar -xzf "bin/${TARBALL}" -C bin litestream
  rm "bin/${TARBALL}"
  ```
- [ ] In `litestream.yml`, add `force-path-style: true` under the replica.
- [ ] Verify in WSL: `sh scripts/install-litestream.sh && bin/litestream version` prints `v0.3.13`. Then corrupt `SHA256` and confirm the script exits non-zero.

### Task 1.2: `start.sh` behaviour

**Files:** `backend/scripts/start.sh` (already on the branch).

- [ ] Keep the current behaviour:
  - Restore with `-if-db-not-exists -if-replica-exists`, under `set -eu`, so a restore error ends the boot.
  - Then `litestream replicate -exec`.
  - With no bucket, plain uvicorn (this is the rollback switch).
- [ ] Add a log line saying which mode the service started in. Never print secrets.

### Task 1.3: Litestream smoke test (local + CI)

**Files:**
- Create: `backend/scripts/litestream-smoke.sh` (Linux/WSL; needs `python3`, `curl`, `bin/litestream`, and `moto[server]` from `requirements-dev.txt`)
- Modify: `backend/requirements-dev.txt` (add `moto[server]`)

- [ ] The script:
  1. Start `moto_server` on port 9000 and create the bucket `smoke`.
  2. Export the `LITESTREAM_*` vars pointing at moto (the endpoint is `http://127.0.0.1:9000`).
  3. **Boot 1 (empty bucket):** run `start.sh` with `PORT=8765`. Wait for `/api/health`. The DB was seeded, so record the user count via `GET /api/listings` or sqlite.
  4. Log in as the demo guest and `POST /api/bookings` for a free range, taken from the listing's availability.
  5. Send SIGTERM **immediately** and wait for the exit.
  6. Delete the local `data/` directory, as Render's fresh disk does.
  7. **Boot 2:** run `start.sh` again, then check that `GET /api/bookings/…` or My Trips contains the booking, and that the listing's blocked dates include it.
  8. **Boot 3 (bad credentials):** delete `data/`, set a wrong secret, run `start.sh`, and expect a non-zero exit with no `data/app.db` serving.
  9. Print `SMOKE OK` and exit 0.
- [ ] Run it in WSL. Expected: `SMOKE OK`.

### Task 1.4: Docs and rollback

**Files:**
- Modify: `README.md` (Deployment and Assumptions sections)
- Modify: `render.yaml` (comments only)

- [ ] **B2 setup:**
  - A bucket-restricted key; the master key is not supported on the S3 API.
  - "Allow List All Bucket Names".
  - Lifecycle set to "keep only the last version".
- [ ] **Rollback:** unset `LITESTREAM_BUCKET`, or use Render's Rollback to the last good deploy. Never delete bucket objects.
- [ ] **Known limit:** zero-downtime deploy overlap (seconds), a loss window of about 1 s, a single writer.
- [ ] The README lists how to run the smoke test.

### Phase 1 live verification (after the user commits, pushes and sets the env vars)

- [ ] The Render deploy log shows `litestream: restoring` or `no matching backups`, then `replicating`, and `/api/health` returns ok.
- [ ] On anbindia.vercel.app:
  1. Log in as the demo guest and book a stay, noting its listing and dates.
  2. **Manual Deploy**, then check: the trip is in My Trips, its nights are struck through on the calendar, and search for those dates excludes the listing.
  3. **Restart service**, then check again.
  4. As the host, create a listing, redeploy, and confirm it still exists.
- [ ] Exit: the booking and the listing survive a redeploy and a restart.

## Phase 2: India boundary on every map

### Task 2.1: Install and wire up the corrector

**Files:**
- Modify: `frontend/package.json` (pinned deps; `predev` and `prebuild` scripts)
- Create: `frontend/scripts/copy-map-data.mjs`
- Modify: `frontend/src/lib/map.ts`
- Modify: `.gitignore` (add `frontend/public/maps/`)

- [ ] Install the packages, pinned:
  ```sh
  npm i -E @india-boundary-corrector/leaflet-layer@0.2.2 @india-boundary-corrector/data@0.2.2
  ```
- [ ] `copy-map-data.mjs` copies `node_modules/@india-boundary-corrector/data/india_boundary_corrections.pmtiles` to `public/maps/`.
- [ ] Rewrite `map.ts`:
  ```ts
  import { extendLeaflet } from "@india-boundary-corrector/leaflet-layer";
  const PMTILES_URL = "/maps/india_boundary_corrections.pmtiles";
  export function addBaseLayer(L: Leaflet, map: LeafletMap) {
    extendLeaflet(L); // no-op after the first call
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    const layer = L.tileLayer.indiaBoundaryCorrected(TILES, { attribution: ATTRIBUTION, maxZoom: 19, layerConfig: "osm-carto", pmtilesUrl: PMTILES_URL });
    layer.once("correctionerror", (e) => console.warn("India boundary corrections unavailable; showing uncorrected tiles.", e.error));
    layer.addTo(map);
  }
  ```

### Task 2.2: Verify locally

- [ ] `npm run lint && npm run typecheck && npm test && npm run build` passes.
- [ ] In the browser pane on `/s/anywhere/homes`, zoom 4–6 over J&K, Ladakh, Aksai Chin and Arunachal. India's outline includes them. The PMTiles request returns 206. There are no console errors.
- [ ] A listing page's map renders, and the corrected lines show when zoomed out.

### Task 2.3: Verify on the Vercel preview or production after the user pushes

- [ ] The same checks, plus the PMTiles request returns 206 from Vercel.

## Phase 3: Browser tests + CI

**Files:**
- Create: `frontend/playwright.config.ts`
- Create: `frontend/e2e/*.spec.ts`
- Create: `frontend/e2e/helpers.ts`
- Create: `.github/workflows/ci.yml`
- Modify: `frontend/package.json` (`e2e` script, `@playwright/test` dev dependency)
- Modify: `frontend/vitest.config.ts` (exclude `e2e/`)

- [ ] **Config.** Playwright's `webServer` starts two things:
  1. uvicorn on :8000, with `DATABASE_URL` pointing at a fresh temp file (deleted first) and `SEED_ON_STARTUP=true`.
  2. `next start` on :3000, with `BACKEND_URL=http://localhost:8000`. Build first.

  Run with `workers: 1`. Each spec uses its own listing and date window, so the specs don't collide.
- [ ] **Specs:**
  1. `booking.spec.ts`: search → listing → pick dates → Reserve → Confirm and pay → confirmation → the trip appears in My Trips.
  2. `conflict.spec.ts`: after booking, those nights are disabled in the listing calendar. Search for those dates excludes the listing. A direct `POST /api/bookings` for an overlapping range returns 409.
  3. `wishlist.spec.ts`: heart a listing, reload, and it is still saved and listed on `/wishlists`.
  4. `host.spec.ts`: as the host, create a listing, then edit its title and price, then delete it.
  5. `review.spec.ts`: the demo guest reviews a completed stay, and the listing's review count and rating update.
- [ ] **CI jobs:**
  1. backend: pytest.
  2. litestream-smoke: Ubuntu, `install-litestream.sh` then `litestream-smoke.sh`.
  3. frontend: lint, typecheck, vitest, build.
  4. e2e: Playwright chromium, with the report uploaded on failure.
- [ ] Verify: all specs pass locally three times in a row, so there's no flake.

## Phase 4: Targeted Airbnb fidelity (timeboxed to about half a day)

- [ ] Audit airbnb.com and our site at 1280 px and 390 px: home, search + map, listing, checkout, trips.
- [ ] Pick the top 3–5 most visible gaps and fix only those. No new features.
- [ ] Re-screenshot and confirm there are no regressions (E2E stays green).

## Phase 5: Hygiene (optional; must not delay submission)

- [ ] Refuse to boot with the default `SESSION_SECRET` when `COOKIE_SECURE=true`.
- [ ] A "waking the server" message instead of the generic error.
- [ ] Component tests; component splits.

## Shipping order (the user commits and pushes)

1. **Stage A (Phase 1):**
   1. Push the backend, `render.yaml`, keep-alive workflow and README.
   2. Set up B2 (restricted key, lifecycle) and set the Render env vars and commands.
   3. Merge to `main`, then run the live verification.
2. **Stage B (Phase 2):** push the frontend map, check the Vercel preview, merge, then verify live.
3. **Stage C (Phases 3–4):** CI must be green, then merge and do a final live walkthrough as both guest and host.
