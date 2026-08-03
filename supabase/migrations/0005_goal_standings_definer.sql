-- ─────────────────────────────────────────────────────────────────────────────
-- FIX: goal_standings must be SECURITY DEFINER (leaderboard showed only the caller).
--
-- ⚠️ MUST BE APPLIED to the live database (like 0003/0004). Run it in the Supabase
-- SQL editor.
--
-- Why: goal_standings was LANGUAGE sql STABLE (NOT security definer) and INNER JOINs
-- public.profiles. The only profiles SELECT policy is `auth.uid() = user_id` (own row
-- only), so under a normal RLS-scoped client that join dropped every participant
-- except the caller — the leaderboard returned just 1 row. Its sibling helpers
-- (goal_is_participant / my_profile_ids / find_profile_by_code) are already SECURITY
-- DEFINER; goal_standings was the omission. (A service-role SQL-editor call bypasses
-- RLS, which is why the function "looked" correct there.)
--
-- Fix: run as SECURITY DEFINER so it can read all participants' profiles for the
-- join, AND add a guard so a caller can only read standings for a goal they actually
-- participate in / own — so making it definer does NOT leak other challenges'
-- names/avatars/scores to arbitrary authenticated users. Only the added
-- `SECURITY DEFINER` and the guarded WHERE differ from the live 0002 body; if you've
-- edited goal_standings since 2026-07-17, MERGE those two changes rather than
-- replacing wholesale.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.goal_standings(gid uuid)
 RETURNS TABLE(profile_id uuid, display_name text, avatar_emoji text, attempts bigint, score numeric, latest_value numeric, latest_at date, target numeric, reached boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with g as (select * from public.goals where id = gid),
  agg as (
    select a.profile_id,
           count(*) as attempts,
           case (select agg from g)
             when 'sum'    then sum(a.value)
             when 'latest' then (array_agg(a.value order by a.occurred_at desc,
                                                            a.created_at desc))[1]
             else case when (select direction from g) = 'lower'
                       then min(a.value) else max(a.value) end
           end as score,
           (array_agg(a.value       order by a.occurred_at desc, a.created_at desc))[1] as latest_value,
           (array_agg(a.occurred_at order by a.occurred_at desc, a.created_at desc))[1] as latest_at
    from public.goal_attempts a
    where a.goal_id = gid
    group by a.profile_id
  ),
  tgt as (
    select case when (select kind from g) in ('count','collection')
                then (select target from g)
                else (select target_value from g) end as base_target
  )
  select p.id, p.display_name, p.avatar_emoji,
         coalesce(x.attempts, 0), x.score, x.latest_value, x.latest_at,
         coalesce(gp.target_value, (select base_target from tgt)) as target,
         case
           when (select kind from g) in ('count','collection')
             then coalesce(x.attempts,0) >=
                  coalesce(gp.target_value, (select base_target from tgt))
           when x.score is null then false
           when (select direction from g) = 'lower'
             then x.score <= coalesce(gp.target_value, (select base_target from tgt))
           else x.score >= coalesce(gp.target_value, (select base_target from tgt))
         end as reached
  from public.goal_participants gp
  join public.profiles p on p.id = gp.profile_id
  left join agg x on x.profile_id = gp.profile_id
  -- GUARD: only a participant/owner of this goal may read its standings (auth.uid()
  -- inside a SECURITY DEFINER function is still the CALLER's uid).
  where gp.goal_id = gid
    and (goal_is_participant(gid) or goal_is_owner(gid))
  order by reached desc,
           case when (select direction from g) = 'lower' then x.score end asc  nulls last,
           case when (select direction from g) = 'higher' then x.score end desc nulls last;
$function$;
