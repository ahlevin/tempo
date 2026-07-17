import type { Goal, Memory, LogEntry, GoalAttempt, GoalKind } from '../store/types';
import { isCollectionLog, isUpcomingEntry } from './lifelog';
import { fmtShort } from './dates';

// Lower bound for a 'by_date' goal: the explicit window_start, else the goal's
// creation date — so it never counts entries from before the goal existed.
export function effectiveStart(g: Goal): string {
  return g.windowStart || g.created;
}

// A goal is life-log-LINKED when it points at a log (by id) or a preset.
export function isLinkedGoal(g: Goal): boolean {
  return !!(g.linkedLogId || g.linkedPreset);
}

// A RECURRING goal repeats against a per-period target (no single deadline).
export function isRecurringGoal(g: Goal): boolean {
  return !!g.repeats;
}

// Whether the goal has a meaningful single DEADLINE (target date). It does NOT
// when it recurs (period-based, no end) or when it's an ALL-TIME goal — all-time
// means no time bound, so a leftover target date must never surface as a
// deadline/countdown, whether the goal is LINKED or UNLINKED. Goals on a 'year'
// or 'by_date' window keep their deadline. A linked goal with no explicit window
// derives all-time (goalDerivedProgress defaults null → 'all_time'), so it also
// has no deadline. Legacy UNLINKED one-shot goals (null window, a real target
// date) keep their deadline — null is only treated as all-time when linked.
export function hasDeadline(g: Goal): boolean {
  if (g.repeats) return false;
  if (g.windowKind === 'all_time') return false;
  if (isLinkedGoal(g) && !g.windowKind) return false;
  return true;
}

// Resolve the linked life log — by explicit id first, else the user's log for
// the linked preset. Undefined when unlinked or the log no longer exists.
export function linkedLog(g: Goal, memories: Memory[]): Memory | undefined {
  if (g.linkedLogId) {
    const m = memories.find(x => x.id === g.linkedLogId && x.type === 'lifelog');
    if (m) return m;
  }
  if (g.linkedPreset) return memories.find(x => x.type === 'lifelog' && x.logPreset === g.linkedPreset);
  return undefined;
}

// DERIVED progress from the linked log — never stored. Excludes upcoming
// (future-dated) entries, consistent with coverage rules. Returns 0 if linked
// but the log is missing.
//   • COLLECTION log → count of UNIQUE completed items in the window
//   • COUNT log      → count of completed entries (occurrences) in the window
export function goalDerivedProgress(g: Goal, memories: Memory[]): number {
  const log = linkedLog(g, memories);
  if (!log) return 0;
  const win = g.windowKind ?? 'all_time';
  const inWindow = (e: LogEntry): boolean => {
    if (isUpcomingEntry(e)) return false;                 // never count future-dated
    if (win === 'year')    return !!e.date && e.date.slice(0, 4) === String(g.windowYear ?? '');
    if (win === 'by_date') { const s = effectiveStart(g); return !!e.date && e.date >= s && !!g.date && e.date <= g.date; }
    return true;                                          // all_time
  };
  const entries = log.entries.filter(inWindow);
  if (isCollectionLog(log)) return new Set(entries.map(e => e.item).filter(Boolean)).size;
  return entries.length;
}

// The progress to DISPLAY: derived when linked, else the manual counter.
export function goalProgress(g: Goal, memories: Memory[]): number {
  return isLinkedGoal(g) ? goalDerivedProgress(g, memories) : g.current;
}

// Completed = progress (derived or manual) has reached the target.
export function goalDone(g: Goal, memories: Memory[]): boolean {
  return g.target > 0 && goalProgress(g, memories) >= g.target;
}

// Human label for the window (for the linked-progress subtitle).
export function windowLabel(g: Goal): string {
  const win = g.windowKind ?? 'all_time';
  if (win === 'year') return `in ${g.windowYear ?? ''}`.trim();
  if (win === 'by_date') return `${fmtShort(effectiveStart(g))} – ${fmtShort(g.date)}`;
  return 'all-time';
}

// ── Kind ────────────────────────────────────────────────────────────────────
// The goal's kind, inferring for any legacy row missing it (repeats→streak,
// linked→collection, else count) so pre-measurement goals behave as before.
export function goalKind(g: Goal): GoalKind {
  if (g.kind) return g.kind;
  if (g.repeats) return 'streak';
  if (isLinkedGoal(g)) return 'collection';
  return 'count';
}

// ── VALUE goals: derived standing from attempts (never stored) ───────────────
function attemptsFor(g: Goal, attempts: GoalAttempt[]): GoalAttempt[] {
  return attempts.filter(a => a.goalId === g.id);
}
// Reverse-chronological (newest first) by occurredAt then createdAt.
export function sortedAttempts(g: Goal, attempts: GoalAttempt[]): GoalAttempt[] {
  return attemptsFor(g, attempts).sort((a, b) =>
    (b.occurredAt || '').localeCompare(a.occurredAt || '') ||
    (b.createdAt || '').localeCompare(a.createdAt || ''));
}
// Current standing: best (min for lower / max for higher), sum, or latest.
export function valueScore(g: Goal, attempts: GoalAttempt[]): number | null {
  const list = attemptsFor(g, attempts);
  if (!list.length) return null;
  const agg = g.agg ?? 'best';
  if (agg === 'sum') return list.reduce((s, a) => s + a.value, 0);
  if (agg === 'latest') return sortedAttempts(g, attempts)[0].value;
  const vals = list.map(a => a.value);
  return g.direction === 'lower' ? Math.min(...vals) : Math.max(...vals);
}
export function valueReached(g: Goal, score: number | null): boolean {
  if (score == null || g.targetValue == null) return false;
  return g.direction === 'lower' ? score <= g.targetValue : score >= g.targetValue;
}
// 0–100 progress toward the value target (best-effort for the bar).
export function valuePct(g: Goal, score: number | null): number {
  if (score == null || g.targetValue == null || g.targetValue === 0) return 0;
  const raw = g.direction === 'lower'
    ? (g.targetValue / score) * 100   // lower is better → closer to (or below) target = more
    : (score / g.targetValue) * 100;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

// ── QUEST goals: fraction of child goals completed ───────────────────────────
export function questChildren(g: Goal, goals: Goal[]): Goal[] {
  return goals.filter(x => x.parentGoalId === g.id);
}
export function questProgress(g: Goal, goals: Goal[], memories: Memory[], attempts: GoalAttempt[]): { done: number; total: number } {
  const children = questChildren(g, goals);
  const done = children.filter(c => isGoalComplete(c, goals, memories, attempts)).length;
  return { done, total: children.length };
}

// ── Unified completion across all kinds ──────────────────────────────────────
export function isGoalComplete(g: Goal, goals: Goal[], memories: Memory[], attempts: GoalAttempt[]): boolean {
  switch (goalKind(g)) {
    case 'milestone': return !!g.completedAt;
    case 'value':     return valueReached(g, valueScore(g, attempts));
    case 'quest': {
      const { done, total } = questProgress(g, goals, memories, attempts);
      return total > 0 && done === total;
    }
    default:          return goalDone(g, memories); // count / collection / streak — reused
  }
}
