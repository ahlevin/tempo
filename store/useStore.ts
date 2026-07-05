import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { format } from 'date-fns';
import { Event, Goal, Memory, UserPrefs } from './types';
import {
  fetchAll, dbUpsert, dbDelete, dbUpsertPrefs,
  eventToRow, goalToRow, memoryToRow, prefsToRow, uuid, CloudTable,
} from '../lib/db';

const today = () => format(new Date(), 'yyyy-MM-dd');

const DEFAULT_PREFS: UserPrefs = {
  quotePref: 'motivational',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  location: '',
  displayName: '',
  onboarded: false,
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

  loadForUser: (userId: string) => Promise<void>;
  clearForSignOut: () => void;
  flushOutbox: () => Promise<void>;

  addEvent: (e: Omit<Event, 'id' | 'created'>) => void;
  updateEvent: (id: string, patch: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
  toggleEventFav: (id: string) => void;
  addGoal: (g: Omit<Goal, 'id' | 'created' | 'current'>) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  nudgeGoal: (id: string, dir: 1 | -1) => void;
  setGoalProgress: (id: string, value: number) => void;
  toggleGoalFav: (id: string) => void;
  addMemory: (m: Omit<Memory, 'id'>) => void;
  updateMemory: (id: string, patch: Partial<Memory>) => void;
  deleteMemory: (id: string) => void;
  addLogEntry: (memId: string, entry: { date: string; note: string }) => void;
  updatePrefs: (patch: Partial<UserPrefs>) => void;
}

// Sync tracing. Enabled in dev on every platform AND always on web (so we can
// watch enqueue → flush → POST in the browser console, since the web build runs
// with __DEV__ === false). Flip SYNC_DEBUG to remove later.
const SYNC_DEBUG = (typeof __DEV__ !== 'undefined' && __DEV__) || Platform.OS === 'web';
const slog = (...args: any[]) => { if (SYNC_DEBUG) console.log('[sync]', ...args); };

// Per-op in-pass retry with backoff (transient failures like a not-yet-ready session).
const MAX_TRIES = 3;
const BACKOFF_MS = [400, 1200];
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// A single in-flight flush. Concurrent callers await THIS promise instead of
// no-oping, so no op is ever stranded; the flush loops until the outbox drains
// or a pass makes no progress.
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

        loadForUser: async (uid) => {
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
          // Coalesce concurrent callers onto the single in-flight flush. This is
          // what prevents stranding: an op enqueued mid-flush (e.g. the wizard's
          // addMemory right after updatePrefs) is picked up by a trailing pass
          // rather than being dropped by a no-op guard.
          if (flushPromise) { slog(`flushOutbox: already running (awaiting in-flight, ${get().outbox.length} queued)`); return flushPromise; }
          if (!get().userId) { slog(`flushOutbox: SKIPPED — no userId yet (${get().outbox.length} op(s) queued, will flush on load)`); return; }
          slog(`flushOutbox: starting — ${get().outbox.length} op(s) queued`);

          flushPromise = (async () => {
            try {
              // Loop while passes make progress and work remains. Bounded: a pass
              // that makes no progress (all failing / offline) breaks out so we
              // never spin — remaining ops wait for the next trigger.
              for (;;) {
                const uid = get().userId;
                const batch = get().outbox.slice();
                if (!uid || batch.length === 0) break;
                slog(`flush start — ${batch.length} op(s): ${batch.map(opDesc).join(', ')}`);

                const done = new Set<SyncOp>();
                let progressed = false;
                for (const op of batch) {
                  let res: 'ok' | 'fail' | 'skip' = 'fail';
                  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
                    res = await processOp(op, uid);
                    if (res !== 'fail') break;
                    if (attempt < MAX_TRIES - 1) await sleep(BACKOFF_MS[attempt]);
                  }
                  if (res === 'ok') { done.add(op); progressed = true; }
                  // 'fail' and 'skip' stay in the outbox to retry later — never dropped.
                }
                // Remove only succeeded ops (by reference); ops enqueued during the
                // pass are new references and survive to the next iteration.
                set(s => ({ outbox: s.outbox.filter(o => !done.has(o)) }));
                slog(`flush pass done — sent ${done.size}, remaining ${get().outbox.length}`);
                if (!progressed) break;
              }
            } finally {
              flushPromise = null;
            }
          })();
          return flushPromise;
        },

        addEvent: (e) => {
          const id = uuid();
          set(s => ({ events: [...s.events, { ...e, id, created: today() }] }));
          enqueue({ kind: 'upsert', table: 'events', id });
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
        },
        updateMemory: (id, patch) => {
          set(s => ({ memories: s.memories.map(m => m.id === id ? { ...m, ...patch } : m) }));
          enqueue({ kind: 'upsert', table: 'memories', id });
        },
        deleteMemory: (id) => {
          set(s => ({ memories: s.memories.filter(m => m.id !== id) }));
          enqueue({ kind: 'delete', table: 'memories', id });
        },
        addLogEntry: (memId, entry) => {
          set(s => ({ memories: s.memories.map(m => m.id === memId ? { ...m, entries: [...m.entries, entry] } : m) }));
          enqueue({ kind: 'upsert', table: 'memories', id: memId });
        },
        updatePrefs: (patch) => {
          set(s => ({ prefs: { ...s.prefs, ...patch }, prefsExists: true }));
          enqueue({ kind: 'prefs' });
        },
      };
    },
    {
      name: 'tempo-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      // Persist only durable data + the offline queue; loading/ready are runtime.
      partialize: (s) => ({
        events: s.events, goals: s.goals, memories: s.memories,
        prefs: s.prefs, userId: s.userId, prefsExists: s.prefsExists, outbox: s.outbox,
      }),
      // v1 (local seed era) -> v2 (cloud). Drop any locally-seeded cache so stale
      // demo data never lingers; the cloud repopulates on next login.
      migrate: (_persisted: any, version: number) => {
        if (version < 2) {
          return {
            events: [], goals: [], memories: [], prefs: DEFAULT_PREFS,
            userId: null, prefsExists: false, outbox: [],
          };
        }
        return _persisted;
      },
    }
  )
);
