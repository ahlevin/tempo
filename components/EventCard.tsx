import { DimensionValue, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { CatBg, lightCardShadow } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { useStore } from '../store/useStore';
import { Event } from '../store/types';
import { SwipeableRow } from './SwipeableRow';
import { FavStar } from './FavStar';
import { AlertBadge } from './AlertBadge';
import { nextOccurrence, daysUntil, eventProgress, urgencyColor, recurLabel, fmtDateTime } from '../utils/dates';

const CAT_ACCENT: Record<string, string> = {
  travel: '#3ECFB2', celebration: '#7C6AF5', work: '#F0A04B', personal: '#E8507A',
};

export function EventCard({ event: e }: { event: Event }) {
  const { colors } = useTheme();
  const toggleFav   = useStore(s => s.toggleEventFav);
  const deleteEvent = useStore(s => s.deleteEvent);

  const nd     = nextOccurrence(e);
  const d      = daysUntil(nd);
  const p      = eventProgress(e);
  const uc     = urgencyColor(d);
  const accent = CAT_ACCENT[e.cat] || colors.accent;
  const rl     = recurLabel(e);
  const dstr   = fmtDateTime(nd, e.allDay);

  const edit = () => router.push({ pathname: '/modals/edit-event', params: { id: e.id } });

  return (
    <SwipeableRow onDelete={() => deleteEvent(e.id)}
      confirmTitle="Delete Event" confirmMessage={`Delete "${e.name}"? This can't be undone.`}>
    <TouchableOpacity activeOpacity={0.8} onPress={edit}
      style={{
        backgroundColor: colors.surf, borderRadius: 18, borderWidth: 1,
        borderColor: colors.border, padding: 14, paddingLeft: 16,
        marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12,
        ...(colors.isDark ? null : lightCardShadow),
      }}>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: accent, borderRadius: 2 }} />
      <View style={{
        width: 42, height: 42, borderRadius: 12,
        backgroundColor: CatBg[e.cat] || 'rgba(124,106,245,0.11)',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 20 }}>{e.emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text1, maxWidth: '70%' }} numberOfLines={1}>
            {e.name}
          </Text>
          {!!rl && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, paddingVertical: 2, paddingHorizontal: 6 }}>
              <Text style={{ fontSize: 9 }}>🔁</Text>
              <Text style={{ fontSize: 9, fontWeight: '600', color: colors.text2 }}>{rl}</Text>
            </View>
          )}
          <AlertBadge count={e.alerts.length} />
        </View>
        <Text style={{ fontSize: 11, color: colors.text3, marginTop: 2 }}>{dstr}</Text>
        <View style={{ height: 2, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 1, marginTop: 7, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${p}%` as DimensionValue, backgroundColor: uc, borderRadius: 1 }} />
        </View>
      </View>
      <View style={{ alignItems: 'center' }}>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: uc }}>{d}</Text>
          <Text style={{ fontSize: 9, color: colors.text3, textTransform: 'uppercase' }}>{d === 1 ? 'day' : 'days'}</Text>
        </View>
        <FavStar active={e.fav} onToggle={() => toggleFav(e.id)} />
      </View>
    </TouchableOpacity>
    </SwipeableRow>
  );
}
