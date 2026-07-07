import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '../../store/useStore';
import { useTheme } from '../../contexts/ThemeContext';
import { dayCountColor } from '../../constants/colors';
import { daysUntil, fmtDateTimeFull } from '../../utils/dates';
import { DetailScreen, DetailCard, DetailHeader, StatRow, Section, Field } from '../../components/DetailView';

// Read-only detail for an ATTACHED upcoming life-log entry (the record surfaced
// on Countdowns via UpcomingLogRow). Tap opens this first; the Edit button opens
// the existing entry editor (log-entry in edit mode) where edit/detach/delete live.
export default function LogEntryDetailModal() {
  const { colors } = useTheme();
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const memories = useStore(s => s.memories);
  const m = memories.find(x => x.id === id);
  const index = edit != null && edit !== '' ? parseInt(edit, 10) : -1;
  const entry = m && index >= 0 ? m.entries[index] : undefined;
  if (!m || !entry) { router.back(); return null; }

  const teal  = colors.teal;
  const days  = daysUntil(entry.date);
  const name  = (entry.item && entry.item.trim()) || m.name;
  const whenFull = fmtDateTimeFull(`${entry.date}T00:00:00`, true);

  return (
    <DetailScreen onEdit={() => router.push({ pathname: '/modals/log-entry', params: { id: m.id, edit: String(index) } })}>
      <DetailCard>
        <DetailHeader emoji={m.emoji} tint={colors.isDark ? 'rgba(62,207,178,0.14)' : colors.tint}
          title={name} subtitle={`📓 ${m.name} · Upcoming`} subtitleColor={teal} />
        <StatRow label="Countdown" context={whenFull} value={days} valueColor={dayCountColor(colors, days)}
          valueCaption={days === 1 ? 'day away' : 'days away'} />

        <Section label="Life log">
          <Field label="Belongs to" value={`${m.emoji} ${m.name}`} />
        </Section>
        <Section label="When">
          <Field label="Date" value={whenFull || '—'} />
        </Section>
        {!!(entry.note && entry.note.trim()) && (
          <Section label="Note">
            <Field label="" value={entry.note.trim()} />
          </Section>
        )}
        <View style={{ height: 4 }} />
      </DetailCard>
    </DetailScreen>
  );
}
