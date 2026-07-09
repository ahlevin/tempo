import { useTheme } from '../contexts/ThemeContext';
import { useStore } from '../store/useStore';
import { dayCountColor } from '../constants/colors';
import { AlertBadge } from './AlertBadge';
import { CountdownCard, TypePill } from './CountdownCard';
import { openLogEntryDetail } from '../utils/nav';
import type { UpcomingLogItem } from '../utils/lifelog';

// A future-dated life-log entry shown as a countdown on the Countdowns tab — a
// full visual peer of EventCard (shared CountdownCard shell). Tapping opens its
// READ-ONLY detail view (the detail's Edit button opens the entry editor).
export function UpcomingLogRow({ item }: { item: UpcomingLogItem }) {
  const { colors } = useTheme();
  const deleteLogEntry = useStore(s => s.deleteLogEntry);
  const toggleFav      = useStore(s => s.toggleLogEntryFav);

  const dc = dayCountColor(colors, item.days);
  const dateStr = new Date(item.dateISO + 'T00:00:00').toLocaleDateString('en-US',
    { weekday: 'short', month: 'short', day: 'numeric' });
  // Proximity bar over a 1-year window (mirrors event time-progress) so the card
  // stands the same height as an event card; fills as the date nears.
  const pct = Math.max(0, Math.min(100, Math.round(((365 - item.days) / 365) * 100)));

  // Delete from the Countdowns side removes the ONE underlying entry — the same
  // record surfaced here and inside the life log, so it clears from both.
  return (
    <CountdownCard
      emoji={item.emoji}
      emojiBg={colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint}
      accentBar={colors.teal}
      title={item.label}
      badges={<><TypePill label="Life Log" /><AlertBadge count={item.alerts} /></>}
      subtitle={`${item.logName} · ${dateStr}`}
      days={item.days}
      dayColor={dc}
      progressPct={pct}
      fav={item.fav}
      onFav={() => toggleFav(item.memId, item.index)}
      onPress={() => openLogEntryDetail(item.memId, item.index)}
      onDelete={() => deleteLogEntry(item.memId, item.index)}
      confirmTitle={`Delete "${item.label}"?`}
      confirmMessage="This removes it from Countdowns and its life log."
    />
  );
}
