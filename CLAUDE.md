# Send It Along — build spec

On-demand donation pickup. The user photographs a pile of stuff, taps a button, and an
Uber courier collects it from their door and delivers it to a nearby charity.

Tagline: **Give without going anywhere**

This is a **demo prototype**, not a production service. Read "Demo mode" below before
assuming anything about payments.

---

## 1. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router), TypeScript |
| Hosting | Vercel |
| Styling | Tailwind + shadcn/ui |
| Database / storage | Supabase (Postgres + Storage) |
| Payments | Stripe, embedded, test mode — **optional, demo mode skips it** |
| Logistics | Uber Direct API (sandbox / Robo Courier) |
| Addresses | Geoapify Autocomplete (free tier, no card) |
| Charity POIs | Overpass API on OpenStreetMap (free, no key) |
| Email | Resend |

Installed as a **PWA** — web manifest, home-screen installable, no accounts.

### Hard rules

- **No secrets in the client.** Uber, Stripe secret, Supabase service role, and Geoapify
  keys live only in API routes. Nothing sensitive gets a `NEXT_PUBLIC_` prefix.
- **No login.** Anonymous. The current donation ID lives in `localStorage`.
- **Never dispatch before payment resolves.** In demo mode payment is skipped entirely,
  but the ordering constraint stays in the code.
- **Webhooks are duplicated and out of order.** Handle idempotently, trust timestamps.
- **Safe areas.** Use `env(safe-area-inset-top/bottom)`. There is no browser chrome once
  installed, so every screen after the first needs its own back control.

---

## 2. Brand

```
Blue      #2E7BC4   the only blue. Launch field, buttons, selected states, route line, pins.
Ink       #121214   primary text
Muted     #6C6C74   secondary text
Dim       #9A9AA3   tertiary / disabled
Border    #E5E5E9
Surface   #F7F7F8   cards, inputs
Open      #12924A   "open until 8pm" status only — not a brand colour
BG        #FFFFFF
```

Type on the blue field is **white**, not a second blue.

- Wordmark: **Fraunces** (variable; `SOFT 60`, `WONK 1`, `opsz 90`, weight 600)
- UI: **Figtree** (400/500/600)

Reference layouts live in `send-it-along-screens.html` — match those.

---

## 3. Screens

### 0 · Launch
Full-bleed `#2E7BC4`. Wordmark 42px white, mark 150px, tagline 16.5px white/85%.
Auto-dismisses under a second, fades to screen 1. **Not tappable.**
iOS won't generate this — needs `apple-touch-startup-image` or you get a white flash.
Set manifest `theme_color` to `#2E7BC4`.

### 1 · Pickup address
- Title: "Where should we pick up?"
- Geoapify address autocomplete. "Use my current location" as first row.
- **No Continue button** — selecting a suggestion advances.
- Store the formatted address string *and* lat/lng.

### 2 · What you're giving
- Title: "What are you giving away?"
- **Categories** — multi-select chips: Clothing & shoes, Books, Utensils, Bedding & towels,
  Toys, Electronics, Small furniture.
- **Size** — single select: `A bag or two` / `A few bags` (sub: "Fits in a car back seat") /
  `A carload`. Maps to the Uber manifest size.
- **Photo** — required, one. Copy: "Photo of the whole pile / Everything together, where
  you'll leave it — so we know what to send."
  - `<input type="file" accept="image/*" capture="environment">`
  - Resize client-side before upload (phone photos are 3–5MB)
  - Presigned upload direct to Supabase Storage, never through the API route
- Sticky footer button: **Continue**, disabled until ≥1 category and a size are chosen.
  **No price here** — no destination exists yet, so there is nothing to quote.

### 3 · Where it goes
- Title: "Places that take these", subtitle "Near {address} · {categories}"
- Exactly **3 cards**, no "see more". Name, distance, open state.
- Closed options are shown dimmed with "Opens 9am tomorrow" rather than hidden — that's
  what makes the hours logic visible.
- Footer: outline button **"Pick the closest one for me"**.
- Tapping a card fires the quote and advances.

### 4 · Confirm
- Title: "Ready when you are"
- Rows: Pickup (address + "Leave bags by the front door"), Goes to (charity + distance +
  closing time), Giving (categories · size + photo thumbnail).
- Price row, then primary button **"Send it along · $14"**.
- If Stripe is built, its payment form opens as a **sheet on this screen** — no redirect,
  no separate page. In demo mode the button calls dispatch directly.

