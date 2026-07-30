-- ─────────────────────────────────────────────────────────────────────────────
-- CUSTOM LIFE-LOG ITEM LISTS — adds a user-authored checklist column to memories.
--
-- ⚠️ THIS MIGRATION MUST BE APPLIED to the live database (like 0003, unlike the
-- 0001/0002 snapshots). It is additive and idempotent (`add column if not exists`,
-- nullable) — existing rows and all preset / freeform logs are unaffected. Apply it
-- in the Supabase SQL editor before custom COLLECTION logs (user-typed item lists)
-- can sync; preset collections, freeform count logs, and every existing memory sync
-- fine without it (the app emits log_items only for user-authored collections).
--
--   log_items : jsonb array of item-name strings for a user-authored collection,
--               e.g. ["Tartine","Blue Bottle"]. When present it IS the log's
--               universe (flows through the same picker/browse/coverage as presets).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.memories add column if not exists log_items jsonb;
