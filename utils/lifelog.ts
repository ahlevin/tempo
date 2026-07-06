import { Memory, LogEntry } from '../store/types';
import { presetUniverse, PRESET_BY_ID } from '../constants/lifelogs';

// Shared life-log helpers (a life log is a container; dates live on entries).

export function isCollectionLog(m: Memory): boolean {
  return (m.logKind ?? 'count') === 'collection';
}

export function logUniverse(m: Memory): string[] | undefined {
  return presetUniverse(m.logPreset);
}

/** Progress count: distinct named items for collections, else entry count. */
export function logCount(m: Memory): number {
  if (isCollectionLog(m)) return new Set(m.entries.map(e => e.item).filter(Boolean)).size;
  return m.entries.length;
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

// Singular noun for the "+ Add your first X" empty state.
const NOUNS: Record<string, string> = {
  countries: 'country', us_states: 'state', continents: 'continent',
  national_parks: 'park', mlb_ballparks: 'ballpark',
  hikes: 'hike', races: 'race', games: 'game', concerts: 'concert',
  golf: 'round', ski: 'ski day', books: 'book', movies: 'movie',
  restaurants: 'restaurant', museums: 'museum',
};
export function logNoun(m: Memory): string {
  const p = m.logPreset ? PRESET_BY_ID[m.logPreset] : undefined;
  return (p && NOUNS[p.id]) || 'entry';
}