### 5 · On its way
- Map on top (embed Uber's `tracking_url` in an iframe — do not build a map).
- Sheet below, in this order:
  1. Status line + ETA
  2. Four-segment progress bar
  3. **Going to** — charity name, distance, closing time
  4. **Your bags** — photo thumbnail + "Clothing, books · a few bags"
  5. **Marcus / Your courier** — small row, message icon
  6. Note: "Set your bags outside before Marcus arrives. You don't need to be there when
     he gets here."
- **No licence plate, no call button.** The user isn't meeting a car.
- Status copy per state: `Finding a driver` → `{name} is on the way` → `Picked up` →
  `Almost there`.

### 6 · Done
- Green tick, title "Sent along", subtitle "Dropped off at {time} today"
- Receipt card: Went to / Items / Amount / Paid
- Photo thumbnail + "Receipt saved on this device."
- Buttons: outline **"Email me a copy"** (reveals a field), primary **"Send something else"**.
- **The receipt must never state a value for the donated goods.** A charity cannot assign
  value; the donor determines fair market value. Record what, where, and when only.

### Header consistency
Every screen 1–4 and 6 has a fixed-height header slot (34px + 18px margin). Screens with a
back action show the button; others show empty space of the same height, so titles align.
Screen 5 has no header — the map runs to the top edge.

---

## 4. Charity lookup

**Live, not seeded** — must work for any US address. No Google, no billing card.

### Addresses — Geoapify
- Autocomplete endpoint, filtered to `countrycode:us`
- Free tier ~3,000 requests/day, email signup, no card
- Returns formatted address + lat/lng
- Server-side proxy only; the key never reaches the browser
- Debounce 300ms
- Fallback if Geoapify ever asks for a card: **Photon** (`photon.komoot.io`) needs no account
  at all

### Charities — Overpass API (OpenStreetMap)
Endpoint: `https://overpass-api.de/api/interpreter`, POST with a `data=` body.

OSM tags the exact thing we want, so no keyword guessing:

```
[out:json][timeout:25];
(
  nwr["shop"="charity"](around:25000,{lat},{lon});
  nwr["shop"="second_hand"](around:25000,{lat},{lon});
);
out center tags;
```

Useful tags on each result: `name`, `brand`, `opening_hours`, `addr:*`.

Rules:
- Cache in Supabase keyed on lat/lng rounded to 2dp (~1km), TTL a few days. Overpass is
  free community infrastructure — do not hammer it.
- Send a descriptive `User-Agent`. It's their usage policy and they enforce it.
- One request per second maximum.

### Opening hours
OSM's `opening_hours` tag uses its own syntax (`Mo-Sa 09:00-20:00; Su 11:00-18:00`).
Parse it with the **`opening_hours`** npm package — do not hand-roll it.

**Coverage is patchy.** When the tag is missing, fall back to typical chain hours:

```
Goodwill          Mon–Sat 09:00–20:00, Sun 10:00–18:00
Salvation Army    Mon–Sat 09:00–19:00, Sun closed
Habitat ReStore   Mon–Sat 09:00–18:00, Sun closed
Savers            Mon–Sat 09:00–21:00, Sun 10:00–19:00
(default)         Mon–Sat 10:00–18:00, Sun closed
```

These are approximations. When hours come from the fallback rather than OSM, show
"Usually open until 8pm" instead of "Open until 8pm" — the hedge is honest and costs nothing.

### Accepted categories
OSM won't tell you. Override table keyed on name/brand:

```
Goodwill              → clothing_shoes, books, utensils, bedding, toys, electronics
Salvation Army        → clothing_shoes, books, utensils, bedding, toys, small_furniture
Habitat ReStore       → utensils, electronics, small_furniture
Vietnam Veterans      → clothing_shoes, books, bedding
Savers                → clothing_shoes, books, utensils, bedding, toys
(default)             → clothing_shoes, books, bedding
```

### Matching algorithm
1. Filter to charities accepting ≥1 selected category
2. Filter to open **now and in 30 minutes** (courier arrival buffer)
3. Sort: open first, then straight-line distance ascending
4. Dedupe by organisation name — never three Goodwills
5. Take 3. If fewer than 3 are open, backfill with closed ones shown dimmed.

Straight-line distance (haversine) only. Uber computes the real route at quote time.

### Known tradeoff
OSM coverage of thrift shops is good in cities, thinner in rural areas, and some locations
lack hours. That's acceptable — it's exactly why the "nothing open nearby" state exists.

---

## 5. Uber Direct

Sandbox is **not a separate environment** — same endpoints, same auth, same webhooks. The
only difference is `test_specifications` in the create-delivery body.

Account: **direct.uber.com** → Management → Developer. The page opens on **production**
credentials — click **"Switch to testing"** to get the sandbox set. Using production
credentials by mistake is the most likely cause of unexplained 401/403 responses.

Base URL: `https://api.uber.com/v1/customers/{customer_id}/`

### Auth
- POST to the OAuth token endpoint with **`Content-Type: application/x-www-form-urlencoded`**
  — the only non-JSON request in the API
- Fields: `client_id`, `client_secret`, `grant_type=client_credentials`, `scope=eats.deliveries`
- **Token lasts 30 days.** Token requests are rate limited to **100/hour** — cache the
  token in memory, never fetch per request
- Everything else: `Authorization: Bearer <token>`, `Content-Type: application/json`
- Endpoints: `POST {base}/delivery_quotes`, `POST {base}/deliveries`, `GET {base}/deliveries/{id}`

### Quote
Fires when a charity is tapped on screen 3. Quotes expire in minutes — **always re-quote
immediately before dispatch** rather than reusing a stale one.

### Create delivery
Manifest from the category/size selections, both addresses, dropoff verification set to
picture, plus:

```json
"test_specifications": {
  "robo_courier_specification": { "mode": "auto" }
}
```

Auto mode: assigned → +30s enroute → +60s pickup imminent → +90s picked up →
+120s dropoff imminent → +150s delivered.

**Custom mode** for demos — explicit timestamps a few seconds apart, full lifecycle in ~15s.
All five fields required: `enroute_for_pickup_at`, `pickup_imminent_at`, `pickup_at`,
`dropoff_imminent_at`, `dropoff_at`.

### Webhooks
Configure at direct.uber.com → Developer → **Webhooks** tab. Enable `event.delivery_status`.
(`event.courier_update` carries courier location — only needed if drawing your own map.)
The **signing key** shown there is a separate secret from the Client Secret.

**Signature:** HMAC-SHA256 of the **raw request body**, in the `x-uber-signature` header
(`x-postmates-signature` is also sent for delivery status events). **Read the body as raw
text before parsing JSON** — re-serialised JSON will never match the hash. Use a timing-safe
compare.

**Retries:** on 5xx / timeout / network error, after 10s, then 30s, 60s, 120s, up to 3
attempts. Return 200 fast.

**Payload:** top level `delivery_id` (prefixed `del_`), `status`, `kind`, `created`,
`live_mode`. Inside `data`: `courier` (name, phone, location, vehicle), `pickup`, `dropoff`,
`manifest_items`, `fee`.

**No unique event id is provided** — build one from `delivery_id + status + created` and use
it as the `webhook_events` primary key.

**Courier name comes from `data.courier`** — it is NOT present in the `delivered` webhook, so
persist it the first time it appears.

### Status mapping

| Uber | Ours |
|---|---|
| `pending` | `dispatched` |
| `pickup` | `courier_assigned` |
| `pickup_complete` | `picked_up` |
| `dropoff` | `picked_up` |
| `delivered` | `delivered` |
| `canceled` | `cancelled` |
| `returned` | `cancelled` |

`pickup` and `dropoff` carry a `courier_imminent` boolean meaning ~1 minute away — that
drives the "Almost there" copy.

### Sandbox limitations to design around
- Robo Courier always passes verification — a failed photo verification cannot be tested
- No cancel *after* pickup
- The courier teleports; location updates jump and the map will look wrong in testing
- Quote prices are synthetic — do not build a pricing model on them

Build a **synthetic webhook replayer** for the failure paths the sandbox cannot produce.

## 6. Payments — OPTIONAL

**Demo mode skips payment entirely, so this is not required to ship.** Build it only if you
want to be able to say it works. If skipped, confirm calls dispatch directly and the price
shown is the real Uber quote, just never charged.

Stripe **embedded** (Payment Element as a sheet on screen 4), never hosted Checkout —
a redirect breaks the installed-app illusion.

Sequence: server creates a PaymentIntent for the quoted amount → element renders → user
pays → Stripe confirms → **your webhook confirms independently** → only then create the
Uber delivery → advance to tracking.

Never trust the browser's success callback alone.

Production refinement (not needed for the demo): `capture_method: manual`, authorise at
confirm, capture on the delivered webhook, release the hold if dispatch fails.

---

## 7. Data model

**charities_cache** — `place_id`, name, organisation, formatted_address, lat, lng,
`regular_opening_hours` (jsonb), `accepted_categories` (text[]), `cache_key` (rounded
coords), `fetched_at`

**donations** — `id`, `status`, `pickup_address`, `pickup_lat`, `pickup_lng`,
`categories` (text[]), `size`, `photo_url`, `charity_place_id`, `charity_name`,
`charity_address`, `quote_id`, `quote_amount_cents`, `uber_delivery_id`, `tracking_url`,
`courier_name`, `payment_intent_id`, `is_demo` (bool), `created_at`, plus a timestamp per
status transition

**webhook_events** — `event_id` (PK, from Uber), `delivery_id`, `event_type`, `payload`
(jsonb), `received_at`

`is_demo` gates receipt emails. Otherwise you will send yourself four hundred receipts.

---

## 8. Status machine

```
draft → quoted → paid → dispatched → courier_assigned → picked_up → delivered
```

Failure branches: `quote_expired`, `payment_failed`, `dispatch_failed`, `cancelled`

**Webhook handler rule:** look up `event_id`; if seen, ignore. Otherwise apply the status
only if it is later in the sequence than the current one. Never trust arrival order.

The tracking screen reads **your database**, not Uber. Poll your own API every 2s, or use
Supabase realtime.

---

## 9. API routes

```
POST /api/places/search       address autocomplete proxy
POST /api/charities           coords + categories → 3 matches (cache-first)
POST /api/donations           create draft record
POST /api/uploads/presign     presigned Supabase Storage upload URL for a donation photo
POST /api/quote               donation + charity → price, quote id
POST /api/payment-intent      create PaymentIntent (skipped in demo)
POST /api/dispatch            create Uber delivery
POST /api/webhooks/uber       idempotent status handler
POST /api/webhooks/stripe     payment confirmation
GET  /api/donations/:id       current state (polled by tracking)
GET  /r/:id                   receipt page
```

---

## 10. States that must exist

Not optional — these are where demos die.

- **Quote loading** — 1–2s between tapping a charity and seeing a price. Skeleton the price
  area on screen 4 rather than blocking on screen 3.
- **Nothing open nearby** — the first rural address will hit this. Offer closed options with
  their opening times rather than an empty screen.
- **Payment failed** — declined, or the sheet dismissed.
- **No courier accepted / dispatch failed** — money taken, nothing dispatched. Highest
  priority of the failure states.
- **Cancelled mid-delivery** — courier has the bags and the job dies.
- **Continue disabled** — screen 2 before a category and size are picked.

---

## 11. Demo mode

Flag via env var **and** `?demo=1`, so one deploy serves both.

When on:
- Skip Stripe entirely; go straight from confirm to dispatch
- Robo Courier **custom mode**, timestamps a few seconds apart → full lifecycle in ~15s
- Set `is_demo = true`; suppress receipt emails
- Small unobtrusive line: "Demo · no payment taken"

Always have this available before any live demo. Face ID fails, wifi drops, cards expire.

---

## 12. Out of scope

Accounts · order history · ratings · push notifications · admin panel · itemised
inventories · real charity integrations · multi-stop batching · anything that assigns a
dollar value to donated goods.

---

## 13. Git behaviour

When I ask you to commit, use the message format `Step N — short description` to match the
build guide, so the history maps to the steps.

Commit after each verified slice, not mid-change. When I say "commit and push", do both.

Never run `git reset --hard`, `git checkout .`, `git clean`, or `git rebase` without asking
me first — those throw away work.

Never add `Co-Authored-By` trailers or "Generated with Claude Code" lines to commit
messages. Commit messages contain only the `Step N — description` text.

Never commit `.env.local` or anything containing a real key. If you spot a secret about to
be committed, stop and tell me.

---

## 14. Build order

1. Screens 1–4 with fake data, no APIs. Get the flow clicking end to end.
2. Supabase — persist a donation, upload a photo.
3. Geoapify for addresses, Overpass for charities, hours logic with fallback.
4. **Uber sandbox**: token → quote → create delivery → receive a webhook. Prove the pipe
   before wiring it to UI.
5. Tracking screen driven by webhook state.
6. Receipt.
7. Stripe test mode.
8. Empty and error states.

Vertical slices, committed one at a time. If you build it all at once and it breaks, you
won't know which layer lied.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
