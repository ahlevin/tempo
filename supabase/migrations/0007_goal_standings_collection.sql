-- ─────────────────────────────────────────────────────────────────────────────
-- COLLECTION CHALLENGES (2/2): make goal_standings coverage-aware.
--
-- ⚠️ MUST BE APPLIED to the live database. Requires 0006 (goal_attempts.item).
--
-- Carries forward 0005 verbatim — SECURITY DEFINER + the participant/owner GUARD
-- (so a caller can only read standings for a goal they're in) — and changes ONLY the
-- score / rank branch:
--   • collection → score = count(DISTINCT item)  (coverage; repeat visits don't inflate)
--   • count      → score = count(*)               (occurrences — unchanged semantics)
--   • value      → min/max/sum/latest             (unchanged)
--   reached: count/collection → score >= target (target = goals.target = universe size,
--            overridable per participant via goal_participants.target_value).
--   order: count/collection rank by coverage DESC (the prior order keyed off
--          `direction`, which is null for collections).
--
-- Only these scoring/rank lines and the SECURITY DEFINER + guard differ from the
-- original 0002 body. If you've edited goal_standings since, MERGE these changes
-- rather than replacing wholesale, and re-confirm the guard before applying.
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
           case (select kind from g)
             when 'collection' then count(distinct a.item)::numeric
             when 'count'      then count(*)::numeric
             else case (select agg from g)
               when 'sum'    then sum(a.value)
               when 'latest' then (array_agg(a.value order by a.occurred_at desc,
                                                            a.created_at desc))[1]
               else case when (select direction from g) = 'lower'
                         then min(a.value) else max(a.value) end
             end
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
             then coalesce(x.score, 0) >=
                  coalesce(gp.target_value, (select base_target from tgt))
           when x.score is null then false
           when (select direction from g) = 'lower'
             then x.score <= coalesce(gp.target_value, (select base_target from tgt))
           else x.score >= coalesce(gp.target_value, (select base_target from tgt))
         end as reached
  from public.goal_participants gp
  join public.profiles p on p.id = gp.profile_id
  left join agg x on x.profile_id = gp.profile_id
  -- GUARD (from 0005): only a participant/owner of this goal may read its standings
  -- (auth.uid() inside a SECURITY DEFINER function is still the CALLER's uid).
  where gp.goal_id = gid
    and (goal_is_participant(gid) or goal_is_owner(gid))
  order by reached desc,
           case when (select kind from g) in ('count','collection') then x.score end desc nulls last,
           case when (select direction from g) = 'lower' then x.score end asc  nulls last,
           case when (select direction from g) = 'higher' then x.score end desc nulls last;
$function$;
