-- ─────────────────────────────────────────────────────────────────────────────
-- TIMED EVENTS — adds the three-type countdown model columns to public.events.
--
-- ⚠️ UNLIKE 0001/0002 (which SNAPSHOT already-live objects), THIS MIGRATION MUST
-- BE APPLIED to the live database. It is additive and idempotent (`add column if
-- not exists`, all nullable) — existing rows and plain all-day events are
-- unaffected. Apply it in the Supabase SQL editor before timed / all-day-range
-- events can sync; plain date_only (all-day) events sync fine without it (the app
-- emits no new columns for them).
--
-- Storage model:
--   countdown_type : 'date_only' | 'exact_instant' | 'viewer_local' (NULL ⇒ date_only)
--   end_date       : date_only exclusive range end ("YYYY-MM-DD")
--   start_at_utc   : exact_instant real start instant (timestamptz, UTC)
--   end_at_utc     : exact_instant real end instant (timestamptz, UTC)
--   event_timezone : exact_instant IANA origin zone, e.g. 'America/Los_Angeles'
--   start_local    : exact_instant origin wall-clock ("YYYY-MM-DDTHH:mm")
--   end_local      : exact_instant origin wall-clock end
--   local_date     : viewer_local floating date ("YYYY-MM-DD")
--   local_time     : viewer_local floating time ("HH:mm")
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.events add column if not exists countdown_type text;
alter table public.events add column if not exists end_date       date;
alter table public.events add column if not exists start_at_utc    timestamptz;
alter table public.events add column if not exists end_at_utc      timestamptz;
alter table public.events add column if not exists event_timezone  text;
alter table public.events add column if not exists start_local     text;
alter table public.events add column if not exists end_local       text;
alter table public.events add column if not exists local_date      date;
alter table public.events add column if not exists local_time      text;
