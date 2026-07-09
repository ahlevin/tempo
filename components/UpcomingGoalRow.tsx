import { useTheme } from '../contexts/ThemeContext';
import { useStore } from '../store/useStore';
import { dayCountColor } from '../constants/colors';
import { AlertBadge } from './AlertBadge';
import { CountdownCard, TypePill } from './CountdownCard';
import { openGoalDetail } from '../utils/nav';
import { isLinkedGoal, goalProgress } from '../utils/goals';
import { daysUntil } from '../utils/dates';
import type { Goal } from '../store/types';

// A goal with a future target date, shown as a countdown on the Countdowns tab —
// a full visual peer of EventCard (shared CountdownCard shell). Tapping opens the
// goal's read-only detail. Linked goals show derived progress.
export function UpcomingGoalRow({ goal: g }: { goal: Goal }) {
  const { colors } = useTheme();
  const memories   = useStore(s => s.memories);
  const deleteGoal = useStore(s => s.deleteGoal);
  const toggleFav  = useStore(s => s.toggleGoalFav);

  const d = daysUntil(g.date);
  const dc = dayCountColor(colors, d);
  const linked = isLinkedGoal(g);
  const prog = linked ? goalProgress(g, memories) : g.current;
  const pct = g.target > 0 ? Math.max(0, Math.min(100, Math.round((prog / g.target) * 100))) : 0;
  const dateStr = new Date(g.date + 'T00:00:00').toLocaleDateString('en-US',
    { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <CountdownCard
      emoji="🎯"
      emojiBg={colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint}
      accentBar={colors.teal}
      title={g.name}
      badges={<><TypePill label="Goal" /><AlertBadge count={g.alerts?.length} /></>}
      subtitle={`${dateStr}${linked ? ` · ${prog} of ${g.target}` : ''}`}
      days={d}
      dayColor={dc}
      progressPct={pct}
      fav={g.fav}
      onFav={() => toggleFav(g.id)}
      onPress={() => openGoalDetail(g.id)}
      onDelete={() => deleteGoal(g.id)}
      confirmTitle="Delete Goal"
      confirmMessage={`Delete "${g.name}"? This can't be undone.`}
    />
  );
}
