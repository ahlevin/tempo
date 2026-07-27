import { useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '../../store/useStore';
import { useTheme } from '../../contexts/ThemeContext';
import { catColor, catBg, dayCountColor } from '../../constants/colors';
import { CATEGORIES } from '../../constants/data';
import { format } from 'date-fns';
import { nextOccurrence, daysUntil, recurLabel, fmtDateTimeFull } from '../../utils/dates';
import { countdownInfo, isTimed, eventTimeLabel } from '../../utils/events';
import { DetailScreen, DetailCard, DetailHeader, StatRow, Section, Field, remindersText, LinksSection } from '../../components/DetailView';

export default function EventDetailModal() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const events = useStore(s => s.events);
  const e = events.find(x => x.id === id);
  // When the record is deleted (e.g. from the edit screen pushed on top, which
  // re-renders this screen underneath), dismiss in an EFFECT — never navigate
  // during render (an illegal side effect that throws into the ErrorBoundary).
  useEffect(() => { if (!e) router.back(); }, [e]);
  if (!e) return null;

  const accent = catColor(colors, e.cat);
  const nd     = nextOccurrence(e);
  const days   = daysUntil(nd);
  const cat    = CATEGORIES.find(c => c.id === e.cat);
  const rl     = recurLabel(e);

  const timed  = isTimed(e);
  const info   = countdownInfo(e);
  const timeLabel = timed ? eventTimeLabel(e) : '';
  const startMs = info.startMs;
  // Viewer-local date + the time label (both-tz for cross-zone exact_instant).
  const whenFull = timed && startMs != null
    ? `${format(new Date(startMs), 'EEEE, MMMM d, yyyy')} · ${timeLabel}`
    : fmtDateTimeFull(nd, e.allDay);
  const statusSuffix = timed
    ? (info.phase === 'during' ? ' · Happening now' : info.phase === 'after' ? ' · Ended' : days > 0 ? ' · Upcoming' : ' · Today')
    : (days > 0 ? ' · Upcoming' : days === 0 ? ' · Today' : '');
  const subtitle = `${cat ? cat.emoji + ' ' + cat.label : 'Countdown'}${statusSuffix}`;
  const statVal: number | string = timed && info.phase === 'during' ? 'Now' : timed && info.phase === 'after' ? 'Ended' : days;
  const statCaption = timed && info.phase === 'during' ? 'happening' : timed && info.phase === 'after' ? 'ended' : (days === 1 ? 'day away' : 'days away');

  return (
    <DetailScreen onEdit={() => router.push({ pathname: '/modals/edit-event', params: { id: e.id } })}>
      <DetailCard>
        <DetailHeader emoji={e.emoji} tint={catBg(colors, e.cat)} title={e.name} subtitle={subtitle} subtitleColor={accent} />
        <StatRow label="Countdown" context={whenFull} value={statVal} valueColor={dayCountColor(colors, days)}
          valueCaption={statCaption} />

        <Section label="Category">
          <Field label="Type" value={cat ? `${cat.emoji} ${cat.label}` : 'Countdown'} />
        </Section>
        <Section label="When">
          <Field label={timed ? 'Date & time' : e.allDay ? 'Date' : 'Date & time'} value={whenFull || '—'} />
          {timed && !!e.eventTimezone && <Field label="Timezone" value={e.eventTimezone} />}
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
        <LinksSection links={e.links} />
        <View style={{ height: 4 }} />
      </DetailCard>
    </DetailScreen>
  );
}
