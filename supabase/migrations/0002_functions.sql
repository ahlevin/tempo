-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION SNAPSHOT — audit record, NOT a migration to run.
--
-- These SECURITY DEFINER + helper functions already exist in the LIVE Supabase
-- database and back the RLS policies in 0001_rls_policies.sql (participant /
-- ownership / invite logic). This file is a version-controlled snapshot of their
-- definitions as of 2026-07-17, captured so the authorization logic is auditable
-- and reviewable in the repo (previously it lived ONLY in the database).
--
-- DO NOT execute this against the database: the functions are already applied.
-- `CREATE OR REPLACE FUNCTION` is technically re-runnable, but this file is
-- documentation, not an executable migration — treat it as a read-only record.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.find_profile_by_code(code text)
 RETURNS TABLE(id uuid, display_name text, avatar_emoji text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.id, p.display_name, p.avatar_emoji
  from public.profiles p
  where p.invite_code = upper(trim(code))
  limit 1;
$function$;

CREATE OR REPLACE FUNCTION public.gen_goal_code()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text; i int;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.goals where join_code = code);
  end loop;
  return code;
end; $function$;

CREATE OR REPLACE FUNCTION public.gen_invite_code()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text; i int;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where invite_code = code);
  end loop;
  return code;
end; $function$;

CREATE OR REPLACE FUNCTION public.goal_is_owner(gid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.goals g
                 where g.id = gid and g.user_id = auth.uid());
$function$;

CREATE OR REPLACE FUNCTION public.goal_is_participant(gid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.goal_participants gp
    join public.profiles p on p.id = gp.profile_id
    where gp.goal_id = gid and p.user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.goal_standings(gid uuid)
 RETURNS TABLE(profile_id uuid, display_name text, avatar_emoji text, attempts bigint, score numeric, latest_value numeric, latest_at date, target numeric, reached boolean)
 LANGUAGE sql
 STABLE
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
  where gp.goal_id = gid
  order by reached desc,
           case when (select direction from g) = 'lower' then x.score end asc  nulls last,
           case when (select direction from g) = 'higher' then x.score end desc nulls last;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, split_part(coalesce(new.email, ''), '@', 1));
  return new;
end; $function$;

CREATE OR REPLACE FUNCTION public.join_goal_by_code(code text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare gid uuid; me uuid;
begin
  select id into me from public.profiles
    where user_id = auth.uid() and is_primary limit 1;
  if me is null then raise exception 'no profile'; end if;
  select id into gid from public.goals where join_code = upper(trim(code));
  if gid is null then raise exception 'no challenge with that code'; end if;
  insert into public.goal_participants (goal_id, profile_id)
  values (gid, me) on conflict do nothing;
  return gid;
end; $function$;

CREATE OR REPLACE FUNCTION public.my_profile_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select id from public.profiles where user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.share_goal(gid uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare code text; me uuid;
begin
  if not public.goal_is_owner(gid) then raise exception 'not your goal'; end if;
  select id into me from public.profiles
    where user_id = auth.uid() and is_primary limit 1;
  select join_code into code from public.goals where id = gid;
  if code is null then
    code := public.gen_goal_code();
    update public.goals set join_code = code where id = gid;
  end if;
  insert into public.goal_participants (goal_id, profile_id, is_owner)
  values (gid, me, true) on conflict do nothing;
  return code;
end; $function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- REVIEW NOTES (2026-07-17)
--
-- (1) SEARCH_PATH: all SECURITY DEFINER functions correctly SET search_path=public
--     — verified. (find_profile_by_code, goal_is_owner, goal_is_participant,
--     handle_new_user, join_goal_by_code, my_profile_ids, share_goal all pin it;
--     goal_standings also pins it though it is not SECURITY DEFINER. The two
--     plain code generators — gen_goal_code, gen_invite_code — are not SECURITY
--     DEFINER and do not need it.)
--
-- (2) NO PII LEAK: find_profile_by_code returns only id / display_name /
--     avatar_emoji — no email, user_id, or other PII — verified.
--
-- (3) HARDENING TODO: join_goal_by_code does NOT verify the goal is in a shared
--     state before adding the caller as a participant — confirmed against the body
--     above (it looks the goal up by join_code and inserts into goal_participants
--     with no shared/enabled flag check). Low risk today: join codes are random
--     6-char codes from a 30-char ambiguity-free alphabet and are owner-distributed
--     (only set via share_goal). But before the sharing feature ships, gate the join
--     on an explicit shared flag so a leaked/guessed code can't attach a stranger to
--     a goal the owner never chose to share.
--
-- (4) COSMETIC: join_goal_by_code raises 'no challenge with that code' — the
--     "challenge" wording is legacy; rename to match current "goal" terminology
--     (also audit share_goal / related error text for the same term).
-- ─────────────────────────────────────────────────────────────────────────────
