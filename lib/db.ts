import { supabase } from './supabase';
import { Event, Goal, Memory, UserPrefs, LogEntry, GoalAttempt } from '../store/types';
import { getPreset } from '../constants/lifelogs';

// ---------------------------------------------------------------------------
// Field mapping notes (app camelCase <-> DB snake_case)
//  - events.start / "end" are timestamptz; the app treats start/end as naive
//    local datetime strings ("YYYY-MM-DDTHH:mm:ss"). We store the app string
//    as-is and, on read, slice the first 19 chars of the returned ISO string
//    so the wall-clock time is preserved regardless of the DB's +00 suffix.
//  - the app's deprecated Event.date is derived from start (no DB column).
//  - Event.created / Goal.created come from created_at (date portion).
//  - Goal.date <-> goals.target_date, Memory.originDate <-> memories.origin_date.
//  - "end" is a reserved word; as a JSON key via PostgREST it is handled fine.
//  - DATE/timestamptz columns are coerced to NULL (never "") via dateCol/tsCol
//    below, so dateless life-log containers (blank originDate) upsert cleanly.
// ---------------------------------------------------------------------------

const datePart = (s: string) => s.slice(0, 10);
const naive = (s: string | null | undefined) => (s ? s.slice(0, 19) : null);

// Postgres DATE/timestamptz columns reject "" — they need a valid value or NULL.
// These coerce empty/invalid app strings (e.g. a life-log container's blank
// originDate) to NULL so the upsert never sends "".

