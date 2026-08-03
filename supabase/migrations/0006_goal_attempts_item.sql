-- ─────────────────────────────────────────────────────────────────────────────
-- COLLECTION CHALLENGES (1/2): a shareable per-item coverage substrate.
--
-- ⚠️ MUST BE APPLIED to the live database (like 0003/0004/0005). Additive and
-- idempotent — existing goal_attempts rows and all value/count challenges are
-- unaffected; the app emits `item` only for collection visits.
--
-- Why: solo collection coverage lives in each user's PRIVATE life log (memories),
-- which isn't shared. For a shared collection CHALLENGE, coverage must be per-goal
-- and visible to participants — so a "visited Fenway" event becomes a goal_attempts
-- row carrying the item name (RLS ga_select already shares participants' attempts).
-- goal_attempts.value stays numeric (for value challenges); `item` is the collection
-- item's canonical name.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.goal_attempts add column if not exists item text;
