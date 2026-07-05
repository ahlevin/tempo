import { Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { useStore } from '../store/useStore';
import { Memory } from '../store/types';
import { SwipeableRow } from './SwipeableRow';
import { FavStar } from './FavStar';
import { AlertBadge } from './AlertBadge';
import { nextAnnual, daysUntil, yearsMonthsDays, ordinal } from '../utils/dates';

// A compact "Upcoming" list row for a recurring birthday/anniversary memory.
// Leads with the person's name, shows the upcoming age / anniversary, and the
// days until the next annual occurrence. Tapping opens edit-memory.
export function UpcomingMemoryRow({ memory: m }: { memory: Memory }) {
  const deleteMemory    = useStore(s => s.deleteMemory);
  const toggleMemoryFav = useStore(s => s.toggleMemoryFav);

  const isBday = m.type === 'birthday';
  const nb     = nextAnnual(m.originDate);
  const d      = daysUntil(nb);
  const r      = yearsMonthsDays(m.originDate);
  const color  = isBday ? Colors.rose : Colors.accent;
  const bg     = isBday ? 'rgba(232,80,122,0.12)' : 'rgba(124,106,245,0.12)';
  const context = isBday ? `Turning ${r.y + 1}` : `${ordinal(r.y + 1)} anniversary`;
  const dateStr = new Date(nb + 'T00:00:00').toLocaleDateString('en-US',
    { weekday: 'short', month: 'short', day: 'numeric' });

  const edit = () => router.push({ pathname: '/modals/edit-memory', params: { id: m.id } });

  return (
    <SwipeableRow onDelete={() => deleteMemory(m.id)}
      confirmTitle="Delete Memory" confirmMessage={`Delete "${m.name}"? This can't be undone.`}>
      <TouchableOpacity activeOpacity={0.8} onPress={edit}
        style={{ backgroundColor: Colors.surf, borderRadius: 18, borderWidth: 1,
          borderColor: Colors.border, padding: 14, paddingLeft: 16,
          marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: color, borderRadius: 2 }} />
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20 }}>{m.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.text1, maxWidth: '80%' }} numberOfLines={1}>{m.name}</Text>
            <AlertBadge count={m.alerts?.length} />
          </View>
          <Text style={{ fontSize: 11, color: Colors.text3, marginTop: 2 }}>
            <Text style={{ color, fontWeight: '700' }}>{context}</Text>
            <Text> · {dateStr}</Text>
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color }}>{d}</Text>
            <Text style={{ fontSize: 9, color: Colors.text3, textTransform: 'uppercase' }}>{d === 1 ? 'day' : 'days'}</Text>
          </View>
          <FavStar active={m.fav} onToggle={() => toggleMemoryFav(m.id)} />
        </View>
      </TouchableOpacity>
    </SwipeableRow>
  );
}
