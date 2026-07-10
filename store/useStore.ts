import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, addDays } from 'date-fns';
import { Event, Goal, Memory, UserPrefs, Alert, Recurrence } from './types';
import { DEFAULT_HOLIDAY_IDS } from '../constants/holidays';
import {
  fetchAll, dbUpsert, dbDelete, dbUpsertPrefs,
  eventToRow, goalToRow, memoryToRow, prefsToRow, uuid, CloudTable,
} from '../lib/db';
import { fetchUniverses, setUniverseOverlay, UniverseRow } from '../lib/universes';
import { currentPeriodKey } from '../utils/recurring';

const today = () => format(new Date(), 'yyyy-MM-dd');

const DEFAULT_PREFS: UserPrefs = {
  quotePref: 'motivational',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  location: '',
  displayName: '',
  onboarded: false,
  theme: 'dark',
  holidays: { enabled: false, shown: {}, fav: {}, reminders: {} },
  isSuperuser: false,
};

// A queued write. Upserts reference the row by id and re-read the latest state
// at flush time (last-write-wins); deletes carry only the id.
type SyncOp =
  | { kind: 'upsert'; table: CloudTable; id: string }
  | { kind: 'delete'; table: CloudTable; id: string }
  | { kind: 'prefs' };

interface TempoStore {
  events: Event[];
  goals: Goal[];
  memories: Memory[];
  prefs: UserPrefs;
  userId: string | null;
  prefsExists: boolean;   // did a prefs row exist in the cloud? (false => new user)
  loading: boolean;       // a cloud fetch is in flight
  ready: boolean;         // first load resolved for the current user (cache or cloud)
  outbox: SyncOp[];       // pending writes awaiting the cloud
  remoteUniverses: UniverseRow[]; // read-only universe overlay (persisted; see lib/universes)

  loadForUser: (userId: string) => Promise<void>;
  clearForSignOut: () => void;
  flushOutbox: () => Promise<void>;
  loadUniverses: () => Promise<void>;

