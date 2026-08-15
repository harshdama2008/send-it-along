-- Send It Along — database schema
-- See CLAUDE.md section 7 (Data model) and section 8 (Status machine).

-- ---------------------------------------------------------------------------
-- charities_cache
-- Overpass results cached by rounded lat/lng (~1km), TTL a few days.
-- See CLAUDE.md section 4, "Charity lookup".
-- ---------------------------------------------------------------------------
create table charities_cache (
  id                     uuid primary key default gen_random_uuid(),
  place_id               text not null unique,
  name                   text not null,
  organisation           text,
  formatted_address      text,
  lat                    double precision not null,
  lng                    double precision not null,
  regular_opening_hours  jsonb,
  accepted_categories    text[] not null default '{}',
  cache_key              text not null,
  fetched_at             timestamptz not null default now()
);

create index charities_cache_cache_key_idx on charities_cache (cache_key);

-- ---------------------------------------------------------------------------
-- donations
-- One row per in-progress or completed donation. `status` walks the state
-- machine below; each transition gets its own nullable timestamp so the
-- full history survives even though only the current `status` is "live".
-- ---------------------------------------------------------------------------
create table donations (
  id                   uuid primary key default gen_random_uuid(),

  -- draft → quoted → paid → dispatched → courier_assigned → picked_up → delivered
  -- failure branches: quote_expired, payment_failed, dispatch_failed, cancelled
  status               text not null default 'draft' check (status in (
    'draft',
    'quoted',
    'paid',
    'dispatched',
    'courier_assigned',
    'picked_up',
    'delivered',
    'quote_expired',
    'payment_failed',
    'dispatch_failed',
    'cancelled'
  )),

  pickup_address       text,
  pickup_lat           double precision,
  pickup_lng           double precision,
  categories           text[] not null default '{}',
  size                 text,
  photo_url            text,

  charity_place_id     text,
  charity_name         text,
  charity_address      text,

  quote_id             text,
  quote_amount_cents   integer,

  uber_delivery_id     text,
  tracking_url         text,
  courier_name         text,

  payment_intent_id    text,
  is_demo              boolean not null default false,

  created_at           timestamptz not null default now(),

  -- one timestamp per status transition
  quoted_at            timestamptz,
  paid_at              timestamptz,
  dispatched_at        timestamptz,
  courier_assigned_at  timestamptz,
  picked_up_at         timestamptz,
  delivered_at         timestamptz,
  quote_expired_at     timestamptz,
  payment_failed_at    timestamptz,
  dispatch_failed_at   timestamptz,
  cancelled_at         timestamptz
);

create index donations_uber_delivery_id_idx on donations (uber_delivery_id);

-- ---------------------------------------------------------------------------
-- webhook_events
-- Uber sends no unique event id, duplicates, and out-of-order deliveries.
-- event_id is built as delivery_id + status + created (see CLAUDE.md section
-- 5, "Webhooks") and is the PRIMARY KEY so a duplicate insert fails instead
-- of double-applying a status transition.
-- ---------------------------------------------------------------------------
create table webhook_events (
  event_id     text primary key,
  delivery_id  text not null,
  event_type   text not null,
  payload      jsonb not null,
  received_at  timestamptz not null default now()
);

create index webhook_events_delivery_id_idx on webhook_events (delivery_id);
