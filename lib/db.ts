import { supabase } from './supabase';
import { Event, Goal, Memory, UserPrefs, LogEntry } from '../store/types';

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
// ---------------------------------------------------------------------------

const datePart = (s: string) => s.slice(0, 10);
const naive = (s: string | null | undefined) => (s ? s.slice(0, 19) : null);

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
    recur: r.recur ?? null,
    alerts: r.alerts ?? [],
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
    start: e.start,
    end: e.end,
    fav: e.fav,
    recur: e.recur,
    alerts: e.alerts,
    created_at: `${e.created}T00:00:00Z`,
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
    alerts: r.alerts ?? [],
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
    target_date: `${g.date}T00:00:00Z`,
    fav: g.fav,
    alerts: g.alerts,
    created_at: `${g.created}T00:00:00Z`,
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
    note: r.note ?? '',
    fav: !!r.fav,
    alerts: r.alerts ?? [],
  };
}

export function memoryToRow(m: Memory, userId: string) {
  return {
    id: m.id,
    user_id: userId,
    type: m.type,
    name: m.name,
    emoji: m.emoji,
    origin_date: m.originDate,
    year_unknown: m.yearUnknown,
    note: m.note,
    entries: m.entries,
    alerts: m.alerts,
    fav: m.fav,
  };
}

// ---- Prefs ----------------------------------------------------------------
export function rowToPrefs(r: any): UserPrefs {
  return {
    quotePref: r.quote_pref ?? 'motivational',
    timezone: r.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    location: r.location ?? '',
    displayName: r.display_name ?? '',
    onboarded: !!r.onboarded,
    theme: r.theme === 'light' ? 'light' : 'dark',
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
