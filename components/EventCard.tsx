import { Text, View } from 'react-native';
import { catBg, catColor, dayCountColor } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { useStore } from '../store/useStore';
import { Event } from '../store/types';
import { AlertBadge } from './AlertBadge';
import { LinkBadge } from './LinkBadge';
import { CountdownCard } from './CountdownCard';
import { nextOccurrence, daysUntil, eventProgress, recurLabel, fmtDateTime } from '../utils/dates';
import { openEventDetail } from '../utils/nav';

export function EventCard({ event: e }: { event: Event }) {
  const { colors } = useTheme();
  const toggleFav   = useStore(s => s.toggleEventFav);
  const deleteEvent = useStore(s => s.deleteEvent);

  const nd   = nextOccurrence(e);
  const d    = daysUntil(nd);
  const uc   = dayCountColor(colors, d);
  const rl   = recurLabel(e);
  const dstr = fmtDateTime(nd, e.allDay);

  return (
    <CountdownCard
      emoji={e.emoji}
      emojiBg={catBg(colors, e.cat)}
      accentBar={catColor(colors, e.cat)}
      title={e.name}
      titleMaxWidth="70%"
      badges={<>
        {!!rl && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: colors.track, borderRadius: 8, paddingVertical: 2, paddingHorizontal: 6 }}>
            <Text style={{ fontSize: 9 }}>🔁</Text>
            <Text style={{ fontSize: 9, fontWeight: '600', color: colors.text2 }}>{rl}</Text>
          </View>
        )}
        <AlertBadge count={e.alerts.length} />
        <LinkBadge count={e.links?.length} />
      </>}
      subtitle={dstr}
      note={e.note}
      days={d}
      dayColor={uc}
      progressPct={eventProgress(e)}
      fav={e.fav}
      onFav={() => toggleFav(e.id)}
      onPress={() => openEventDetail(e.id)}
      onDelete={() => deleteEvent(e.id)}
      confirmTitle="Delete Event"
      confirmMessage={`Delete "${e.name}"? This can't be undone.`}
    />
  );
}
