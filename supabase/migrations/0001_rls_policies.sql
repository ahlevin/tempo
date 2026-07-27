-- ─────────────────────────────────────────────────────────────────────────────
-- RLS POLICY SNAPSHOT — audit record, NOT a migration to run.
--
-- These Row-Level Security policies already exist in the LIVE Supabase database.
-- This file is a version-controlled snapshot of them as of 2026-07-17, captured so
-- the authorization model is auditable and reviewable in the repo (previously it
-- lived ONLY in the database — an audit gap).
--
-- DO NOT execute this against the database: the policies are already applied. The
-- `enable row level security` statements are safe to re-run (idempotent), but the
-- `create policy` statements would fail on an already-live policy and would need
-- matching `drop policy` statements to re-apply — which is fine for an audit record,
-- but this file is documentation, not an executable migration.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.events enable row level security;
alter table public.goal_attempts enable row level security;
alter table public.goal_participants enable row level security;
alter table public.goals enable row level security;
alter table public.memories enable row level security;
alter table public.prefs enable row level security;
alter table public.profiles enable row level security;
alter table public.universes enable row level security;

create policy "ga_delete_own" on public.goal_attempts for delete using ((profile_id IN ( SELECT my_profile_ids() AS my_profile_ids)));
create policy "ga_insert_own" on public.goal_attempts for insert with check (((profile_id IN ( SELECT my_profile_ids() AS my_profile_ids)) AND (goal_is_participant(goal_id) OR goal_is_owner(goal_id))));
create policy "ga_select" on public.goal_attempts for select using (((profile_id IN ( SELECT my_profile_ids() AS my_profile_ids)) OR goal_is_participant(goal_id)));
create policy "ga_update_own" on public.goal_attempts for update using ((profile_id IN ( SELECT my_profile_ids() AS my_profile_ids)));
create policy "goals_select_participant" on public.goals for select using (goal_is_participant(id));
create policy "gp_delete_self_or_owner" on public.goal_participants for delete using (((profile_id IN ( SELECT my_profile_ids() AS my_profile_ids)) OR goal_is_owner(goal_id)));
create policy "gp_insert_self" on public.goal_participants for insert with check ((profile_id IN ( SELECT my_profile_ids() AS my_profile_ids)));
create policy "gp_select" on public.goal_participants for select using ((goal_is_participant(goal_id) OR goal_is_owner(goal_id)));
create policy "gp_update_self_or_owner" on public.goal_participants for update using (((profile_id IN ( SELECT my_profile_ids() AS my_profile_ids)) OR goal_is_owner(goal_id)));
create policy "own events" on public.events for all using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "own goals" on public.goals for all using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "own memories" on public.memories for all using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "own prefs" on public.prefs for all using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "profiles_delete_own" on public.profiles for delete using ((auth.uid() = user_id));
create policy "profiles_insert_own" on public.profiles for insert with check ((auth.uid() = user_id));
create policy "profiles_select_own" on public.profiles for select using ((auth.uid() = user_id));
create policy "profiles_update_own" on public.profiles for update using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "superusers can delete universes" on public.universes for delete using ((EXISTS ( SELECT 1 FROM prefs p WHERE ((p.user_id = auth.uid()) AND p.is_superuser))));
create policy "superusers can insert universes" on public.universes for insert with check ((EXISTS ( SELECT 1 FROM prefs p WHERE ((p.user_id = auth.uid()) AND p.is_superuser))));
create policy "superusers can update universes" on public.universes for update using ((EXISTS ( SELECT 1 FROM prefs p WHERE ((p.user_id = auth.uid()) AND p.is_superuser))));
create policy "universes are readable by authenticated users" on public.universes for select using (true);
