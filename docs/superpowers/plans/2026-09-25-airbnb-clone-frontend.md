# Airbnb Clone — Frontend Plan (Phases 2–5)

> Written after Phase 0–1 shipped, against the real, tested API (25 routes, `/docs`). Executed inline
> (superpowers:executing-plans) with the backend running on `localhost:8000` and the frontend on `localhost:3000`;
> every task ends with a live check in the built-in browser. The user commits; tasks end with a suggested message.

**Spec:** `docs/superpowers/specs/2026-09-25-airbnb-clone-design.md` §7 (routes, shared UI, look, data access).

## Global constraints

- Next.js 16 App Router + TypeScript (strict) + Tailwind CSS 4. `params`/`searchParams`/`cookies()` are async.
- Browser code calls relative `/api/...`; `next.config.ts` rewrites `/api/:path*` → `${BACKEND_URL}/api/:path*`,
  so the session cookie is first-party. Server components call `BACKEND_URL` directly and forward the `session` cookie.
- Types in `src/lib/api/types.ts` mirror the Pydantic schemas by hand. Every request helper throws `ApiError {status, code, message}`.
- Money is integer rupees, formatted with `en-IN` grouping (`₹14,500`). Dates on the wire are `YYYY-MM-DD`
  strings; never pass them through `new Date(string)` (UTC shift) — parse with `date-fns/parseISO`.
- Look: brand `#FF385C`, text `#222222`, secondary `#6A6A6A`, border `#DDDDDD`; Nunito Sans via `next/font`.
- Gates per task: `tsc --noEmit`, `eslint`, and (from Task F3) `vitest run`; `next build` at phase ends.

## File map

```
frontend/
  next.config.ts            rewrites + remote image hosts
  vitest.config.ts
  src/app/                  routes (spec §7), loading/error/not-found
  src/components/           header/, search/, listing/, booking/, host/, ui/
  src/lib/api/              types.ts, errors.ts, client.ts, server.ts
  src/lib/                  format.ts, dates.ts (+ dates.test.ts), search.ts
```

## Phase 2 — Foundation

| # | Task | Done when |
|---|---|---|
| F1 | Scaffold Next.js in `frontend/`; Tailwind tokens, Nunito Sans, rewrites, `images.remotePatterns` (images.unsplash.com, randomuser.me); `.claude/launch.json` gets a `frontend` config | `localhost:3000` renders; `/api/health` via the proxy returns ok |
| F2 | API layer: `types.ts`, `ApiError`, `client.ts` (`api.get/post/put/del`), `server.ts` (`serverApi` forwarding the cookie, `getViewer()`), `format.ts` | `tsc` clean; server fetch of `/categories` works |
| F3 | Header (logo, All/Homes/Experiences/Services tabs, "Switch to hosting", globe, user menu), login modal with "Continue as demo guest / host", `AuthProvider` context, sonner toasts, footer, mobile bottom nav | Demo login → avatar in menu → logout; cookie set via proxy |
| F4 | Home: category bar (scrollable, active underline, Filters button), listing grid of `ListingCard` (image carousel, heart, Guest favourite badge, rating, price), "Show more" (client pagination) | Home shows seeded listings; category click filters; heart toggles when logged in, opens login when not |

## Phase 3 — Search & detail

| # | Task | Done when |
|---|---|---|
| S1 | `dates.ts` helpers + Vitest: booked-night set, `isCheckInDisabled`, `isCheckOutDisabled` (checkout allowed on the next booking's check-in day), nights, range → query | Tests green |
| S2 | Search bar: Where (destination suggestions), When (two-month range picker, react-day-picker), Who (adults/children/infants steppers); expanded on home, compact pill elsewhere; submits to `/s/[location]/homes?…` | Search from home lands on results with params |
| S3 | Search page: "N homes in X", amenity chips, Filters modal (price range, room type, rooms & beds, property types, amenities), numbered pagination, empty state; cards show "₹Y for N nights" with dates | Dates exclude booked listings; filters round-trip through the URL |
| S4 | Detail page: photo mosaic + full gallery modal, title row (share/save), overview, host row (Superhost), description, amenities + "Show all" modal, two-month calendar with booked days disabled, sticky Reserve card with live `/quote` and breakdown, rating breakdown + reviews + modal, OSM embed, host section | Quote matches backend; unavailable ranges can't be picked |

## Phase 4 — Guest flows

| # | Task | Done when |
|---|---|---|
| G1 | `/book/[id]`: trip summary (editable dates/guests via modals), mocked payment panel, price details, Confirm → POST `/bookings` → `/trips/[id]?new=1` | Booking created; 409 shows a toast and sends the user back |
| G2 | `/trips` (Upcoming / Past / Cancelled tabs, cancel with confirm, "Write a review" modal with star rows) and `/trips/[id]` confirmation | Cancel frees dates; review updates listing rating |
| G3 | `/wishlists` grid + heart removal; empty states | Save/unsave reflected everywhere |

## Phase 5 — Host

| # | Task | Done when |
|---|---|---|
| H1 | `/hosting`: reservations tabs (Upcoming / Past / Cancelled), guest, dates, payout; cancel | Rahul sees his upcoming reservations |
| H2 | `/hosting/listings`: table/cards with upcoming count, edit, delete (confirm; 409 message shown) | Delete refused with upcoming bookings |
| H3 | Listing form: create wizard `/hosting/listings/new` (type → location → basics → amenities → photos by URL → title/description → price → review) and stacked edit page `/hosting/listings/[id]/edit`; client validation mirrors `ListingWrite` | Create/edit round-trips; server 422s shown inline |

Phase 6 (ship: responsive pass, Coming-soon pages, deploy, README) gets its own short plan after Phase 5.
