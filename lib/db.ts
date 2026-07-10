import { supabase } from './supabase';
import { Event, Goal, Memory, UserPrefs, LogEntry } from '../store/types';
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
    created_at: tsFromDate(g.created),
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
  prefs: UserPrefs | null; // null => no prefs row => brand-new (not onboarded) user
}

export async function fetchAll(userId: string): Promise<CloudSnapshot> {
  const [ev, go, me, pr] = await Promise.all([
    supabase.from('events').select('*').eq('user_id', userId),
    supabase.from('goals').select('*').eq('user_id', userId),
    supabase.from('memories').select('*').eq('user_id', userId),
    supabase.from('prefs').select('*').eq('user_id', userId).maybeSingle(),
  ]);
  if (ev.error) throw ev.error;
  if (go.error) throw go.error;
  if (me.error) throw me.error;
  if (pr.error) throw pr.error;
  return {
    events: (ev.data ?? []).map(rowToEvent),
    goals: (go.data ?? []).map(rowToGoal),
    memories: (me.data ?? []).map(rowToMemory),
    prefs: pr.data ? rowToPrefs(pr.data) : null,
  };
}

export type CloudTable = 'events' | 'goals' | 'memories';

export async function dbUpsert(table: CloudTable, row: any): Promise<void> {
  const { error } = await supabase.from(table).upsert(row);
  if (error) throw error;
}

export async function dbDelete(table: CloudTable, id: string, userId: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function dbUpsertPrefs(row: any): Promise<void> {
  const { error } = await supabase.from('prefs').upsert(row, { onConflict: 'user_id' });
  if (error) throw error;
}
