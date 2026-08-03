import { Goal, GoalAttempt, Memory, Standing } from '../store/types';
import { formatValue } from './values';
import { presetUniverse } from '../constants/lifelogs';
import { canonItem, isUpcomingEntry } from './lifelog';

// ── Existing-coverage import (life log → collection challenge) ────────────────
// The caller's OWN completed coverage for a PRESET collection, read from THEIR
// life log for that preset (matched by logPreset). Returns one row per DISTINCT
// canonical item, carrying the earliest completed entry date (for occurred_at;
// '' when the entries are dateless). Upcoming (future-dated) entries are excluded,
// matching coverage rules. Reads ONLY the passed-in memories — never another user's
// log. Empty when there's no such log, no preset, or no completed items.
export function ownLogCoverage(memories: Memory[], preset: string | undefined): { item: string; date: string }[] {
  if (!preset) return [];
  const mem = memories.find(m => m.type === 'lifelog' && m.logPreset === preset);
  if (!mem) return [];
  const universe = presetUniverse(preset) ?? [];
  const byItem = new Map<string, string>();               // canonical item → earliest date
  for (const e of mem.entries) {
    if (isUpcomingEntry(e) || !e.item) continue;
    const item = canonItem(universe, e.item);              // snap to canonical universe name
    if (!item) continue;
    const prev = byItem.get(item);
    if (prev === undefined) byItem.set(item, e.date || '');
    else if (e.date && (prev === '' || e.date < prev)) byItem.set(item, e.date);
  }
  return [...byItem.entries()].map(([item, date]) => ({ item, date }));
}

// A goal becomes a CHALLENGE once it's been shared (share_goal set its join_code).
// The store's goals array already includes goals the user JOINED (RLS
// goals_select_participant), so this filter covers owned + joined challenges.
// Quest CHILDREN (parentGoalId) are never challenges.
export const isChallenge = (g: Goal): boolean => !!g.joinCode && !g.parentGoalId;

export const challengeGoals = (goals: Goal[]): Goal[] => goals.filter(isChallenge);

export function myStanding(standings: Standing[], profileId: string | null): Standing | undefined {
  return profileId ? standings.find(s => s.profileId === profileId) : undefined;
}

// The current leader = the top-RANKED participant who has actually logged an attempt.
// goal_standings is already server-ranked (reached first, then best score by
// direction) with score-less players last, so the first attempter in order is rank 1.
// Returns undefined when nobody has logged yet (no bogus leader).
export function challengeLeader(standings: Standing[]): Standing | undefined {
  return standings.find(s => s.attempts > 0);
}

// 1-based rank in the (already server-ranked) standings; 0 if not present.
export function myRank(standings: Standing[], profileId: string | null): number {
  if (!profileId) return 0;
  const i = standings.findIndex(s => s.profileId === profileId);
  return i < 0 ? 0 : i + 1;
}

// "2nd of 3" style label from a rank + total.
export function ordinalRank(rank: number): string {
  const s = ['th', 'st', 'nd', 'rd'], v = rank % 100;
  return rank + (s[(v - 20) % 10] || s[v] || s[0]);
}

// This goal's attempts, grouped by participant profile, each list reverse-chron
// (newest attempt first) — the per-person timeline. Built from the store's
// goalAttempts (RLS already returns co-participants' attempts on a shared goal).
// ── Collection-challenge coverage (from the shared goal_attempts item pool) ──

// The distinct items a participant has visited on a collection challenge = coverage.
export function collectionVisits(attempts: GoalAttempt[], goalId: string, profileId: string): Set<string> {
  const set = new Set<string>();
  for (const a of attempts) if (a.goalId === goalId && a.profileId === profileId && a.item) set.add(a.item);
  return set;
}

// Per-item visit counts for a participant (for the picker's "· N×" badge).
export function itemVisitCounts(attempts: GoalAttempt[], goalId: string, profileId: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const a of attempts) if (a.goalId === goalId && a.profileId === profileId && a.item) counts.set(a.item, (counts.get(a.item) ?? 0) + 1);
  return counts;
}

// Leaderboard score label — collection shows coverage "12 / 30"; value uses the
// value formatter (6:21, $…). Labelled by caller so it never reads as bare "X of Y".
export function standingScoreLabel(s: Standing, unit: string | undefined, isCollection: boolean): string {
  if (isCollection) return `${s.score ?? 0} / ${s.target != null ? s.target : '—'}`;
  return s.score != null ? formatValue(s.score, unit) : '—';
}

export function attemptsByProfile(attempts: GoalAttempt[], goalId: string): Map<string, GoalAttempt[]> {
  const byP = new Map<string, GoalAttempt[]>();
  for (const a of attempts) {
    if (a.goalId !== goalId) continue;
    const list = byP.get(a.profileId) ?? [];
    list.push(a);
    byP.set(a.profileId, list);
  }
  for (const list of byP.values()) {
    list.sort((x, y) => {
      const d = (y.occurredAt || '').localeCompare(x.occurredAt || '');
      return d !== 0 ? d : (y.createdAt || '').localeCompare(x.createdAt || '');
    });
  }
  return byP;
}
