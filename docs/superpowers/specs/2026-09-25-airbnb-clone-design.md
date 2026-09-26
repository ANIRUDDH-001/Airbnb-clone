# Airbnb Clone — Design Spec

**Date:** 2026-09-25 · **Status:** awaiting review · **Brief:** `Assignment Airbnb Clone.docx`

## 1. Goal and success criteria

A hiring-assignment submission (Scalar AI Lab, round 2): a functional Airbnb clone that is judged on
functionality, UI/UX fidelity, database design, API design, code quality, modularity, and the author's
ability to explain every line in an interview.

The submission succeeds when it:

1. looks convincingly like today's airbnb.co.in;
2. demonstrates every core workflow from the brief end-to-end (search → detail → book → trips; host CRUD);
3. works reliably when an evaluator opens the hosted link;
4. is easy for the author to explain;
5. costs ₹0 to host.

Non-goals: production-grade auth, payments, persistence, messaging, identity verification, image upload.

## 2. Decisions (agreed in brainstorming)

| Area | Decision |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, deployed to Vercel Free |
| Backend | FastAPI + SQLAlchemy 2 (sync) + Pydantic 2, deployed to Render Free |
| Database | SQLite file on the backend; tables created from the models at startup; seeded when empty |
| Integration | Same-origin proxy: the browser calls `/api/*` on the Vercel domain, and Next.js rewrites those calls to FastAPI. Server components call FastAPI directly and forward the session cookie |
| Auth | Mocked: log in by email as a seeded demo account (no passwords). Signed httpOnly session cookie. Every user can be guest and host |
| Photos | Seeded external image URLs (Unsplash). Hosts add photos by URL. No uploads |
| Payments | Mocked "Confirm and pay" step |
| Map | Detail page: an OpenStreetMap embed (iframe, no library). Search page map with price pins is a **stretch goal** |
| UI target | Current airbnb.co.in (header tabs All/Homes/Experiences/Services, current cards and search page), **plus** the brief's category-icon row and a grid on the home page |
| Bonuses | Reviews after a completed stay; Superhost badge (seeded flag); "Guest favourite" badge (derived); responsive layout |
| Out | Dark mode, cloud storage, Litestream, real auth, pets in the guest picker |
| Persistence | Free-tier limitation accepted: data lives until the Render instance restarts/redeploys, then the seed runs again. The README states this plainly |

