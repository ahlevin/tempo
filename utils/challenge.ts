import { Goal, GoalAttempt, Standing } from '../store/types';

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
