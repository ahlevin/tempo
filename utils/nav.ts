import { router } from 'expo-router';
import type { Memory } from '../store/types';

// Single source of truth for "tap an item → open its READ-ONLY detail view".
// Every surface (cards, hero, favorites) routes through these so the tap target
// can never drift back to an edit screen. The detail view carries its own Edit
// button that opens the edit form.
export const openEventDetail   = (id: string) => router.push({ pathname: '/modals/detail-event',   params: { id } });
export const openGoalDetail    = (id: string) => router.push({ pathname: '/modals/detail-goal',    params: { id } });
export const openHolidayDetail = (id: string) => router.push({ pathname: '/modals/holiday-detail', params: { id } });

// An ATTACHED upcoming life-log entry (surfaced on Countdowns). Read-only detail
// first; its Edit button opens the entry editor (log-entry?id=<memId>&edit=<index>).
export const openLogEntryDetail = (memId: string, index: number) =>
  router.push({ pathname: '/modals/detail-logentry', params: { id: memId, edit: String(index) } });

// Life logs have a richer detail (entries + add); birthday/anniversary/memorial
// use the generic memory detail.
export const openMemoryDetail = (m: Pick<Memory, 'id' | 'type'>) =>
  router.push({
    pathname: m.type === 'lifelog' ? '/modals/lifelog-detail' : '/modals/detail-memory',
    params: { id: m.id },
  });