// A DATE column: the "YYYY-MM-DD" prefix if valid, else NULL.
const dateCol = (s: string | null | undefined): string | null => {
  const d = (s ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
};
// A timestamptz derived from an app date ("YYYY-MM-DD" → midnight UTC), else NULL.
const tsFromDate = (s: string | null | undefined): string | null => {
  const d = dateCol(s);
  return d ? `${d}T00:00:00Z` : null;
};
// A timestamptz from an app naive datetime ("YYYY-MM-DDTHH:mm:ss") — kept as-is
// (wall-clock preserved on read), or promoted from a bare date, else NULL.
const tsCol = (s: string | null | undefined): string | null => {
  const v = (s ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return v;
  const d = dateCol(v);
  return d ? `${d}T00:00:00` : null;
};

// RFC4122 v4 — client-generated ids for optimistic inserts (DB columns are uuid).
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---- Event ----------------------------------------------------------------
export function rowToEvent(r: any): Event {
  const start = naive(r.start) || `${datePart(r.start ?? '')}T00:00:00`;
  return {
    id: r.id,
    name: r.name ?? '',
    emoji: r.emoji ?? '🎉',
    cat: r.cat,
    allDay: !!r.all_day,
    start,
    end: naive(r.end),
    date: datePart(start),
    created: r.created_at ? datePart(r.created_at) : datePart(start),
    fav: !!r.fav,
    note: r.note ?? '',
    recur: r.recur ?? null,
    alerts: r.alerts ?? [],
    links: r.links ?? [],
  };
}

export function eventToRow(e: Event, userId: string) {
  return {
    id: e.id,
    user_id: userId,
    name: e.name,
    emoji: e.emoji,
    cat: e.cat,
    all_day: e.allDay,
    start: tsCol(e.start),          // timestamptz — never ""
    end: tsCol(e.end),              // nullable timestamptz
    fav: e.fav,
    note: e.note,
    recur: e.recur,
    alerts: e.alerts,
    links: e.links ?? [],
    created_at: tsFromDate(e.created),
  };
}

// ---- Goal -----------------------------------------------------------------
export function rowToGoal(r: any): Goal {
  return {
    id: r.id,
    name: r.name ?? '',
    emoji: r.emoji ?? '🎯',
    target: Number(r.target ?? 0),
    current: Number(r.current ?? 0),
    unit: r.unit ?? 'units',
    step: Number(r.step ?? 1),
    date: datePart(r.target_date ?? ''),
    created: r.created_at ? datePart(r.created_at) : datePart(r.target_date ?? ''),
    fav: !!r.fav,
    note: r.note ?? '',
    alerts: r.alerts ?? [],
    links: r.links ?? [],
    showOnCountdown: !!r.show_on_countdown,
    linkedPreset: r.linked_preset ?? null,
    linkedLogId: r.linked_log_id ?? null,
    windowKind: r.window_kind ?? null,
    windowYear: r.window_year ?? null,
    windowStart: r.window_start ? datePart(r.window_start) : null,
    repeats: !!r.repeats,
    periodKind: r.period_kind ?? null,
    periodTarget: r.period_target != null ? Number(r.period_target) : null,
    manualPeriods: Array.isArray(r.manual_periods) ? r.manual_periods : [],
    completedAt: r.completed_at ?? null,
    // Measurement layer. `kind` is backfilled server-side; infer for any legacy
    // local cache row missing it (repeats→streak, linked→collection, else count).
    kind: r.kind ?? (r.repeats ? 'streak' : (r.linked_preset || r.linked_log_id) ? 'collection' : 'count'),
    direction: r.direction ?? null,
    agg: r.agg ?? null,
    targetValue: r.target_value != null ? Number(r.target_value) : null,
    parentGoalId: r.parent_goal_id ?? null,
    joinCode: r.join_code ?? null,
  };
}

export function goalToRow(g: Goal, userId: string) {
  return {
    id: g.id,
    user_id: userId,
    name: g.name,
    emoji: g.emoji,
    target: g.target,
    current: g.current,
    unit: g.unit,
    step: g.step,
    target_date: tsFromDate(g.date),
    fav: g.fav,
    note: g.note,
    alerts: g.alerts,
    show_on_countdown: g.showOnCountdown ?? false,
    linked_preset: g.linkedPreset ?? null,
    linked_log_id: g.linkedLogId ?? null,
    window_kind: g.windowKind ?? null,
    window_year: g.windowYear ?? null,
    window_start: dateCol(g.windowStart),
    repeats: g.repeats ?? false,
    period_kind: g.periodKind ?? null,
    period_target: g.periodTarget ?? null,
    manual_periods: g.manualPeriods ?? [],
    completed_at: g.completedAt ?? null,
    kind: g.kind ?? (g.repeats ? 'streak' : (g.linkedPreset || g.linkedLogId) ? 'collection' : 'count'),
    direction: g.direction ?? null,
    agg: g.agg ?? null,
    target_value: g.targetValue ?? null,
    parent_goal_id: g.parentGoalId ?? null,
    join_code: g.joinCode ?? null,
    created_at: tsFromDate(g.created),
  };
}

// ---- Goal attempts (VALUE goals) ------------------------------------------
export function rowToGoalAttempt(r: any): GoalAttempt {
  return {
    id: r.id,
    goalId: r.goal_id,
    profileId: r.profile_id,
    value: Number(r.value ?? 0),
    occurredAt: datePart(r.occurred_at ?? ''),
    note: r.note ?? '',
    links: r.links ?? [],
    createdAt: r.created_at ?? undefined,
  };
}
export function goalAttemptToRow(a: GoalAttempt) {
  // No user_id column — RLS scopes by profile ownership. created_at is a server default.
  return {
    id: a.id,
    goal_id: a.goalId,
    profile_id: a.profileId,
    value: a.value,
    occurred_at: dateCol(a.occurredAt),
    note: a.note ?? '',
    links: a.links ?? [],
  };
}

// ---- Memory ---------------------------------------------------------------
export function rowToMemory(r: any): Memory {
  return {
    id: r.id,
    type: r.type,
    name: r.name ?? '',
    emoji: r.emoji ?? '⭐',
    originDate: datePart(r.origin_date ?? ''),
    yearUnknown: !!r.year_unknown,
    entries: (r.entries ?? []) as LogEntry[],
    // Heal on read: if the log's preset resolves (original OR expanded), take the
    // preset's authoritative kind — correcting any log persisted with a stale
    // logKind (e.g. an expanded-universe log saved as 'count'). Custom/no-preset
    // logs keep their stored kind.
    logKind: getPreset(r.log_preset)?.kind
      ?? (r.log_kind === 'collection' ? 'collection' : 'count'),
    logPreset: r.log_preset ?? undefined,
    logTarget: r.log_target ?? undefined,
    datePrecision: r.date_precision ?? 'full',
    note: r.note ?? '',
    fav: !!r.fav,
    alerts: r.alerts ?? [],
    links: r.links ?? [],
  };
}

export function memoryToRow(m: Memory, userId: string) {
  return {
    id: m.id,
    user_id: userId,
    type: m.type,
    name: m.name,
    emoji: m.emoji,
    origin_date: dateCol(m.originDate),   // DATE — NULL for life-log containers, never ""
    year_unknown: m.yearUnknown,
    entries: m.entries,
    log_kind: m.logKind ?? 'count',
    log_preset: m.logPreset ?? null,
    log_target: m.logTarget ?? null,
    date_precision: m.datePrecision ?? 'full',
    note: m.note,
    alerts: m.alerts,
    links: m.links ?? [],
    fav: m.fav,
  };
}

// ---- Prefs ----------------------------------------------------------------
export function rowToPrefs(r: any): UserPrefs {
  const h = r.holidays ?? {};
  return {
    quotePref: r.quote_pref ?? 'motivational',
    timezone: r.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    location: r.location ?? '',
    displayName: r.display_name ?? '',
    onboarded: !!r.onboarded,
    theme: r.theme === 'light' ? 'light' : 'dark',
    holidays: {
      enabled: !!h.enabled,
      shown: h.shown ?? {},
      fav: h.fav ?? {},
      reminders: h.reminders ?? {},
    },
    isSuperuser: !!r.is_superuser,
  };
}

export function prefsToRow(p: UserPrefs, userId: string) {
  return {
    user_id: userId,
    quote_pref: p.quotePref,
    timezone: p.timezone,
    location: p.location,
    display_name: p.displayName,
    onboarded: p.onboarded,
    theme: p.theme,
    holidays: p.holidays,
    updated_at: new Date().toISOString(),
  };
}

// ---- Reads / writes -------------------------------------------------------
export interface CloudSnapshot {
  events: Event[];
  goals: Goal[];
  memories: Memory[];
  goalAttempts: GoalAttempt[];
  prefs: UserPrefs | null; // null => no prefs row => brand-new (not onboarded) user
}

export async function fetchAll(userId: string): Promise<CloudSnapshot> {
  // goal_attempts has no user_id column — RLS scopes it to the user's profiles,
  // so an unfiltered select returns only their own rows.
  const [ev, go, me, ga, pr] = await Promise.all([
    supabase.from('events').select('*').eq('user_id', userId),
    supabase.from('goals').select('*').eq('user_id', userId),
    supabase.from('memories').select('*').eq('user_id', userId),
    supabase.from('goal_attempts').select('*'),
    supabase.from('prefs').select('*').eq('user_id', userId).maybeSingle(),
  ]);
  if (ev.error) throw ev.error;
  if (go.error) throw go.error;
  if (me.error) throw me.error;
  if (ga.error) throw ga.error;
  if (pr.error) throw pr.error;
  return {
    events: (ev.data ?? []).map(rowToEvent),
    goals: (go.data ?? []).map(rowToGoal),
    memories: (me.data ?? []).map(rowToMemory),
    goalAttempts: (ga.data ?? []).map(rowToGoalAttempt),
    prefs: pr.data ? rowToPrefs(pr.data) : null,
  };
}

// The current user's PRIMARY profile id (needed to write goal_attempts). Tries a
// user_id-owned profile first, then a profile whose id IS the auth user id.
// Returns null on error/none (attempt writes are then gated until it resolves).
export async function fetchPrimaryProfileId(userId: string): Promise<string | null> {
  try {
    const byOwner = await supabase.from('profiles').select('id').eq('user_id', userId).limit(1).maybeSingle();
    if (!byOwner.error && byOwner.data?.id) return byOwner.data.id as string;
  } catch { /* fall through */ }
  try {
    const byId = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (!byId.error && byId.data?.id) return byId.data.id as string;
  } catch { /* fall through */ }
  return null;
}

export type CloudTable = 'events' | 'goals' | 'memories' | 'goal_attempts';

export async function dbUpsert(table: CloudTable, row: any): Promise<void> {
  const { error } = await supabase.from(table).upsert(row);
  if (error) throw error;
}

export async function dbDelete(table: CloudTable, id: string, userId: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

// Delete by id only (for tables without a user_id column, e.g. goal_attempts —
// RLS restricts to the caller's own rows via profile ownership).
export async function dbDeleteById(table: CloudTable, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

export async function dbUpsertPrefs(row: any): Promise<void> {
  const { error } = await supabase.from('prefs').upsert(row, { onConflict: 'user_id' });
  if (error) throw error;
}
