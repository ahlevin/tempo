import { Memory, LogEntry } from '../store/types';
import { presetUniverse, getPreset } from '../constants/lifelogs';
import { daysUntil } from './dates';

// Shared life-log helpers (a life log is a container; dates live on entries).

export function isCollectionLog(m: Memory): boolean {
  // Authoritative: a log is a COLLECTION if its preset resolves to one — keying
  // off PRESET_BY_ID (which covers all 92 presets, original + expanded) instead
  // of trusting the stored logKind. This self-heals logs saved with a stale/wrong
  // logKind (e.g. an expanded-universe log that got 'count'), so they get the item
  // picker without recreation. Custom logs (no preset) fall back to logKind.
  if (m.logPreset && getPreset(m.logPreset)?.kind === 'collection') return true;
  return (m.logKind ?? 'count') === 'collection';
}

export function logUniverse(m: Memory): string[] | undefined {
  return presetUniverse(m.logPreset);
}

// For a collection, snap a free-typed label to the universe's canonical spelling
// ("france" → "France") when it matches; otherwise keep it as a label.
export function canonItem(universe: string[] | undefined, label: string): string {
  if (!universe) return label;
  return universe.find(u => u.toLowerCase() === label.toLowerCase()) ?? label;
}

/** An entry is UPCOMING when it has a full future date (hasn't happened yet).
 *  Dateless/partial and past/today entries are treated as completed. */
export function isUpcomingEntry(e: LogEntry): boolean {
  return !!e.date && daysUntil(e.date) > 0;
}

/** Completed = everything that has already happened (past/today) or is dateless.
 *  A future-dated entry (a planned trip, an event that hasn't occurred) is NOT
 *  yet counted toward the "visited"/completed headline. */
export function logCount(m: Memory): number {
  const completed = m.entries.filter(e => !isUpcomingEntry(e));
  if (isCollectionLog(m)) return new Set(completed.map(e => e.item).filter(Boolean)).size;
  return completed.length;
}

/** Total COMPLETED entries = visits (each visit is its own entry). For a
 *  collection this can exceed logCount() when items are logged more than once;
 *  callers append "· N visits" only when this exceeds the unique count. */
export function logVisits(m: Memory): number {
  return m.entries.filter(e => !isUpcomingEntry(e)).length;
}

/** How many entries are still upcoming (future-dated). */
export function upcomingCount(m: Memory): number {
  return m.entries.filter(isUpcomingEntry).length;
}

/** Entries with their original index, newest-dated first, dateless grouped last. */
export function sortedEntries(m: Memory): { entry: LogEntry; index: number }[] {
  return m.entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const ad = a.entry.date, bd = b.entry.date;
      if (!ad && !bd) return 0;
      if (!ad) return 1;   // dateless → end
      if (!bd) return -1;
      return bd.localeCompare(ad); // date desc
    });
}

// A future-dated life-log entry surfaced as a derived countdown on the
// Countdowns tab. Purely date-driven: once the date passes it's no longer
// upcoming, so it silently drops off — no migration, no delete.
export interface UpcomingLogItem {
  memId: string;
  index: number;   // position in memory.entries
  logName: string; // parent life log's name
  emoji: string;   // life log's emoji
  label: string;   // entry item/label, or the log name if none
  dateISO: string;
  days: number;
  alerts: number;  // count of reminders on the entry (for the card badge)
}

export function upcomingLogItems(memories: Memory[]): UpcomingLogItem[] {
  const out: UpcomingLogItem[] = [];
  for (const m of memories) {
    if (m.type !== 'lifelog') continue;
    m.entries.forEach((e, index) => {
      if (isUpcomingEntry(e)) {
        out.push({
          memId: m.id, index, logName: m.name, emoji: m.emoji,
          label: e.item || m.name, dateISO: e.date, days: daysUntil(e.date),
          alerts: e.alerts?.length ?? 0,
        });
      }
    });
  }
  return out.sort((a, b) => a.days - b.days);
}

// Singular noun for the "+ Add your first X" empty state.
const NOUNS: Record<string, string> = {
  countries: 'country', us_states: 'state', continents: 'continent',
  national_parks: 'park', mlb_ballparks: 'ballpark',
  hikes: 'hike', races: 'race', games: 'game', concerts: 'concert',
  golf: 'round', ski: 'ski day', books: 'book', movies: 'movie',
  restaurants: 'restaurant', museums: 'museum',
};
export function logNoun(m: Memory): string {
  const p = getPreset(m.logPreset);
  return (p && NOUNS[p.id]) || 'entry';
}