**Change from the conversational design:** Alembic is dropped. The database is rebuilt from the models on every fresh boot (the free tier's disk is ephemeral), so migrations would be a tool with no job. The README names Alembic as the upgrade path if data ever has to survive schema changes.

## 3. Architecture

```
Browser ──► Next.js on Vercel ──(server components: fetch BACKEND_URL/api/..., forward cookie)──┐
   │                                                                                           ▼
   └──► /api/* on the Vercel domain ──(next.config rewrites)──────────────► FastAPI on Render Free
                                                                               routers → services → models
                                                                                         ▼
                                                                               SQLite (seeded if empty)
```

### Backend layers

| Layer | Responsibility | Knows about |
|---|---|---|
| `app/routers/` | HTTP only: parse input, resolve the current user, call one service function, return a schema | services, schemas, core |
| `app/services/` | Every business rule: search, stay validation, availability, pricing, booking, cancellation, reviews, wishlist, host CRUD | models, schemas, core |
| `app/models/` | SQLAlchemy tables, constraints, the overlap trigger | core.db |
| `app/schemas/` | Pydantic request/response shapes | models (for enum literals only) |
| `app/core/` | Settings, engine/session, error envelope, session-cookie auth dependencies, the IST clock | — |
| `app/seed/` | Deterministic demo data | models, services |

`create_app(settings)` builds the app (used by `uvicorn --factory` and by tests), so every test gets its own
temporary SQLite file.

"Today" is the calendar date in IST (UTC+05:30, fixed offset — India has no DST). It is a FastAPI dependency
(`get_today`) so tests pin it.

## 4. Database schema

All money is **integer rupees (INR)**, never floats. Dates are `DATE` (stored by SQLite as `YYYY-MM-DD` text,
which compares correctly as strings). `PRAGMA foreign_keys=ON` is set on every connection.

```
users 1───* listings 1───* listing_photos
  │            │  *───* amenities      (listing_amenities)
  │            │  *───* categories     (listing_categories)
  │            1
  │            *
  1───────* bookings 1───0..1 reviews
  │
  *───* listings (wishlist_items)
```

### users
| column | type | rules |
|---|---|---|
| id | INTEGER PK | |
| name | VARCHAR(80) | NOT NULL |
| email | VARCHAR(255) | NOT NULL, UNIQUE, stored lower-case |
| avatar_url | VARCHAR(500) | nullable (frontend shows an initial) |
| bio | TEXT | nullable |
| is_superhost | BOOLEAN | NOT NULL, default false (seeded flag) |
| created_at | DATETIME | NOT NULL, default now ("hosting since") |

### listings
| column | type | rules |
|---|---|---|
| id | INTEGER PK | |
| host_id | FK → users.id | NOT NULL, ON DELETE RESTRICT, indexed |
| title | VARCHAR(100) | NOT NULL |
| description | TEXT | NOT NULL |
| property_type | VARCHAR(20) | CHECK IN (house, flat, guest_house, hotel, villa, cabin, cottage, tiny_home, farm_stay, houseboat) |
| room_type | VARCHAR(20) | CHECK IN (entire_home, private_room, shared_room) |
| max_guests | INTEGER | CHECK 1–16 |
| bedrooms / beds / bathrooms | INTEGER | CHECK bedrooms ≥ 0, beds ≥ 1, bathrooms ≥ 0 |
| nightly_price | INTEGER | CHECK > 0, indexed |
| cleaning_fee | INTEGER | NOT NULL default 0, CHECK ≥ 0 |
| address | VARCHAR(200) | NOT NULL |
| city | VARCHAR(80) | NOT NULL, indexed |
| state | VARCHAR(80) | nullable |
| country | VARCHAR(80) | NOT NULL |
| latitude / longitude | FLOAT | NOT NULL, CHECK valid ranges |
| rating_avg | FLOAT | nullable, CHECK 1–5 — **denormalised cache**, recomputed whenever a review is written |
| review_count | INTEGER | NOT NULL default 0, CHECK ≥ 0 — same cache |
| created_at / updated_at | DATETIME | NOT NULL |
| deleted_at | DATETIME | nullable — **soft delete** so past trips keep their listing |

### listing_photos
`id` PK · `listing_id` FK → listings ON DELETE CASCADE · `url` VARCHAR(500) NOT NULL · `position` INTEGER NOT NULL ·
UNIQUE(`listing_id`, `position`). Position 0 is the cover photo.

### amenities / categories (lookup tables)
- `amenities`: `id` PK · `code` UNIQUE (e.g. `wifi`) · `name` · `icon` (icon key) · `group_name` (Essentials / Features / Location / Safety).
- `categories`: `id` PK · `slug` UNIQUE (e.g. `beachfront`) · `name` · `icon` · `position` (order in the category bar).
- Join tables `listing_amenities` and `listing_categories`: composite PK (`listing_id`, `*_id`); listing side CASCADE, lookup side RESTRICT.

### bookings
| column | type | rules |
|---|---|---|
| id | INTEGER PK | |
| listing_id | FK → listings | NOT NULL, RESTRICT |
| guest_id | FK → users | NOT NULL, RESTRICT, indexed |
| check_in / check_out | DATE | CHECK check_out > check_in |
| adults / children / infants | INTEGER | CHECK adults ≥ 1, others ≥ 0 |
| status | VARCHAR(12) | CHECK IN (confirmed, cancelled), default confirmed |
| nightly_price, nights, cleaning_fee, service_fee, taxes, total | INTEGER | **price snapshot**; CHECK total = nightly_price × nights + cleaning_fee + service_fee + taxes |
| created_at | DATETIME | NOT NULL |
| cancelled_at | DATETIME | nullable |

Index (`listing_id`, `check_in`, `check_out`) for availability lookups.

**Overlap invariant (enforced twice):**
- *Service check* — returns a friendly `409 dates_unavailable` before inserting.
- *Database trigger* `trg_bookings_no_overlap` — `BEFORE INSERT … WHEN NEW.status='confirmed'` raises
  `RAISE(ABORT, 'booking_overlap')` if a confirmed booking on the same listing satisfies
  `b.check_in < NEW.check_out AND NEW.check_in < b.check_out`. This makes the invariant hold even when two requests
  race past the service check. The service maps the resulting `IntegrityError` to the same 409.

Stays are **half-open** `[check_in, check_out)`: a guest may check in on the day another checks out.
"Completed" is not stored: it is `status='confirmed' AND check_out <= today`.

### reviews
`id` PK · `booking_id` FK → bookings, **UNIQUE** (one review per stay; the reviewer and listing are reached through
the booking, which proves the reviewer stayed) · `rating` plus `cleanliness_rating`, `accuracy_rating`, `check_in_rating`,
`communication_rating`, `location_rating`, `value_rating` — all INTEGER CHECK 1–5 · `comment` TEXT NOT NULL · `created_at`.

### wishlist_items
Composite PK (`user_id`, `listing_id`), both CASCADE · `created_at`. One implicit wishlist per user (the brief allows "simple").

## 5. Business rules

### Stay validation (`services/stay.py`)
- `check_in >= today`, `check_out > check_in`, at most **90 nights** → else `422 invalid_dates`.
- `adults + children <= listing.max_guests` (infants don't count, as on Airbnb) → else `422 too_many_guests`. Adults 1–16, children 0–15, infants 0–5.
- Available: no confirmed booking overlaps → else `409 dates_unavailable`.

### Pricing (`services/pricing.py`, a pure function)
```
nights       = (check_out - check_in).days
subtotal     = nightly_price × nights
fee_base     = subtotal + cleaning_fee
service_fee  = round_half_up(fee_base × 14%)
taxes        = round_half_up(fee_base × 12%)   # mocked flat rate, stated in README
total        = subtotal + cleaning_fee + service_fee + taxes
```
The server computes every price. The quote endpoint and the booking endpoint call the same function, and the booking stores the result as a snapshot, so a later price edit never changes an existing trip.

### Booking lifecycle
- Create: logged-in; listing active; guest ≠ host (`403 own_listing`); stay valid; price snapshotted.
- Cancel: the guest **or** the listing's host; only while `status='confirmed' AND check_in > today` → else `409 cannot_cancel`. Cancelling frees the dates immediately.
- Phase (derived, returned on every booking): `upcoming` (confirmed, check_out > today) · `past` (confirmed, check_out ≤ today) · `cancelled`.

### Reviews
Only the booking's guest; booking confirmed and `check_out <= today`; not already reviewed. Writing a review
recomputes the listing's `rating_avg` (rounded to 2 dp) and `review_count` in the same transaction.
"Guest favourite" = `rating_avg >= 4.8 AND review_count >= 3` (derived, not stored).

### Host listing rules
- Any logged-in user can create listings. Edit and delete require ownership → `403 not_owner`.
- Delete is **soft** and refused while confirmed bookings with `check_out > today` exist (`409 has_upcoming_bookings`); the host can cancel those first. Deleting also removes the listing from all wishlists. Deleted listings disappear from search/detail/wishlists but remain in trips and reservations.
- Edits replace the whole photo list, amenity set and category set. Unknown amenity codes or category slugs → `422`.

## 6. API contract

Base path `/api`, JSON only. Every error uses one envelope:
```json
{ "error": { "code": "dates_unavailable", "message": "Those dates are not available" } }
```
Validation errors use `code: "validation_error"`, a readable `message`, and `details: [{field, message}]`.
Lists that can grow are paginated: `{ items, page, page_size, total, has_more }` (offset pagination; page size ≤ 60).

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /health` | — | Liveness for Render |
| `POST /auth/login` `{email}` | — | Mock login as a seeded account; sets the session cookie → `UserOut` |
| `POST /auth/logout` | — | Clears the session → 204 |
| `GET /auth/me` | user | Current user (`is_host` = owns an active listing) |
| `GET /categories` | — | Category bar, ordered |
| `GET /amenities` | — | Filter modal and host form |
| `GET /destinations` | — | "Where" suggestions and the host form's location helper |
| `GET /listings` | optional | Search. Query: `location, check_in, check_out, guests, category, min_price, max_price, room_type, property_types[], amenities[], min_bedrooms, min_beds, min_bathrooms, sort (recommended\|price_asc\|price_desc\|rating), page, page_size` → `Page[ListingCard]`. With dates: excludes unavailable listings and fills `stay_price {nights,total}` |
| `GET /listings/{id}` | optional | `ListingDetail` (photos, amenities, categories, host summary, rating breakdown, `is_wishlisted`) |
| `GET /listings/{id}/availability?start&end` | — | Confirmed booked ranges in a window (default today → +365 days) for the calendar |
| `GET /listings/{id}/quote?check_in&check_out&adults&children&infants` | — | `PriceQuote`, or 409/422 with the reason |
| `GET /listings/{id}/reviews?page&page_size` | — | `Page[ReviewOut]`, newest first |
| `POST /bookings` | user | Create → 201 `BookingOut` |
| `GET /bookings/mine?phase` | user | My Trips → `BookingOut[]` |
| `GET /bookings/{id}` | guest or host | Confirmation / detail (others get 404) |
| `POST /bookings/{id}/cancel` | guest or host | → `BookingOut` |
| `POST /bookings/{id}/review` | guest | → 201 `ReviewOut` |
| `GET /wishlist` | user | `ListingCard[]` |
| `PUT /wishlist/{listing_id}` | user | Save (idempotent) → 204 |
| `DELETE /wishlist/{listing_id}` | user | Unsave (idempotent) → 204 |
| `GET /host/listings` | user | Own active listings + `upcoming_reservations` count |
| `POST /host/listings` | user | Create → 201 `ListingDetail` |
| `PUT /host/listings/{id}` | owner | Full replace → `ListingDetail` |
| `DELETE /host/listings/{id}` | owner | Soft delete → 204 |
| `GET /host/reservations?phase` | user | Bookings on the user's listings → `BookingOut[]` (includes guest) |

FastAPI's generated `/docs` page is the live API reference; the README carries the summary table above.

## 7. Frontend

### Routes (App Router)
| Route | Page |
|---|---|
| `/` | Home: header with the All/Homes/Experiences/Services tabs, the large search bar, **category-icon row + Filters button**, listing grid, "Show more" |
| `/s/[location]/homes?…` | Search results: compact search bar, amenity chips + Filters modal, "N homes in X", grid, numbered pagination; map panel (stretch) |
| `/rooms/[id]` | Detail: photo mosaic + full gallery, overview, host row, description, amenities (+ "Show all" modal), two-month calendar, sticky Reserve card with price breakdown, reviews (+ modal), location embed, host section |
| `/book/[id]?…` | "Confirm and pay": trip summary, mocked payment panel, price details, Confirm button |
| `/trips` · `/trips/[id]` | My Trips (Upcoming / Past / Cancelled; cancel; write review) · reservation confirmation |
| `/wishlists` | Saved listings |
| `/hosting` · `/hosting/listings` | Host dashboard (reservations) · listings manager (edit/delete) |
| `/hosting/listings/new` · `/hosting/listings/[id]/edit` | Airbnb-style step wizard for create; the same step sections, stacked, for edit |
| `/experiences` `/services` `/messages` `/account` | "Coming soon" |

### Shared UI
Header (logo, tabs, "Switch to hosting", globe, user menu), login modal (email + one-click "Continue as demo
guest / demo host"), search bar with Where/When/Who panels, category bar, listing card with an image carousel and a heart,
two-month date-range picker, guest stepper, modal primitive, toasts (sonner), footer, mobile bottom nav.

### Look
Brand `#FF385C`, text `#222222`, secondary `#6A6A6A`, borders `#DDDDDD`; card radius 12–16px; photo-forward
cards. Airbnb Cereal is proprietary: use **Nunito Sans** via `next/font`, with a system fallback. Prices are shown as on
the live site: `₹X night` without dates; `₹Y for N nights` (all fees included) with dates.

### Data access
`src/lib/api/`: typed request helpers shared by server and client code. The server variant reads `BACKEND_URL` and
forwards the `session` cookie; the client variant calls relative `/api/...`. TypeScript types are written by hand to mirror the
Pydantic schemas.

## 8. Seed data (deterministic, `random.Random(42)`, dates relative to "today")
- 12 Indian destinations (Goa, Manali, Jaipur, Udaipur, Mumbai, Bengaluru, Alleppey, Munnar, Rishikesh, Coorg, Puducherry, Shimla); **48 listings** (4 per destination), each with 5 photos, 5–12 amenities, 1–3 categories.
- 6 hosts (2 Superhosts) and 8 guests. **Demo accounts:** guest `ananya@example.com` (Ananya Sharma), host `rahul@example.com` (Rahul Mehta, Superhost, 8 listings).
- About 150 past stays across the listings, most with reviews; 1–3 upcoming bookings per listing.
- Demo guest has: 2 upcoming trips, 1 past trip already reviewed, **1 past trip waiting for a review**, 1 cancelled trip.
- Demo host has upcoming reservations on several listings.
- Photos: curated `images.unsplash.com` URLs (Unsplash License), grouped by theme.

## 9. Error handling
- Backend: services raise `AppError(status, code, message)`; one handler turns it into the envelope. Validation errors are reshaped into the same envelope. `IntegrityError` from the overlap trigger → 409. Anything else → FastAPI's 500.
- Frontend: request helpers throw a typed `ApiError {status, code, message}`. Mutations show the message in a toast; pages have `loading.tsx`, `error.tsx` and `not-found.tsx`; empty states for no results, no trips, empty wishlist and no listings.
- Render cold start: the first request can take 30–60 s. Pages show skeletons, and the README tells evaluators to expect it.

## 10. Testing
- **Backend (pytest):** unit tests for pricing and stay validation; API tests through `TestClient` against a temp SQLite file with a pinned "today", covering every endpoint's happy path and every error code above, the trigger under a simulated race, and the seed's invariants.
- **Frontend:** `tsc --noEmit`, ESLint and `next build` must pass. Vitest covers the date-picker helpers (which checkout days are selectable next to booked ranges). The README includes a manual evaluator walkthrough.

## 11. Deployment
- **Render (Free web service):** root `backend/`, Python 3.11, build `pip install -r requirements.txt`, start `uvicorn app.main:create_app --factory --host 0.0.0.0 --port $PORT`, health check `/api/health`, env `SESSION_SECRET`, `COOKIE_SECURE=true`.
- **Vercel (Hobby):** root `frontend/`, env `BACKEND_URL=https://airbnb-clone-api-529x.onrender.com`.
- The GitHub repo must be public, with `frontend/` and `backend/` at the root.

## 12. Delivery phases
| Phase | Delivers | Exit criteria |
|---|---|---|
| 0–1 Backend | Repo, schema, every service and endpoint, seed | `pytest` green; `/docs` lists all endpoints; seeded DB boots |
| 2 Frontend foundation | Next.js app, design tokens, layout, login, API layer, home grid + categories | Home renders seeded listings; demo login works through the proxy |
| 3 Search & detail | Search bar panels, search page + filters + pagination, detail page | Search by place/dates/guests excludes booked listings; detail shows calendar + live quote |
| 4 Guest flows | Confirm-and-pay, confirmation, My Trips (cancel, review), wishlist | A booking made in the UI blocks those dates; review updates the rating |
| 5 Host | Dashboard, reservations, create wizard, edit, delete | Full listing CRUD from the UI; delete refused with upcoming bookings |
| 6 Ship | Responsive pass, empty/error states, Coming-soon pages, deploy, README | Hosted links work end-to-end; README complete |
| Stretch | Search-page map with price pins (Leaflet + OSM tiles) | Only after phase 6 |
