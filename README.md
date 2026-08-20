# Send It Along

**Give without going anywhere.**

On-demand donation pickup: photograph a pile of stuff, tap a button, and an Uber
courier collects it from your door and drops it at a nearby charity that actually
takes what you're giving. No account, no driving it there yourself, no guessing
which thrift store wants an old blender.

This is a **demo prototype**. It's built to prove out one real pipe end to end —
address → nearby charities → courier dispatch → live tracking — against actual
third-party APIs, not a polished product. See [Not built yet](#not-built-yet) and
[Known limitations](#known-limitations) below before assuming more than that.

## Demo

*(GIF of the full flow goes here.)*

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) + TypeScript | — |
| Styling | Tailwind CSS v4 | Pages are hand-built with Tailwind utility classes; shadcn/ui is scaffolded in but not really used yet. |
| Database / storage | Supabase (Postgres + Storage) | One place for relational state and the donation photo upload, with a service-role key that never leaves the server. |
| Logistics | Uber Direct API (sandbox) | Real courier dispatch, quotes, and status webhooks — not simulated. |
| Addresses | Geoapify autocomplete + reverse geocoding | Free tier needs only an email signup. |
| Charity lookup | Overpass API (OpenStreetMap) | Free, unauthenticated, and tags `shop=charity` / `shop=second_hand` directly — no keyword guessing over generic business listings. |
| Tracking map | Leaflet + OpenStreetMap raster tiles | No API key. |
| Opening hours | `opening_hours` npm package | Parses OSM's `opening_hours` mini-syntax instead of hand-rolling it. |

**Why Geoapify and Overpass instead of Google Places:** Google Places requires a
billing card on file to unlock its free tier, which is a hard blocker for a repo
meant to be cloned and run by anyone. Geoapify's autocomplete needs only an email
signup, and Overpass is free community infrastructure with no key at all. The
tradeoff is coverage and being a considerate guest on someone else's free
resource — Overpass calls are throttled to one request per second with a
descriptive `User-Agent`, and results are cached in Postgres so the same area
isn't re-queried on every visit.

## How it works

```
address → items → places → confirm → track → done
```

1. **Address** (`/`) — Geoapify autocomplete or the browser's geolocation API.
2. **Items** (`/items`) — pick categories and a size, take a photo. The photo
   uploads straight from the browser to Supabase Storage via a presigned URL —
   it never passes through the Next.js server. A draft donation row is created
   at this point.
3. **Places** (`/places`) — `/api/charities` asks Overpass for charity/thrift
   shops within 25km, filters to ones accepting at least one selected category
   and open now-or-in-30-minutes, sorts open-first-then-nearest, and dedupes by
   organisation so three Goodwills never show up together. Tapping a charity
   fires `/api/quote` in the background and moves on immediately.
4. **Confirm** (`/confirm`) — shows a skeleton where the price goes until that
   quote resolves. Tapping "Send it along" calls `/api/dispatch`.
5. **Dispatch** — gets a *fresh* quote (Uber quotes expire in minutes), creates
   the Uber delivery with dropoff verification set to a photo and the dropoff
   action set to leave-at-door, and saves the delivery id and tracking URL.
6. **Track** (`/track`) — polls `GET /api/donations/:id` every two seconds. The
   status line, four-segment progress bar, courier name, and the map are all
   derived from that one polled row — nothing here is state the browser is
   tracking on its own.
7. **Done** (`/done`) — receipt summary, no dollar value on the goods (see
   below).

The tracking screen never talks to Uber directly. Uber's delivery-status
webhooks land at `/api/webhooks/uber`, get verified and written to the
`donations` row, and the browser just polls that row. That indirection is what
makes the dev webhook replayer possible (see below): the screen reacts to
database state, not to whichever request happens to be in flight.

## Interesting engineering

- **Idempotent webhooks.** Uber gives no unique event id, and sends both
  duplicates and out-of-order deliveries. `event_id` is built as
  `delivery_id:status:created` and used as the `webhook_events` primary key —
  a duplicate insert just fails on the unique constraint (Postgres error
  `23505`) and the handler returns `200` without touching `donations` again.
- **Forward-only status transitions.** A fixed `STATUS_ORDER` array plus an
  index comparison. An event strictly *earlier* than the donation's current
  status is dropped outright — status can never move backwards. An event for
  the *same* status as current isn't a regression, so it still updates
  `courier_name` / `courier_imminent` (those change mid-status — a courier
  goes from "not imminent" to "imminent" on a repeated `pickup` webhook well
  before the status itself advances to `picked_up`) without rewriting `status`
  or its timestamp a second time.
- **Raw-body HMAC verification.** The webhook body is read as text *before*
  anything parses it as JSON, because Uber signs the raw bytes — a
  re-serialized `JSON.stringify` of the parsed object will never match the
  signature. Compared with a timing-safe `crypto.timingSafeEqual` against
  either `x-uber-signature` or `x-postmates-signature`.
- **A synthetic webhook replayer for failure paths the sandbox can't
  produce.** Uber's Robo Courier always passes verification and can't be made
  to fail a pickup or cancel mid-delivery. `scripts/replay-uber-webhook.mjs`
  clones a real payload already logged in `webhook_events`, swaps in whatever
  status you ask for, and posts it straight to the local webhook route.
  Signature checking can be skipped for this via
  `UBER_WEBHOOK_SKIP_SIGNATURE_CHECK`, which the route only honors when
  `NODE_ENV !== "production"`.
- **Always re-quote immediately before dispatch.** `/api/quote` gets a price
  to show on the confirm screen, but `/api/dispatch` throws that quote away
  and asks Uber for a fresh one right before creating the delivery, rather
  than risking a stale, expired quote from whenever the user was still
  browsing charities.

## Design decisions

**A real map on the tracking screen instead of embedding Uber's `tracking_url`
in an iframe.** Uber's own tracking page bundles its own courier marker and
branding, which breaks the illusion of a single app and only exists once a
delivery has actually been dispatched. The Leaflet map here needs nothing but
the pickup and charity coordinates already on the donation row, and — the
important part — it deliberately draws **no courier marker at all**. The
sandbox's simulated courier teleports between waypoints rather than moving
realistically, so a live courier pin would just be actively misleading.

**Receipts never state a dollar value for donated goods.** The "Amount" row on
the done screen shows the size bucket ("A few bags"), never a computed worth.
This isn't a copy choice — a charity can't legally assign fair-market value to
an in-kind donation; only the donor can, for their own records. The rule holds
one layer down too: Uber's `manifest_total_value` field (required for their
own delivery insurance) is a fixed placeholder, never derived from what's
actually being donated, so nothing in the pipeline ever computes a value to
begin with.

