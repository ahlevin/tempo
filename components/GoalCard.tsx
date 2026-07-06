import { useEffect, useRef, useState } from 'react';
import { DimensionValue, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { lightCardShadow, dayCountColor } from '../constants/colors';
import { useStore } from '../store/useStore';
import { Goal } from '../store/types';
import { daysUntil } from '../utils/dates';
import { Confetti } from './Confetti';
import { SwipeableRow } from './SwipeableRow';
import { FavStar } from './FavStar';
import { AlertBadge } from './AlertBadge';

export function GoalCard({ goal: g }: { goal: Goal }) {
  const { colors } = useTheme();
  const toggleFav  = useStore(s => s.toggleGoalFav);
  const nudgeGoal  = useStore(s => s.nudgeGoal);
  const deleteGoal = useStore(s => s.deleteGoal);
  const edit = () => router.push({ pathname: '/modals/edit-goal', params: { id: g.id } });

  const gp   = Math.round(Math.min(100, (g.current / g.target) * 100));
  const d    = daysUntil(g.date);
  const done = g.current >= g.target;

  // Fire confetti on the transition into completion (not on initial mount of an
  // already-complete goal).
  const wasDone = useRef(done);
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    if (done && !wasDone.current) setBurst(b => b + 1);
    wasDone.current = done;
  }, [done]);

  const dstr = new Date(g.date + 'T00:00:00').toLocaleDateString('en-US',
    { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <SwipeableRow onDelete={() => deleteGoal(g.id)}
      confirmTitle="Delete Goal" confirmMessage={`Delete "${g.name}"? This can't be undone.`}>
    <View style={{
      backgroundColor: colors.surf, borderRadius: 18, borderWidth: 1,
      borderColor: colors.isDark ? 'rgba(62,207,178,0.2)' : colors.border, padding: 14, paddingLeft: 16, marginBottom: 8,
      overflow: 'hidden', ...(colors.isDark ? null : lightCardShadow),
    }}>
      <Confetti fire={burst} height={180} onDone={() => setBurst(0)} />
      {colors.isDark && <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.teal, borderRadius: 2 }} />}
      {/* Tap the header to edit; the progress row below owns its own controls. */}
      <TouchableOpacity activeOpacity={0.7} onPress={edit}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.isDark ? 'rgba(62,207,178,0.11)' : colors.tint, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20 }}>{g.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text1, maxWidth: '80%' }} numberOfLines={1}>{g.name}</Text>
            {done && (
              <View style={{ backgroundColor: colors.isDark ? 'rgba(62,207,178,0.18)' : colors.tint, borderRadius: 8, paddingVertical: 2, paddingHorizontal: 7 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.teal }}>✓ Complete!</Text>
              </View>
            )}
            <AlertBadge count={g.alerts?.length} />
          </View>
          <Text style={{ fontSize: 11, color: colors.text3, marginTop: 2 }}>{dstr}</Text>
          {!!g.note && (
            <Text style={{ fontSize: 11, color: colors.text2, marginTop: 2, fontStyle: 'italic' }} numberOfLines={1}>
              {g.note}
            </Text>
          )}
        </View>
        <View style={{ alignItems: 'center' }}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: dayCountColor(colors, d) }}>{d}</Text>
            <Text style={{ fontSize: 9, color: colors.text3, textTransform: 'uppercase' }}>days</Text>
          </View>
          <FavStar active={g.fav} onToggle={() => toggleFav(g.id)} />
        </View>
      </TouchableOpacity>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <TouchableOpacity onPress={() => router.push({ pathname: '/modals/exact-edit', params: { id: g.id } })} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.teal }}>
                {g.current.toLocaleString()} {g.unit}
              </Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: colors.text3 }}>{g.target.toLocaleString()} {g.unit}</Text>
          </View>
          <View style={{ height: 6, backgroundColor: colors.track, borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${gp}%` as DimensionValue, backgroundColor: colors.teal, borderRadius: 3 }} />
          </View>
        </View>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.teal }}>{gp}%</Text>
        {!done && (
          <View style={{ flexDirection: 'row', gap: 5 }}>
            <TouchableOpacity onPress={() => nudgeGoal(g.id, -1)}
              style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.text2, fontWeight: '700', fontSize: 18 }}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => nudgeGoal(g.id, 1)}
              style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.isDark ? 'rgba(62,207,178,0.18)' : colors.tint, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.teal, fontWeight: '700', fontSize: 18 }}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
    </SwipeableRow>
  );
}
