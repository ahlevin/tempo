import type { Goal, Memory, LogEntry, GoalPeriodKind } from '../store/types';
import { isCollectionLog, isUpcomingEntry } from './lifelog';
import { isLinkedGoal, linkedLog } from './goals';

// ── Recurring-goal period + streak math ────────────────────────────────────
// A recurring goal targets `periodTarget` hits each period. Periods are LOCAL
// time: day = local midnight, week = starts Monday, month = the 1st. Progress
// is either LINKED (count of the linked log's entries dated in the CURRENT
// period) or MANUAL (a per-period tap counter stored in goal.manualPeriods).
// Everything here is DERIVED at render — nothing about streaks is stored for
// linked goals, and manual streaks derive from the stored per-period records
// (drift-proof: a rolled-over period simply has no record yet → 0).

export function goalPeriodKind(g: Goal): GoalPeriodKind { return (g.periodKind ?? 'week'); }
export function goalPeriodTarget(g: Goal): number { const t = g.periodTarget ?? 1; return t > 0 ? t : 1; }

const p2 = (n: number) => String(n).padStart(2, '0');
const parseLocal = (dateStr: string) => new Date(dateStr + 'T00:00:00');

// ISO-8601 week key ("YYYY-Www"), week-year aware (weeks belong to the year of
// their Thursday). Monday is day 0 here.
function isoWeekKey(d: Date): string {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (t.getDay() + 6) % 7;           // Mon=0 … Sun=6
  t.setDate(t.getDate() - dow + 3);           // move to this week's Thursday
  const isoYear = t.getFullYear();
  const firstThu = new Date(isoYear, 0, 4);   // Jan 4 is always in week 1
  const firstDow = (firstThu.getDay() + 6) % 7;
  firstThu.setDate(firstThu.getDate() - firstDow + 3);
  const week = 1 + Math.round((t.getTime() - firstThu.getTime()) / (7 * 86400000));
  return `${isoYear}-W${p2(week)}`;
}

// The local start-of-period Date containing `d`.
function startOfPeriod(kind: GoalPeriodKind, d: Date): Date {
  if (kind === 'day')   return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (kind === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
  const dow = (d.getDay() + 6) % 7;           // week → Monday
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
}
// Step a period-start Date by whole periods (delta may be negative).
function addPeriods(kind: GoalPeriodKind, start: Date, delta: number): Date {
  if (kind === 'day')   return new Date(start.getFullYear(), start.getMonth(), start.getDate() + delta);
  if (kind === 'week')  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7 * delta);
  return new Date(start.getFullYear(), start.getMonth() + delta, 1);
}
export function periodKeyOf(kind: GoalPeriodKind, d: Date): string {
  if (kind === 'day')   return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  if (kind === 'month') return `${d.getFullYear()}-${p2(d.getMonth() + 1)}`;
  return isoWeekKey(d);
}
// Inverse of periodKeyOf → the period-start Date for a key (for streak walks).
function keyToStart(kind: GoalPeriodKind, key: string): Date {
  if (kind === 'day')   { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); }
  if (kind === 'month') { const [y, m] = key.split('-').map(Number); return new Date(y, m - 1, 1); }
  const [y, w] = key.split('-W').map(Number);
  const jan4 = new Date(y, 0, 4);
  const jan4dow = (jan4.getDay() + 6) % 7;
  const week1Mon = new Date(y, 0, 4 - jan4dow);
  return new Date(week1Mon.getFullYear(), week1Mon.getMonth(), week1Mon.getDate() + (w - 1) * 7);
}

export function currentPeriodKey(kind: GoalPeriodKind): string {
  return periodKeyOf(kind, startOfPeriod(kind, new Date()));
}

// Short label for the current period ("today" / "this week" / "this month") and
// the singular noun for streak copy ("day"/"week"/"month").
export function periodLabel(kind: GoalPeriodKind): string {
  return kind === 'day' ? 'today' : kind === 'week' ? 'this week' : 'this month';
}
export function periodNoun(kind: GoalPeriodKind): string { return kind; }

// Progress in the CURRENT period. Linked → entries dated in this period
// (collection = unique items, count = occurrences); manual → the stored counter.
export function currentPeriodProgress(g: Goal, memories: Memory[]): number {
  const kind = goalPeriodKind(g);
  const key = currentPeriodKey(kind);
  if (isLinkedGoal(g)) {
    const log = linkedLog(g, memories);
    if (!log) return 0;
    const inPeriod = log.entries.filter(e => !isUpcomingEntry(e) && !!e.date && periodKeyOf(kind, parseLocal(e.date)) === key);
    return isCollectionLog(log) ? new Set(inPeriod.map(e => e.item).filter(Boolean)).size : inPeriod.length;
  }
  return (g.manualPeriods ?? []).find(r => r.key === key)?.n ?? 0;
}

export function periodMet(g: Goal, memories: Memory[]): boolean {
  return currentPeriodProgress(g, memories) >= goalPeriodTarget(g);
}

// The set of MET period keys — derived. Linked: group completed entries by
// period, keep those meeting target. Manual: records whose n >= target.
function metPeriodKeys(g: Goal, memories: Memory[]): string[] {
  const kind = goalPeriodKind(g);
  const target = goalPeriodTarget(g);
  if (isLinkedGoal(g)) {
    const log = linkedLog(g, memories);
    if (!log) return [];
    const byKey = new Map<string, LogEntry[]>();
    for (const e of log.entries) {
      if (isUpcomingEntry(e) || !e.date) continue;
      const k = periodKeyOf(kind, parseLocal(e.date));
      const arr = byKey.get(k); if (arr) arr.push(e); else byKey.set(k, [e]);
    }
    const coll = isCollectionLog(log);
    const met: string[] = [];
    byKey.forEach((entries, k) => {
      const prog = coll ? new Set(entries.map(e => e.item).filter(Boolean)).size : entries.length;
      if (prog >= target) met.push(k);
    });
    return met;
  }
  return (g.manualPeriods ?? []).filter(r => r.n >= target).map(r => r.key);
}

export interface StreakStats { current: number; best: number; total: number; }

// currentStreak = consecutive met periods ending at the current period (an
// in-progress, not-yet-met current period doesn't break the streak — it's
// skipped). bestStreak = longest consecutive run ever. total = met periods.
export function goalStreak(g: Goal, memories: Memory[]): StreakStats {
  const kind = goalPeriodKind(g);
  const met = new Set(metPeriodKeys(g, memories));
  if (met.size === 0) return { current: 0, best: 0, total: 0 };

  // Current streak — walk backward from the current period.
  let cur = startOfPeriod(kind, new Date());
  if (!met.has(periodKeyOf(kind, cur))) cur = addPeriods(kind, cur, -1);
  let current = 0;
  while (met.has(periodKeyOf(kind, cur))) { current++; cur = addPeriods(kind, cur, -1); }

  // Best streak — longest run of consecutive met period-starts.
  const starts = [...met].map(k => keyToStart(kind, k)).sort((a, b) => a.getTime() - b.getTime());
  let best = 0, run = 0;
  let prev: Date | null = null;
  for (const s of starts) {
    if (prev && periodKeyOf(kind, addPeriods(kind, prev, 1)) === periodKeyOf(kind, s)) run++; else run = 1;
    if (run > best) best = run;
    prev = s;
  }
  return { current, best, total: met.size };
}
