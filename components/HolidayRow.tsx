import { Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useStore } from '../store/useStore';
import { FavStar } from './FavStar';
import { lightCardShadow, catColor, catBg } from '../constants/colors';
import type { HolidayItem } from '../constants/holidays';

// A compact "Upcoming" row for a visible holiday. Holidays are a derived layer,
// never stored events — so there is NO swipe-to-delete. Tapping opens the
// holiday detail (which offers "Hide from countdown"); the star pins it to the
// hero. Uses the 🎄 Holidays category color treatment.
export function HolidayRow({ item }: { item: HolidayItem }) {
  const { colors } = useTheme();
  const setHolidayFav = useStore(s => s.setHolidayFav);

  const color = catColor(colors, 'holidays');
  const bg    = catBg(colors, 'holidays');
  const dateStr = new Date(item.dateISO + 'T00:00:00').toLocaleDateString('en-US',
    { weekday: 'short', month: 'short', day: 'numeric' });

  const open = () => router.push({ pathname: '/modals/holiday-detail', params: { id: item.id } });

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
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text1, maxWidth: '86%' }} numberOfLines={1}>{item.name}</Text>
        <Text style={{ fontSize: 11, color: colors.text3, marginTop: 2 }}>
          <Text style={{ color, fontWeight: '700' }}>Holiday</Text>
          <Text> · {dateStr}</Text>
        </Text>
      </View>
      <View style={{ alignItems: 'center' }}>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color }}>{item.days}</Text>
          <Text style={{ fontSize: 9, color: colors.text3, textTransform: 'uppercase' }}>{item.days === 1 ? 'day' : 'days'}</Text>
        </View>
        <FavStar active={item.fav} onToggle={() => setHolidayFav(item.id, !item.fav)} />
      </View>
    </TouchableOpacity>
  );
}