  addEvent: (e: Omit<Event, 'id' | 'created'>) => string;
  updateEvent: (id: string, patch: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
  toggleEventFav: (id: string) => void;
  addGoal: (g: Omit<Goal, 'id' | 'created' | 'current'>) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  nudgeGoal: (id: string, dir: 1 | -1) => void;
  incrementGoalPeriod: (id: string, dir: 1 | -1) => void;
  setGoalProgress: (id: string, value: number) => void;
  toggleGoalFav: (id: string) => void;
  addMemory: (m: Omit<Memory, 'id'>) => string;
  updateMemory: (id: string, patch: Partial<Memory>) => void;
  deleteMemory: (id: string) => void;
  toggleMemoryFav: (id: string) => void;
  addLogEntry: (memId: string, entry: { date: string; note: string; item?: string; datePrecision?: import('./types').DatePrecision; links?: import('./types').Link[]; alerts?: import('./types').Alert[] }) => void;
  updateLogEntry: (memId: string, index: number, patch: Partial<import('./types').LogEntry>) => void;
  toggleLogEntryFav: (memId: string, index: number) => void;
  deleteLogEntry: (memId: string, index: number) => void;
  // Universe admin rename-safety: rename this user's matching logged items.
  renameLogItems: (renames: { preset: string; from: string; to: string }[]) => number;
  // Cross-type: a standalone event <-> a life-log entry (single source of truth).
  attachEventToLog: (eventId: string, logId: string, entry: import('./types').LogEntry) => void;
  detachEntryToEvent: (memId: string, index: number) => string | null;
  // Cross-type conversion. Events and memories are different tables, so a
  // cross-table convert DELETEs the old row and CREATEs the new one (id preserved).
  convertEventToMemory: (id: string, targetType: Memory['type']) => void;
  convertMemoryToEvent: (id: string) => void;
  convertMemoryType: (id: string, targetType: Memory['type']) => void;
  updatePrefs: (patch: Partial<UserPrefs>) => void;
  setHolidaysEnabled: (on: boolean) => void;
  setHolidayShown: (id: string, shown: boolean) => void;
  setHolidayFav: (id: string, fav: boolean) => void;
  setHolidayReminder: (id: string, alerts: Alert[]) => void;
}

// Sync tracing — DEV ONLY. Every [sync] enqueue → flush → POST line routes through
// slog(), so gating on __DEV__ keeps them during local development but silences them
// in the production web build (__DEV__ === false), leaving the deployed console clean.
// (Genuine failures still surface via console.error below — those are not gated.)
const SYNC_DEBUG = typeof __DEV__ !== 'undefined' && __DEV__;
const slog = (...args: any[]) => { if (SYNC_DEBUG) console.log('[sync]', ...args); };

// Per-op in-pass retry with backoff (transient failures like a not-yet-ready session).
const MAX_TRIES = 3;
const BACKOFF_MS = [400, 1200];
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// Flush controller.
//  - `flushing` is the source of truth for "a flush loop is active". It's a
//    boolean set before the loop and cleared in finally; unlike a promise
//    assignment it can't be clobbered when an empty pass completes synchronously.
//  - `flushDirty` records that ops were enqueued WHILE a flush was running, so the
//    loop runs a follow-up pass instead of finishing on the stale snapshot it
//    started with (the empty-start bug).
//  - `flushPromise` is only what awaiting callers block on.
let flushing = false;
let flushDirty = false;
let flushPromise: Promise<void> | null = null;

function opDesc(op: SyncOp): string {
  return op.kind === 'prefs' ? 'prefs' : `${op.kind}:${op.table}:${op.id}`;
}

function rowForUpsert(s: TempoStore, table: CloudTable, id: string, uid: string) {
  if (table === 'events') { const e = s.events.find(x => x.id === id); return e ? eventToRow(e, uid) : null; }
  if (table === 'goals')  { const g = s.goals.find(x => x.id === id);  return g ? goalToRow(g, uid) : null; }
  const m = s.memories.find(x => x.id === id); return m ? memoryToRow(m, uid) : null;
}

const pendingUpsertIds = (outbox: SyncOp[], table: CloudTable) =>
  new Set(outbox.filter((o): o is Extract<SyncOp, { kind: 'upsert' }> => o.kind === 'upsert' && o.table === table).map(o => o.id));
const pendingDeleteIds = (outbox: SyncOp[], table: CloudTable) =>
  new Set(outbox.filter((o): o is Extract<SyncOp, { kind: 'delete' }> => o.kind === 'delete' && o.table === table).map(o => o.id));

// Cloud is source of truth, but keep local items that still have a pending upsert
// (unsynced creates/edits) and drop items with a pending delete — so an in-flight
// refetch can never clobber work that hasn't reached Supabase yet.
function mergePending<T extends { id: string }>(cloud: T[], local: T[], pendUp: Set<string>, pendDel: Set<string>): T[] {
  const byId = new Map(cloud.map(x => [x.id, x] as const));
  for (const id of pendUp) { const loc = local.find(x => x.id === id); if (loc) byId.set(id, loc); }
  for (const id of pendDel) byId.delete(id);
  return Array.from(byId.values());
}

export const useStore = create<TempoStore>()(
  persist(
    (set, get) => {
      // Enqueue a write (deduped by table+id; a delete supersedes prior upserts)
      // and opportunistically push. If offline, it stays queued for later.
      const enqueue = (op: SyncOp) => {
        const filtered = get().outbox.filter(o => {
          if (o.kind === 'prefs') return op.kind !== 'prefs';
          if (op.kind === 'prefs') return true;
          return !(o.table === op.table && o.id === op.id);
        });
        set({ outbox: [...filtered, op] });
        slog(`enqueue ${opDesc(op)} — outbox now ${get().outbox.length}`);
        void get().flushOutbox();
      };

      // Push one op to Supabase. Returns 'ok' (remove from outbox), 'fail' (retry
      // later), or 'skip' (item no longer in local state — keep the op, no write).
      const processOp = async (op: SyncOp, uid: string): Promise<'ok' | 'fail' | 'skip'> => {
        try {
          if (op.kind === 'prefs') {
            slog('→ POST /rest/v1/prefs (upsert)');
            await dbUpsertPrefs(prefsToRow(get().prefs, uid));
          } else if (op.kind === 'upsert') {
            const row = rowForUpsert(get(), op.table, op.id, uid);
            if (!row) { slog(`skip ${opDesc(op)} (item not in local state)`); return 'skip'; }
            slog(`→ POST /rest/v1/${op.table} (upsert id=${op.id})`);
            await dbUpsert(op.table, row);
          } else {
            slog(`→ DELETE /rest/v1/${op.table} (id=${op.id})`);
            await dbDelete(op.table, op.id, uid);
          }
          slog(`✓ ${opDesc(op)} written`);
          return 'ok';
        } catch (e) {
          console.error(`[sync] ${opDesc(op)} failed:`, e);
          return 'fail';
        }
      };

      return {
        events: [], goals: [], memories: [], prefs: DEFAULT_PREFS,
        userId: null, prefsExists: false, loading: false, ready: false, outbox: [],
        remoteUniverses: [],

        // Fetch the universe overlay in ONE query and store + persist it. Never
        // blocks the UI and never surfaces errors: on failure/empty it keeps the
        // existing (persisted or empty) overlay, and resolution falls back to the
        // bundled constants. No effect on user data (memories/events/goals).
        loadUniverses: async () => {
          const rows = await fetchUniverses();
          if (rows.length) { setUniverseOverlay(rows); set({ remoteUniverses: rows }); }
        },

        loadForUser: async (uid) => {
          // Kick off the (non-blocking) universe overlay refresh for this session.
          void get().loadUniverses();
          const prev = get().userId;
          const sameUser = prev === uid;
          if (prev && !sameUser) {
            // User switch: never let User B see User A's cache.
            set({ events: [], goals: [], memories: [], prefs: DEFAULT_PREFS, prefsExists: false, outbox: [] });
          }
          // Same user with a warm cache => show instantly and refresh in background.
          set({ userId: uid, loading: true, ready: sameUser });
          try {
            await get().flushOutbox();                 // push local intent first (LWW)
            const snap = await fetchAll(uid);
            // Merge cloud over local, but preserve any items whose writes are still
            // queued (pending upserts) and honour pending deletes — so a create made
            // while this fetch was in flight can't be clobbered/dropped.
            const ob = get().outbox;
            const prefsPending = ob.some(o => o.kind === 'prefs');
            set({
              events:   mergePending(snap.events,   get().events,   pendingUpsertIds(ob, 'events'),   pendingDeleteIds(ob, 'events')),
              goals:    mergePending(snap.goals,    get().goals,    pendingUpsertIds(ob, 'goals'),    pendingDeleteIds(ob, 'goals')),
              memories: mergePending(snap.memories, get().memories, pendingUpsertIds(ob, 'memories'), pendingDeleteIds(ob, 'memories')),
              prefs: prefsPending ? get().prefs : (snap.prefs ?? DEFAULT_PREFS),
              prefsExists: snap.prefs !== null || prefsPending,
              loading: false, ready: true,
            });
          } catch (e) {
            // Offline / error: keep whatever cache we have (writes stay queued).
            slog('loadForUser fetch failed (offline?):', e);
            set({ loading: false, ready: true });
          }
        },

        clearForSignOut: () => {
          set({
            events: [], goals: [], memories: [], prefs: DEFAULT_PREFS,
            userId: null, prefsExists: false, loading: false, ready: false, outbox: [],
          });
        },

        flushOutbox: async () => {
          if (!get().userId) { slog(`flushOutbox: SKIPPED — no userId yet (${get().outbox.length} op(s) queued, will flush on load)`); return; }
          // A flush is already active: mark dirty so it runs a FOLLOW-UP pass for
          // whatever we just enqueued, and await the in-flight one. We don't start
          // a second loop — the dirty flag guarantees our op gets a pass.
          if (flushing) {
            flushDirty = true;
            slog(`flushOutbox: already running — marked dirty (${get().outbox.length} queued)`);
            return flushPromise ?? Promise.resolve();
          }

          flushing = true;
          slog(`flushOutbox: starting — ${get().outbox.length} op(s) queued`);
          flushPromise = (async () => {
            try {
              // Re-snapshot the LIVE outbox each pass. Loop again when new ops
              // arrived mid-flush (flushDirty) or while we're still draining and
              // making progress. Bounded: a pass with no progress and nothing new
              // stops, so we never spin on persistent failures / offline.
              for (;;) {
                flushDirty = false;                       // clear before the pass; enqueues during it re-set this
                const uid = get().userId;
                const batch = uid ? get().outbox.slice() : [];
                let progressed = false;

                if (batch.length > 0) {
                  slog(`flush pass — ${batch.length} op(s): ${batch.map(opDesc).join(', ')}`);
                  const done = new Set<SyncOp>();
                  for (const op of batch) {
                    let res: 'ok' | 'fail' | 'skip' = 'fail';
                    for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
                      res = await processOp(op, uid!);
                      if (res !== 'fail') break;
                      if (attempt < MAX_TRIES - 1) await sleep(BACKOFF_MS[attempt]);
                    }
                    if (res === 'ok') { done.add(op); progressed = true; }
                    // 'fail' and 'skip' stay in the outbox to retry later — never dropped.
                  }
                  set(s => ({ outbox: s.outbox.filter(o => !done.has(o)) }));
                  slog(`flush pass done — sent ${done.size}, remaining ${get().outbox.length}`);
                }

                // Decide whether to run another pass.
                if (flushDirty) { slog(`rerun triggered — ${get().outbox.length} queued`); continue; }
                if (progressed && get().outbox.length > 0) continue;  // keep draining
                break;                                                 // empty, or stuck (no progress, nothing new)
              }
            } finally {
              flushing = false;
              flushPromise = null;
            }
          })();
          return flushPromise;
        },

        addEvent: (e) => {
          const id = uuid();
          set(s => ({ events: [...s.events, { ...e, id, created: today() }] }));
          enqueue({ kind: 'upsert', table: 'events', id });
          return id;
        },
        updateEvent: (id, patch) => {
          set(s => ({ events: s.events.map(e => e.id === id ? { ...e, ...patch } : e) }));
          enqueue({ kind: 'upsert', table: 'events', id });
        },
        deleteEvent: (id) => {
          set(s => ({ events: s.events.filter(e => e.id !== id) }));
          enqueue({ kind: 'delete', table: 'events', id });
        },
        toggleEventFav: (id) => {
          set(s => ({ events: s.events.map(e => e.id === id ? { ...e, fav: !e.fav } : e) }));
          enqueue({ kind: 'upsert', table: 'events', id });
        },
        addGoal: (g) => {
          const id = uuid();
          set(s => ({ goals: [...s.goals, { ...g, id, created: today(), current: 0 }] }));
          enqueue({ kind: 'upsert', table: 'goals', id });
        },
        updateGoal: (id, patch) => {
          set(s => ({ goals: s.goals.map(g => g.id === id ? { ...g, ...patch } : g) }));
          enqueue({ kind: 'upsert', table: 'goals', id });
        },
        deleteGoal: (id) => {
          set(s => ({ goals: s.goals.filter(g => g.id !== id) }));
          enqueue({ kind: 'delete', table: 'goals', id });
        },
        nudgeGoal: (id, dir) => {
          set(s => ({ goals: s.goals.map(g => g.id !== id ? g : { ...g, current: Math.max(0, Math.min(g.target, g.current + dir * (g.step || 1))) }) }));
          enqueue({ kind: 'upsert', table: 'goals', id });
        },
        // MANUAL recurring: tap the CURRENT period's counter up/down. Records live
        // per-period in manualPeriods, so a rolled-over period just starts fresh
        // (no stored record yet → 0) — no reset bookkeeping, drift-proof streaks.
        incrementGoalPeriod: (id, dir) => {
          set(s => ({ goals: s.goals.map(g => {
            if (g.id !== id) return g;
            const kind = g.periodKind ?? 'week';
            const key = currentPeriodKey(kind);
            const target = (g.periodTarget ?? 1) > 0 ? (g.periodTarget ?? 1) : 1;
            const list = [...(g.manualPeriods ?? [])];
            const i = list.findIndex(r => r.key === key);
            const nextN = Math.max(0, Math.min(target, (i >= 0 ? list[i].n : 0) + dir));
            if (i >= 0) list[i] = { key, n: nextN };
            else if (nextN > 0) list.push({ key, n: nextN });
            return { ...g, manualPeriods: list };
          }) }));
          enqueue({ kind: 'upsert', table: 'goals', id });
        },
        setGoalProgress: (id, value) => {
          set(s => ({ goals: s.goals.map(g => g.id === id ? { ...g, current: Math.min(g.target, Math.max(0, value)) } : g) }));
          enqueue({ kind: 'upsert', table: 'goals', id });
        },
        toggleGoalFav: (id) => {
          set(s => ({ goals: s.goals.map(g => g.id === id ? { ...g, fav: !g.fav } : g) }));
          enqueue({ kind: 'upsert', table: 'goals', id });
        },
        addMemory: (m) => {
          const id = uuid();
          set(s => ({ memories: [...s.memories, { ...m, id }] }));
          enqueue({ kind: 'upsert', table: 'memories', id });
          return id;
        },
        updateMemory: (id, patch) => {
          set(s => ({ memories: s.memories.map(m => m.id === id ? { ...m, ...patch } : m) }));
          enqueue({ kind: 'upsert', table: 'memories', id });
        },
        deleteMemory: (id) => {
          set(s => ({ memories: s.memories.filter(m => m.id !== id) }));
          enqueue({ kind: 'delete', table: 'memories', id });
        },
        toggleMemoryFav: (id) => {
          set(s => ({ memories: s.memories.map(m => m.id === id ? { ...m, fav: !m.fav } : m) }));
          enqueue({ kind: 'upsert', table: 'memories', id });
        },
        addLogEntry: (memId, entry) => {
          set(s => ({ memories: s.memories.map(m => m.id === memId ? { ...m, entries: [...m.entries, entry] } : m) }));
          enqueue({ kind: 'upsert', table: 'memories', id: memId });
        },
        // Rename-safety for the universe admin: when a superuser renames items in a
        // universe, rename THIS user's matching logged entries (scoped to logs of
        // that preset, exact item match) so their coverage doesn't drop. Touches
        // only the current user's own memories; enqueues one upsert per changed log.
        renameLogItems: (renames) => {
          if (!renames.length) return 0;
          const byPreset = new Map<string, Map<string, string>>();
          for (const r of renames) {
            if (!byPreset.has(r.preset)) byPreset.set(r.preset, new Map());
            byPreset.get(r.preset)!.set(r.from, r.to);
          }
          let changed = 0;
          const touchedIds: string[] = [];
          set(s => ({
            memories: s.memories.map(m => {
              const map = m.logPreset ? byPreset.get(m.logPreset) : undefined;
              if (!map) return m;
              let touched = false;
              const entries = m.entries.map(e => {
                if (e.item && map.has(e.item)) { touched = true; changed++; return { ...e, item: map.get(e.item)! }; }
                return e;
              });
              if (!touched) return m;
              touchedIds.push(m.id);
              return { ...m, entries };
            }),
          }));
          for (const id of touchedIds) enqueue({ kind: 'upsert', table: 'memories', id });
          return changed;
        },
        updateLogEntry: (memId, index, patch) => {
          set(s => ({ memories: s.memories.map(m => m.id !== memId ? m
            : { ...m, entries: m.entries.map((e, i) => i === index ? { ...e, ...patch } : e) }) }));
          enqueue({ kind: 'upsert', table: 'memories', id: memId });
        },
        // Toggle an upcoming entry's fav flag. Persists inside the memory's
        // entries jsonb (round-trips wholesale, no schema change) via a memory upsert.
        toggleLogEntryFav: (memId, index) => {
          const cur = !!get().memories.find(m => m.id === memId)?.entries[index]?.fav;
          get().updateLogEntry(memId, index, { fav: !cur });
        },
        deleteLogEntry: (memId, index) => {
          set(s => ({ memories: s.memories.map(m => m.id !== memId ? m
            : { ...m, entries: m.entries.filter((_, i) => i !== index) }) }));
          enqueue({ kind: 'upsert', table: 'memories', id: memId });
        },
        // Move a standalone event INTO a life log as one entry (delete the event,
        // append the entry). The entry is now the single source of truth.
        attachEventToLog: (eventId, logId, entry) => {
          set(s => ({
            events: s.events.filter(e => e.id !== eventId),
            memories: s.memories.map(m => m.id === logId ? { ...m, entries: [...m.entries, entry] } : m),
          }));
          enqueue({ kind: 'delete', table: 'events', id: eventId });
          enqueue({ kind: 'upsert', table: 'memories', id: logId });
        },
        // Pull a life-log entry back OUT into a standalone event (remove the entry,
        // create an event from it). Preserves its date/name/note.
        detachEntryToEvent: (memId, index) => {
          const m = get().memories.find(x => x.id === memId);
          const e = m?.entries[index];
          if (!m || !e) { slog(`detach: SKIPPED — entry not found (mem=${memId} idx=${index})`); return null; }
          // Preserve the entry's label/date/note. Works identically for COUNT and
          // COLLECTION entries: the event name is the entry's item (e.g. the country)
          // or, if absent, the log name. Fall back to a valid upcoming date so the
          // recreated event is never dateless (which would drop it out of Countdowns).
          const name = (e.item && e.item.trim()) || m.name;
          const d = e.date || format(addDays(new Date(), 30), 'yyyy-MM-dd');
          // Create the event through the SAME proven primitive as "New Countdown"
          // (guarantees the events upsert is enqueued for every entry type), THEN
          // drop the entry from the log. Two writes, exactly one per table.
          const id = get().addEvent({
            name, emoji: m.emoji, cat: 'parties',
            allDay: true, start: `${d}T00:00:00`, end: null, date: d,
            fav: false, note: e.note ?? '', recur: null, alerts: e.alerts ?? [], links: e.links ?? [],
          });
          slog(`detach: created event ${id} ("${name}") from ${e.item ? 'collection' : 'count'} entry; removing entry`);
          // The log is KEPT even if now empty, so re-attaching later finds it.
          get().deleteLogEntry(memId, index);
          return id;
        },
        convertEventToMemory: (id, targetType) => {
          const e = get().events.find(x => x.id === id);
          if (!e) return;
          const originDate = (e.start || '').slice(0, 10) || today();
          const memory: Memory = {
            id: e.id,                    // preserve id across tables
            type: targetType,
            name: e.name,
            emoji: e.emoji,
            originDate,
            yearUnknown: false,
            // A life log keeps the event's date as its first entry; other memory
            // types (birthday/anniversary/memorial) start with no entries.
            entries: targetType === 'lifelog' ? [{ date: originDate, note: '' }] : [],
            logKind: targetType === 'lifelog' ? 'count' : undefined,
            note: e.note ?? '',
            fav: e.fav,
            alerts: e.alerts ?? [],
            links: e.links ?? [],
          };
          set(s => ({
            events: s.events.filter(x => x.id !== id),
            memories: [...s.memories, memory],
          }));
          enqueue({ kind: 'delete', table: 'events', id });
          enqueue({ kind: 'upsert', table: 'memories', id });
        },
        convertMemoryToEvent: (id) => {
          const m = get().memories.find(x => x.id === id);
          if (!m) return;
          // Recurring memory origins (birthday/anniversary/memorial) become yearly
          // events; a life log becomes a one-time event.
          const recur: Recurrence | null =
            (m.type === 'birthday' || m.type === 'anniversary' || m.type === 'memorial')
              ? { freq: 'yearly', dow: [], endType: 'never' }
              : null;
          // Life-log containers have no date; fall back to today when converting.
          const od = m.originDate || today();
          const event: Event = {
            id: m.id,
            name: m.name,
            emoji: m.emoji,
            cat: 'parties',
            allDay: true,
            start: `${od}T00:00:00`,
            end: null,
            date: od,
            created: today(),
            fav: m.fav,
            note: m.note ?? '',
            recur,
            alerts: m.alerts ?? [],
            links: m.links ?? [],
          };
          set(s => ({
            memories: s.memories.filter(x => x.id !== id),
            events: [...s.events, event],
          }));
          enqueue({ kind: 'delete', table: 'memories', id });
          enqueue({ kind: 'upsert', table: 'events', id });
        },
        convertMemoryType: (id, targetType) => {
          set(s => ({ memories: s.memories.map(m => {
            if (m.id !== id) return m;
            const next: Memory = { ...m, type: targetType };
            if (targetType === 'lifelog') {
              next.logKind = m.logKind ?? 'count';
            } else if (!next.originDate) {
              // Converting a life-log container (no date) → a dated type: seed today.
              next.originDate = today();
            }
            return next;
          }) }));
          enqueue({ kind: 'upsert', table: 'memories', id });
        },
        updatePrefs: (patch) => {
          set(s => ({ prefs: { ...s.prefs, ...patch }, prefsExists: true }));
          enqueue({ kind: 'prefs' });
        },
        // ---- Holidays (visibility layer; the library itself lives in code) ----
        setHolidaysEnabled: (on) => {
          set(s => {
            const h = s.prefs.holidays;
            // First time turning it on with nothing chosen yet: seed high-signal
            // defaults so the countdown isn't empty (no religious auto-enable).
            const seed = on && Object.keys(h.shown ?? {}).length === 0;
            const shown = seed
              ? Object.fromEntries(DEFAULT_HOLIDAY_IDS.map(id => [id, true]))
              : (h.shown ?? {});
            return { prefs: { ...s.prefs, holidays: { ...h, enabled: on, shown } }, prefsExists: true };
          });
          enqueue({ kind: 'prefs' });
        },
        setHolidayShown: (id, shown) => {
          set(s => {
            const h = s.prefs.holidays;
            return { prefs: { ...s.prefs, holidays: { ...h, shown: { ...h.shown, [id]: shown } } }, prefsExists: true };
          });
          enqueue({ kind: 'prefs' });
        },
        setHolidayFav: (id, fav) => {
          set(s => {
            const h = s.prefs.holidays;
            return { prefs: { ...s.prefs, holidays: { ...h, fav: { ...(h.fav ?? {}), [id]: fav } } }, prefsExists: true };
          });
          enqueue({ kind: 'prefs' });
        },
        setHolidayReminder: (id, alerts) => {
          set(s => {
            const h = s.prefs.holidays;
            return { prefs: { ...s.prefs, holidays: { ...h, reminders: { ...(h.reminders ?? {}), [id]: alerts } } }, prefsExists: true };
          });
          enqueue({ kind: 'prefs' });
        },
      };
    },
    {
      name: 'tempo-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      // Persist durable data + the offline queue + the universe overlay (so a cold
      // start resolves offline); loading/ready are runtime.
      partialize: (s) => ({
        events: s.events, goals: s.goals, memories: s.memories,
        prefs: s.prefs, userId: s.userId, prefsExists: s.prefsExists, outbox: s.outbox,
        remoteUniverses: s.remoteUniverses,
      }),
      // On cold start, push any persisted overlay into the module-level resolver
      // BEFORE first render so offline resolution matches the last known cloud data.
      onRehydrateStorage: () => (state) => {
        if (state?.remoteUniverses?.length) setUniverseOverlay(state.remoteUniverses);
      },
      // v1 (local seed era) -> v2 (cloud). Drop any locally-seeded cache so stale
      // demo data never lingers; the cloud repopulates on next login.
      // v2 -> v3: backfill prefs.holidays so older caches don't read undefined.
      migrate: (_persisted: any, version: number) => {
        if (version < 2) {
          return {
            events: [], goals: [], memories: [], prefs: DEFAULT_PREFS,
            userId: null, prefsExists: false, outbox: [],
          };
        }
        const p = _persisted ?? {};
        return {
          ...p,
          prefs: {
            ...DEFAULT_PREFS,
            ...(p.prefs ?? {}),
            holidays: { ...DEFAULT_PREFS.holidays, ...(p.prefs?.holidays ?? {}) },
          },
        };
      },
    }
  )
);
