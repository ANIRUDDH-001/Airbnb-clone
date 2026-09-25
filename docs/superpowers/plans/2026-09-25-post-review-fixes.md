# Post-review fixes

Source: external review (ChatGPT + Antigravity audit) of the deployed submission, checked against the repo.
Goal: reduce risk. The remaining score is in persistence, deployed reliability, doc accuracy and a few browser tests, not in new features.

## Where the review is right, and where it isn't

| Review claim | Verdict |
|---|---|
| Ephemeral SQLite on Render Free breaks "bookings must persist" | **Agree. Top issue.** Bookings made on the live site disappear on restart or redeploy. |
| README "no code changes" for a hosted DB is wrong | **Agree.** The overlap guard is a SQLite `CREATE TRIGGER … RAISE(ABORT)`. Fixed in the README. |
| README still has `<your-vercel-url>` placeholders | **Agree.** Fixed. |
| No E2E tests | **Agree.** A few Playwright specs are cheap, and Chromium is already available. |
| Cold starts hurt the evaluator | **Agree.** Render Free sleeps after 15 min idle. |
| `session_secret` default is a vulnerability | **Partly.** Render sets it through `generateValue`, so it's only hygiene: fail fast in prod if it's unset. |
| No Alembic | **Low priority on its own.** Worth adding only as part of the Postgres move. |
| "Pixel-perfect" fidelity is overstated | **Agree, low ROI.** Don't chase pixels. The map is the exception: see P0. |
| Antigravity's 9.0 vs 9.2 arithmetic | Irrelevant to the code. |
| Dark mode, uploads, messaging, experiences | **Skip.** These are bonus or placeholder features the assignment explicitly allows. |

The review missed one issue: **the map shows India's border wrongly.** OSM tiles draw the de facto Line of Control and Aksai Chin line as the border, so parts of J&K and Ladakh look cut off. The "Anywhere" search frames all of India, so every evaluator sees it. That makes it P0.

## P0: India's official boundary on every map

- [x] Route all maps through one base-layer helper (`frontend/src/lib/map.ts`).
- [x] Replace the listing page's OSM `<iframe>` with a Leaflet `ListingMap`. An iframe can't be corrected at all.
- [ ] Correct the tiles: mask OSM's de facto lines and draw India's official boundary. **Blocked on a dependency decision** (below).
- [ ] Verify visually at zoom 4–7 over J&K, Ladakh, Aksai Chin and Arunachal Pradesh, on both the search map and the listing map.
- [ ] Update the README "Search map" bullet.

Options for the correction:
1. `@india-boundary-corrector/leaflet-layer` (Unlicense, published from GitHub Actions). It re-renders each OSM tile on a canvas and uses a 1.6 MB PMTiles file of the lines to erase and redraw. Self-host the PMTiles file under `public/`. This is the least code and the proven approach.
2. In-house: the same canvas technique, using a public India-boundary GeoJSON (Survey of India–derived) plus OSM's de facto lines as the erase mask. There is no third-party code, but it is more work and more tuning.
3. A commercial basemap with an India worldview (Mappls, or Esri/Google with the region set to India). This needs an API key and billing, and the ToS applies.

## P1: Durable persistence (PostgreSQL)

1. Provision Neon Postgres (free tier, storage doesn't expire). **The user creates this** and puts `DATABASE_URL` in Render's env vars.
2. Backend:
   - Add `psycopg[binary]`.
   - `make_engine`: apply the SQLite-only `connect_args` and PRAGMA only to SQLite, and use `pool_pre_ping=True` for Postgres.
   - Overlap guard per dialect. SQLite keeps the trigger. Postgres uses `CREATE EXTENSION btree_gist` plus
     `EXCLUDE USING gist (listing_id WITH =, daterange(check_in, check_out) WITH &&) WHERE (status = 'confirmed')`.
     Use `DDL(...).execute_if(dialect=...)`.
   - `services/bookings.py`: map Postgres `23P01` (exclusion_violation) to the same 409 as `booking_overlap`.
   - Seed only when the DB is empty (already the behaviour). Keep `SEED_ON_STARTUP` so a fresh DB self-populates.
3. Alembic baseline migration generated from the models. Startup runs `alembic upgrade head` instead of `create_all`.
4. Tests: keep SQLite as the default. Add a Postgres CI job (service container) that runs the booking and overlap tests, including the concurrent-insert race.
5. Docs: update the README database row, the trade-offs section and `render.yaml` comments.

## P1: Cold-start mitigation

- A GitHub Actions cron (every 10 min) pings `/api/health`. One always-on service fits Render Free's 750 h a month.
- Frontend: on first load, fire a background `fetch('/api/health')`. Server-rendered pages show a friendly "waking the server" state instead of a bare error after the timeout.

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
