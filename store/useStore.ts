import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Guards against overlapping flushes.
let flushing = false;

function rowForUpsert(s: TempoStore, table: CloudTable, id: string, uid: string) {
  if (table === 'events') { const e = s.events.find(x => x.id === id); return e ? eventToRow(e, uid) : null; }
  if (table === 'goals')  { const g = s.goals.find(x => x.id === id);  return g ? goalToRow(g, uid) : null; }
  const m = s.memories.find(x => x.id === id); return m ? memoryToRow(m, uid) : null;
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
        void get().flushOutbox();
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
            if (get().outbox.length > 0) {
              // Still-pending writes (offline): keep local cache, don't overwrite with cloud.
              set({ loading: false, ready: true });
              return;
            }
            const snap = await fetchAll(uid);
            set({
              events: snap.events, goals: snap.goals, memories: snap.memories,
              prefs: snap.prefs ?? DEFAULT_PREFS,
              prefsExists: snap.prefs !== null,
              loading: false, ready: true,
            });
          } catch {
            // Offline / error: keep whatever cache we have.
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
          const uid = get().userId;
          if (!uid || flushing) return;
          const batch = get().outbox;
          if (!batch.length) return;
          flushing = true;
          const failed: SyncOp[] = [];
          try {
            for (const op of batch) {
              try {
                if (op.kind === 'prefs') {
                  await dbUpsertPrefs(prefsToRow(get().prefs, uid));
                } else if (op.kind === 'upsert') {
                  const row = rowForUpsert(get(), op.table, op.id, uid);
                  if (row) await dbUpsert(op.table, row);
                } else {
                  await dbDelete(op.table, op.id, uid);
                }
              } catch {
                failed.push(op);
              }
            }
          } finally {
            flushing = false;
            // Preserve ops enqueued while we were flushing, plus any failures.
            set(s => ({ outbox: [...s.outbox.filter(o => !batch.includes(o)), ...failed] }));
          }
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
