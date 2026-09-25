# Post-review fixes

Source: external review (ChatGPT + Antigravity audit) of the deployed submission, checked against the repo.
Constraints from the brief: **Database: SQLite**, **free tier only**, "all bookings must persist", "all listing data must persist".
Goal: reduce risk. The remaining score is in persistence, deployed reliability, doc accuracy and a few browser tests, not in new features.

## Where the review is right, and where it isn't

| Review claim | Verdict |
|---|---|
| Ephemeral SQLite on Render Free breaks "bookings must persist" | **Agree. Top issue.** Bookings made on the live site disappear on restart or redeploy. |
| Move production to PostgreSQL | **Reject.** The brief mandates SQLite. The fault is Render's ephemeral disk, not SQLite. Keep SQLite and make the file durable (P1). |
| README "no code changes" for a hosted DB is wrong | **Agree.** The overlap guard is a SQLite `CREATE TRIGGER … RAISE(ABORT)`. The claim is gone from the README. |
| README still has `<your-vercel-url>` placeholders | **Agree.** Fixed. |
| No E2E tests | **Agree.** A few Playwright specs are cheap, and Chromium is already available. |
| Cold starts hurt the evaluator | **Agree.** Render Free sleeps after 15 min idle. |
| `session_secret` default is a vulnerability | **Partly.** Render sets it through `generateValue`, so it's only hygiene: fail fast in prod if it's unset. |
| No Alembic | **Low priority.** `create_all` is fine for one SQLite schema that's seeded on first boot. |
| "Pixel-perfect" fidelity is overstated | **Agree, low ROI.** Don't chase pixels. The map is the exception: see P0. |
| Antigravity's 9.0 vs 9.2 arithmetic | Irrelevant to the code. |
| Dark mode, uploads, messaging, experiences | **Skip.** These are bonus or placeholder features the assignment explicitly allows. |

The review missed one issue: **the map shows India's border wrongly.** OSM tiles draw the de facto Line of Control and Aksai Chin line as the border, so parts of J&K and Ladakh look cut off. The "Anywhere" search frames all of India, so every evaluator sees it. That makes it P0.

## P0: India's official boundary on every map

- [x] Route all maps through one base-layer helper (`frontend/src/lib/map.ts`).
- [x] Replace the listing page's OSM `<iframe>` with a Leaflet `ListingMap`. An iframe can't be corrected at all.
- [ ] Correct the tiles: mask OSM's de facto lines and draw India's official boundary. The user chose option 1. **Waiting on the `npm install` being allowed in this session, or run by the user.**
- [ ] Verify visually at zoom 4–7 over J&K, Ladakh, Aksai Chin and Arunachal Pradesh, on both the search map and the listing map.
- [ ] Update the README "Search map" bullet.

Options for the correction:
1. `@india-boundary-corrector/leaflet-layer` (Unlicense, published from GitHub Actions). It re-renders each OSM tile on a canvas and uses a 1.6 MB PMTiles file of the lines to erase and redraw. Self-host the PMTiles file under `public/`. This is the least code and the proven approach.
2. In-house: the same canvas technique, using a public India-boundary GeoJSON (Survey of India–derived) plus OSM's de facto lines as the erase mask. There is no third-party code, but it is more work and more tuning.
3. A commercial basemap with an India worldview (Mappls, or Esri/Google with the region set to India). This needs an API key and billing, and the ToS applies.

## P1: Durable persistence, still SQLite, still free

A persistent disk needs a paid Render plan, and the brief says SQLite, so the SQLite file is streamed to free object storage with Litestream:

- [x] `PRAGMA journal_mode=WAL` and `busy_timeout=5000` on every connection. Litestream replicates from the WAL.
- [x] `backend/litestream.yml`: an S3-compatible replica, with all values read from the environment.
- [x] `backend/scripts/install-litestream.sh`: the Render build step (Litestream v0.3.13 binary).
- [x] `backend/scripts/start.sh`: restore the database if the bucket has one, then `litestream replicate -exec uvicorn …`. With no bucket set, start plain uvicorn, so local dev and tests are unchanged.
- [x] `render.yaml`: new build and start commands, plus `LITESTREAM_*` env vars (`sync: false`).
- [x] README: deployment steps, architecture diagram and trade-offs.
- [ ] **User:** create a private Backblaze B2 bucket and a bucket-scoped key (free, 10 GB). Set the five `LITESTREAM_*` vars on Render, and set the build and start commands if the service wasn't created from the Blueprint.
- [ ] Verify on the live site: book a stay, redeploy on Render, and confirm the booking is still there and its dates are still blocked.

The seed runs only when the restored database is empty, so a restore never re-seeds over real data.

## P1: Cold-start mitigation

- [x] `.github/workflows/keep-api-awake.yml` pings `/api/health` every 10 min (free on public repos; runs once merged to the default branch).
- [ ] Optional: a friendlier "waking the server" state instead of the generic error page.

## P2: Browser tests (Playwright, 4–5 specs against local dev servers)

1. Search → listing → reserve → confirmation.
2. The booked nights show as blocked on the calendar, and search for those dates excludes the listing.
3. Wishlist heart persists across a reload.
4. The host creates a listing, then edits and deletes it.
5. A guest reviews a past stay, and the rating updates.

Run them in CI next to the existing backend (pytest) and frontend (vitest) jobs.

## P3: Hygiene (only after the above)

- Refuse to start with the default `SESSION_SECRET` when `COOKIE_SECURE=true`.
- Split the largest client components (listing form, reserve card).
- A few component tests (ReserveCard pricing, SearchBar).