## Known limitations

- **OpenStreetMap coverage is uneven.** Good in cities, thin in rural areas,
  and a real share of thrift-shop nodes carry no `addr:*` tags at all, which
  can produce an incomplete address for a charity. This is a current, live
  gap, not a hypothetical edge case.
- **Pickup and charity phone numbers are a hardcoded placeholder.** Nothing in
  the app collects a real donor or charity phone number, but Uber's Create
  Delivery API requires one for both legs regardless.
- **The sandbox courier teleports.** Robo Courier jumps between waypoints
  instead of moving realistically, so live courier location isn't meaningful
  here — see the map decision above.
- **No automated tests.** Everything so far has been verified by hand against
  the running app and the real Uber, Supabase, Geoapify, and Overpass
  sandboxes.

## Not built yet

- **Stripe payment.** Confirm calls `/api/dispatch` directly and
  unconditionally — there's no payment step in the code to skip.
- **PWA support.** No `manifest.json`, no service worker, no install prompt.
- **A demo-mode toggle.** The `donations` table has an unused `is_demo`
  column; nothing reads or sets it yet.
- **Automated tests.**
- **Emailed / linkable receipts.** No `/r/:id` receipt page — the "Email me a
  copy" button on the done screen doesn't do anything yet.

## Local setup

You'll need a Supabase project, Uber Direct sandbox credentials
(direct.uber.com → Management → Developer → **Switch to testing**), and a
Geoapify API key (free, email signup only).

```bash
npm install
cp .env.local.example .env.local
```

`.env.local` is **required** and **gitignored** — fill in real values there,
never in `.env.local.example`. Then:

1. Run `supabase/schema.sql` against your Supabase project (SQL editor).
2. Create a public Storage bucket named `donation-photos`.
3. `npm run dev`

Visit `/dev` for a debug dashboard (recent donations, recent webhook events) —
it's dev-only and 404s when `NODE_ENV=production`.
