import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '../../store/useStore';
import { useTheme } from '../../contexts/ThemeContext';
import { catColor, catBg, dayCountColor } from '../../constants/colors';
import { CATEGORIES } from '../../constants/data';
import { nextOccurrence, daysUntil, recurLabel, fmtDateTimeFull } from '../../utils/dates';
import { DetailScreen, DetailCard, DetailHeader, StatRow, Section, Field, remindersText } from '../../components/DetailView';

export default function EventDetailModal() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const events = useStore(s => s.events);
  const e = events.find(x => x.id === id);
  if (!e) { router.back(); return null; }

  const accent = catColor(colors, e.cat);
  const nd     = nextOccurrence(e);
  const days   = daysUntil(nd);
  const cat    = CATEGORIES.find(c => c.id === e.cat);
  const rl     = recurLabel(e);
  const whenFull = fmtDateTimeFull(nd, e.allDay);
  const subtitle = `${cat ? cat.emoji + ' ' + cat.label : 'Countdown'}${days > 0 ? ' · Upcoming' : days === 0 ? ' · Today' : ''}`;

  return (
    <DetailScreen onEdit={() => router.push({ pathname: '/modals/edit-event', params: { id: e.id } })}>
      <DetailCard>
        <DetailHeader emoji={e.emoji} tint={catBg(colors, e.cat)} title={e.name} subtitle={subtitle} subtitleColor={accent} />
        <StatRow label="Countdown" context={whenFull} value={days} valueColor={dayCountColor(colors, days)}
          valueCaption={days === 1 ? 'day away' : 'days away'} />

        <Section label="Category">
          <Field label="Type" value={cat ? `${cat.emoji} ${cat.label}` : 'Countdown'} />
        </Section>
        <Section label="When">
          <Field label={e.allDay ? 'Date' : 'Date & time'} value={whenFull || '—'} />
          <Field label="Repeats" value={rl || 'Does not repeat'} />
        </Section>
        <Section label="Reminders">
          <Field label="Alerts" value={remindersText(e.alerts)} />
        </Section>
        {!!e.note.trim() && (
          <Section label="Note">
            <Field label="" value={e.note.trim()} />
          </Section>
        )}
        <View style={{ height: 4 }} />
      </DetailCard>
    </DetailScreen>
  );
}
