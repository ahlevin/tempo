import { Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useStore } from '../store/useStore';
import { Memory } from '../store/types';
import { SwipeableRow } from './SwipeableRow';
import { FavStar } from './FavStar';
import { AlertBadge } from './AlertBadge';
import { LinkBadge } from './LinkBadge';
import { lightCardShadow, dayCountColor, catColor } from '../constants/colors';
import { nextAnnual, daysUntil, yearsMonthsDays, ordinal } from '../utils/dates';
import { openMemoryDetail } from '../utils/nav';

// A compact "Upcoming" list row for a recurring birthday/anniversary memory.
// Leads with the person's name, shows the upcoming age / anniversary, and the
// days until the next annual occurrence. Tapping opens edit-memory.
export function UpcomingMemoryRow({ memory: m }: { memory: Memory }) {
  const { colors } = useTheme();
  const deleteMemory    = useStore(s => s.deleteMemory);
  const toggleMemoryFav = useStore(s => s.toggleMemoryFav);

  const isBday     = m.type === 'birthday';
  const isMemorial = m.type === 'memorial';
  const nb     = nextAnnual(m.originDate);
  const d      = daysUntil(nb);
  const r      = yearsMonthsDays(m.originDate);
  // Decorative accent for the label / emoji circle. In light, rose = crimson
  // (reserved for urgency), so the birthday accent routes to navy. Memorial
  // keeps its muted slate in both themes.
  const color  = isMemorial ? catColor(colors, 'memorial')
               : (colors.isDark && isBday ? colors.rose : colors.accent);
  const bg     = colors.isDark
    ? (isMemorial ? 'rgba(143,163,184,0.12)' : isBday ? 'rgba(232,80,122,0.12)' : 'rgba(124,106,245,0.12)')
    : colors.tint;
  // Memorial's day-count stays slate (not the urgency ramp).
  const dcColor = isMemorial ? color : dayCountColor(colors, d);
  const context = isBday ? `Turning ${r.y + 1}`
                : isMemorial ? `${r.y + 1} years since`
                : `${ordinal(r.y + 1)} anniversary`;
  const dateStr = new Date(nb + 'T00:00:00').toLocaleDateString('en-US',
    { weekday: 'short', month: 'short', day: 'numeric' });

  // Tap opens the read-only detail view (which has its own Edit button).
  const edit = () => openMemoryDetail(m);

  return (
    <SwipeableRow onDelete={() => deleteMemory(m.id)}
      confirmTitle="Delete Memory" confirmMessage={`Delete "${m.name}"? This can't be undone.`}>
      <TouchableOpacity activeOpacity={0.8} onPress={edit}
        style={{ backgroundColor: colors.surf, borderRadius: 18, borderWidth: 1,
          borderColor: colors.border, padding: 14, paddingLeft: 16,
          marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12,
          ...(colors.isDark ? null : lightCardShadow) }}>
        {colors.isDark && <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: color, borderRadius: 2 }} />}
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20 }}>{m.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text1, maxWidth: '80%' }} numberOfLines={1}>{m.name}</Text>
            <AlertBadge count={m.alerts?.length} />
            <LinkBadge count={m.links?.length} />
          </View>
          <Text style={{ fontSize: 13, color: colors.text2, marginTop: 2 }}>
            {m.yearUnknown ? (
              // Year unknown: no "Turning N" — just the month/day of the next one.
              <Text style={{ color, fontWeight: '700' }}>{dateStr}</Text>
            ) : (
              <>
                <Text style={{ color, fontWeight: '700' }}>{context}</Text>
                <Text> · {dateStr}</Text>
              </>
            )}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: dcColor }}>{d}</Text>
            <Text style={{ fontSize: 9, color: colors.text3, textTransform: 'uppercase' }}>{d === 1 ? 'day' : 'days'}</Text>
          </View>
          <FavStar active={m.fav} onToggle={() => toggleMemoryFav(m.id)} />
        </View>
      </TouchableOpacity>
    </SwipeableRow>
  );
}
