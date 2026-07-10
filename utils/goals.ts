import type { Goal, Memory, LogEntry } from '../store/types';
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
