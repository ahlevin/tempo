import { memo } from 'react';
import { Text, View } from 'react-native';
import { format } from 'date-fns';
import { catBg, catColor, dayCountColor } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { useStore } from '../store/useStore';
import { Event } from '../store/types';
import { AlertBadge } from './AlertBadge';
import { LinkBadge } from './LinkBadge';
import { CountdownCard } from './CountdownCard';
import { nextOccurrence, daysUntil, eventProgress, recurLabel, fmtDateTime } from '../utils/dates';
import { countdownInfo, isTimed, eventTimeLabel, formatHMS } from '../utils/events';
import { useTick, useSecondTick } from '../contexts/TickContext';
import { openEventDetail } from '../utils/nav';

// memo: EventCard reads only its `event` prop + stable store actions, so it skips
// re-render when the countdowns list re-renders for an unrelated (goal/memory) change.
// date_only events subscribe to NO tick (unchanged perf/behavior); timed events
// re-check each minute and tick per-second ONLY while live/near.
export const EventCard = memo(function EventCard({ event: e }: { event: Event }) {
  const { colors } = useTheme();
  const toggleFav   = useStore(s => s.toggleEventFav);
  const deleteEvent = useStore(s => s.deleteEvent);

  const timed = isTimed(e);
  const minute = useTick(timed);                 // no subscription for date_only
  const baseNow = timed ? minute : Date.now();
  const base = countdownInfo(e, baseNow);
  const sec = useSecondTick(base.live);          // 1s tick only while near
  const now = base.live ? sec : baseNow;

  const rl = recurLabel(e);
  const badges = (
    <>
      {!!rl && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: colors.track, borderRadius: 8, paddingVertical: 2, paddingHorizontal: 6 }}>
          <Text style={{ fontSize: 9 }}>🔁</Text>
          <Text style={{ fontSize: 9, fontWeight: '600', color: colors.text2 }}>{rl}</Text>
        </View>
      )}
      <AlertBadge count={e.alerts.length} />
      <LinkBadge count={e.links?.length} />
    </>
  );
  const common = {
    emoji: e.emoji, emojiBg: catBg(colors, e.cat), accentBar: catColor(colors, e.cat),
    title: e.name, titleMaxWidth: '70%' as const, badges, note: e.note,
    progressPct: eventProgress(e), fav: e.fav,
    onFav: () => toggleFav(e.id), onPress: () => openEventDetail(e.id), onDelete: () => deleteEvent(e.id),
    confirmTitle: 'Delete Event', confirmMessage: `Delete "${e.name}"? This can't be undone.`,
  };

  // ── date_only — byte-for-byte the original rendering ──
  if (!timed) {
    const nd = nextOccurrence(e);
    const d = daysUntil(nd);
    return <CountdownCard {...common} subtitle={fmtDateTime(nd, e.allDay)} days={d} dayColor={dayCountColor(colors, d)} />;
  }

  // ── timed (exact_instant / viewer_local) ──
  const info = countdownInfo(e, now);
  const timeLabel = eventTimeLabel(e);
  const startMs = info.startMs ?? now;
  const dateStr = format(new Date(startMs), 'EEE, MMM d');
  const dCal = Math.max(0, Math.ceil((startMs - now) / 86_400_000));

  let big: number | string = dCal;
  let daysLabel: string | undefined;
  let subtitle: string;
  let dayColor = dayCountColor(colors, dCal);

  if (info.phase === 'after') {
    big = 'Ended'; daysLabel = ''; subtitle = `Ended · ${timeLabel}`;
  } else if (info.phase === 'during') {
    big = formatHMS((info.endMs ?? now) - now); daysLabel = 'left';
    subtitle = `Happening now · ${timeLabel}`; dayColor = colors.rose;
  } else if (info.live) {
    big = formatHMS((info.targetMs ?? now) - now); daysLabel = 'to go';
    subtitle = `${dateStr} · ${timeLabel}`;
  } else {
    subtitle = `${dateStr} · ${timeLabel}`;
  }

  return <CountdownCard {...common} subtitle={subtitle} days={big} daysLabel={daysLabel} dayColor={dayColor} />;
});
