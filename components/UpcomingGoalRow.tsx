import { Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useStore } from '../store/useStore';
import { lightCardShadow, dayCountColor } from '../constants/colors';
import { SwipeableRow } from './SwipeableRow';
import { openGoalDetail } from '../utils/nav';
import { isLinkedGoal, goalProgress } from '../utils/goals';
import { daysUntil } from '../utils/dates';
import type { Goal } from '../store/types';

// A goal with a future target date, shown as a countdown on the Countdowns tab.
// Tapping opens the goal's read-only detail. Linked goals show derived progress.
export function UpcomingGoalRow({ goal: g }: { goal: Goal }) {
  const { colors } = useTheme();
  const memories = useStore(s => s.memories);
  const deleteGoal = useStore(s => s.deleteGoal);

  const d = daysUntil(g.date);
  const dc = dayCountColor(colors, d);
  const linked = isLinkedGoal(g);
  const prog = linked ? goalProgress(g, memories) : g.current;
  const dateStr = new Date(g.date + 'T00:00:00').toLocaleDateString('en-US',
    { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <SwipeableRow onDelete={() => deleteGoal(g.id)}
      confirmTitle="Delete Goal" confirmMessage={`Delete "${g.name}"? This can't be undone.`}>
      <TouchableOpacity activeOpacity={0.8} onPress={() => openGoalDetail(g.id)}
        style={{ backgroundColor: colors.surf, borderRadius: 18, borderWidth: 1,
          borderColor: colors.border, padding: 14, paddingLeft: 16,
          marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12,
          ...(colors.isDark ? null : lightCardShadow) }}>
        {colors.isDark && <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.teal, borderRadius: 2 }} />}
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20 }}>🎯</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text1, maxWidth: '86%' }} numberOfLines={1}>{g.name}</Text>
          <Text style={{ fontSize: 13, color: colors.text2, marginTop: 2 }} numberOfLines={1}>
            <Text style={{ color: colors.teal, fontWeight: '700' }}>Goal</Text>
            <Text> · {dateStr}{linked ? ` · ${prog} of ${g.target}` : ''}</Text>
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: dc }}>{d}</Text>
          <Text style={{ fontSize: 9, color: colors.text3, textTransform: 'uppercase' }}>{d === 1 ? 'day' : 'days'}</Text>
        </View>
      </TouchableOpacity>
    </SwipeableRow>
  );
}
