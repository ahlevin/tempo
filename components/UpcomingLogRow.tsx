import { Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { lightCardShadow } from '../constants/colors';
import type { UpcomingLogItem } from '../utils/lifelog';

// A future-dated life-log entry shown as a countdown on the Countdowns tab.
// Tapping opens its parent life log. It carries the life log's teal treatment.
export function UpcomingLogRow({ item }: { item: UpcomingLogItem }) {
  const { colors } = useTheme();
  const color = colors.teal;
  const bg    = colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint;
  const dateStr = new Date(item.dateISO + 'T00:00:00').toLocaleDateString('en-US',
    { weekday: 'short', month: 'short', day: 'numeric' });

  // Canonical editor for a life-log entry — the SAME screen the Life Log detail
  // opens for it, so both surfaces edit the one underlying record.
  const open = () => router.push({ pathname: '/modals/log-entry', params: { id: item.memId, edit: String(item.index) } });

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={open}
      style={{ backgroundColor: colors.surf, borderRadius: 18, borderWidth: 1,
        borderColor: colors.border, padding: 14, paddingLeft: 16,
        marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12,
        ...(colors.isDark ? null : lightCardShadow) }}>
      {colors.isDark && <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: color, borderRadius: 2 }} />}
      <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text1, maxWidth: '86%' }} numberOfLines={1}>{item.label}</Text>
        <Text style={{ fontSize: 11, color: colors.text3, marginTop: 2 }}>
          <Text style={{ color, fontWeight: '700' }}>Upcoming</Text>
          <Text> · {item.logName} · {dateStr}</Text>
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color }}>{item.days}</Text>
        <Text style={{ fontSize: 9, color: colors.text3, textTransform: 'uppercase' }}>{item.days === 1 ? 'day' : 'days'}</Text>
      </View>
    </TouchableOpacity>
  );
}
