import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '../../store/useStore';
import { useTheme } from '../../contexts/ThemeContext';
import { dayCountColor } from '../../constants/colors';
import { daysUntil, fmtDateTimeFull, fmtLogDate } from '../../utils/dates';
import { isUpcomingEntry } from '../../utils/lifelog';
import { DetailScreen, DetailCard, DetailHeader, StatRow, Section, Field, LinksSection, remindersText } from '../../components/DetailView';

// Read-only detail for a life-log entry — reached from Countdowns (attached
// upcoming entries via UpcomingLogRow) AND from the Life Log detail (any entry).
// Handles BOTH states: UPCOMING → days-away countdown; COMPLETED → the logged
// date, no countdown. The Edit button opens the entry editor (log-entry in edit
// mode) where edit/detach/delete live.
export default function LogEntryDetailModal() {
  const { colors } = useTheme();
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const memories = useStore(s => s.memories);
  const m = memories.find(x => x.id === id);
  const index = edit != null && edit !== '' ? parseInt(edit, 10) : -1;
  const entry = m && index >= 0 ? m.entries[index] : undefined;
  if (!m || !entry) { router.back(); return null; }

  const teal     = colors.teal;
  const upcoming = isUpcomingEntry(entry);
  const days     = daysUntil(entry.date);
  const name     = (entry.item && entry.item.trim()) || m.name;
  // Precision-aware date ("2019", "March 2019", "March 15, 2019") or "No date".
  const dateText = entry.date ? fmtLogDate(entry.date, entry.datePrecision) : 'No date';

  return (
    <DetailScreen onEdit={() => router.push({ pathname: '/modals/log-entry', params: { id: m.id, edit: String(index) } })}>
      <DetailCard>
        <DetailHeader emoji={m.emoji} tint={colors.isDark ? 'rgba(62,207,178,0.14)' : colors.tint}
          title={name} subtitle={`📓 ${m.name} · ${upcoming ? 'Upcoming' : 'Logged'}`} subtitleColor={teal} />

        {upcoming ? (
          <StatRow label="Countdown" context={fmtDateTimeFull(`${entry.date}T00:00:00`, true)}
            value={days} valueColor={dayCountColor(colors, days)}
            valueCaption={days === 1 ? 'day away' : 'days away'} />
        ) : (
          <StatRow label="Logged" context={dateText} value="✓" valueColor={teal} valueCaption="done" />
        )}

        <Section label="Life log">
          <Field label="Belongs to" value={`${m.emoji} ${m.name}`} />
        </Section>
        <Section label="When">
          <Field label="Date" value={dateText} />
        </Section>
        {upcoming && (
          <Section label="Reminders">
            <Field label="Alerts" value={remindersText(entry.alerts)} />
          </Section>
        )}
        {!!(entry.note && entry.note.trim()) && (
          <Section label="Note">
            <Field label="" value={entry.note.trim()} />
          </Section>
        )}
        <LinksSection links={entry.links} />
        <View style={{ height: 4 }} />
      </DetailCard>
    </DetailScreen>
  );
}
