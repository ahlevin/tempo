import { useEffect, useRef, useState } from 'react';
import { DimensionValue, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { lightCardShadow, dayCountColor } from '../constants/colors';
import { useStore } from '../store/useStore';
import { Goal } from '../store/types';
import { daysUntil } from '../utils/dates';
import { openGoalDetail } from '../utils/nav';
import { isLinkedGoal, goalDerivedProgress, goalDone, linkedLog, windowLabel, isRecurringGoal, hasDeadline } from '../utils/goals';
import { currentPeriodProgress, goalStreak, goalPeriodKind, goalPeriodTarget, periodLabel, periodNoun } from '../utils/recurring';
import { Confetti } from './Confetti';
import { SwipeableRow } from './SwipeableRow';
import { FavStar } from './FavStar';
import { AlertBadge } from './AlertBadge';
import { LinkBadge } from './LinkBadge';

export function GoalCard({ goal: g }: { goal: Goal }) {
  const { colors } = useTheme();
  const memories   = useStore(s => s.memories);
  const toggleFav  = useStore(s => s.toggleGoalFav);
  const nudgeGoal  = useStore(s => s.nudgeGoal);
  const incPeriod  = useStore(s => s.incrementGoalPeriod);
  const deleteGoal = useStore(s => s.deleteGoal);
  const edit = () => openGoalDetail(g.id);

  const recurring = isRecurringGoal(g);
  const linked = isLinkedGoal(g);
  const log  = linked ? linkedLog(g, memories) : undefined;
  const showDeadline = hasDeadline(g);
  const d = daysUntil(g.date);

  // Progress + completion depend on the goal shape.
  const kind = goalPeriodKind(g);
  const pt   = goalPeriodTarget(g);
  const prog = recurring ? currentPeriodProgress(g, memories) : (linked ? goalDerivedProgress(g, memories) : g.current);
  const denom = recurring ? pt : g.target;
  const gp   = denom > 0 ? Math.round(Math.min(100, (prog / denom) * 100)) : 0;
  const done = recurring ? prog >= pt : (linked ? goalDone(g, memories) : g.current >= g.target);
  const streak = recurring ? goalStreak(g, memories) : null;

  // Fire confetti on the transition into completion / period-met.
  const wasDone = useRef(done);
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    if (done && !wasDone.current) setBurst(b => b + 1);
    wasDone.current = done;
  }, [done]);

  const dstr = g.date ? new Date(g.date + 'T00:00:00').toLocaleDateString('en-US',
    { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '';

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
      <TouchableOpacity activeOpacity={0.7} onPress={edit}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.isDark ? 'rgba(62,207,178,0.11)' : colors.tint, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20 }}>{g.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text1, maxWidth: '78%' }} numberOfLines={1}>{g.name}</Text>
            {done && (
              <View style={{ backgroundColor: colors.isDark ? 'rgba(62,207,178,0.18)' : colors.tint, borderRadius: 8, paddingVertical: 2, paddingHorizontal: 7 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.teal }}>{recurring ? `✓ ${periodLabel(kind)}!` : '✓ Complete!'}</Text>
              </View>
            )}
            <AlertBadge count={g.alerts?.length} />
            <LinkBadge count={g.links?.length} />
          </View>
          {recurring ? (
            <>
              <Text style={{ fontSize: 13, color: colors.text2, marginTop: 2 }} numberOfLines={1}>
                🔁 {kind === 'day' ? 'Daily' : kind === 'week' ? 'Weekly' : 'Monthly'} · {linked ? (log ? log.name : 'Linked log') : 'Manual'}
              </Text>
              {!!streak && (
                <Text style={{ fontSize: 12, color: colors.teal, marginTop: 2, fontWeight: '600' }} numberOfLines={1}>
                  🔥 {streak.current} {periodNoun(kind)} streak · best {streak.best} · {streak.total} total
                </Text>
              )}
            </>
          ) : (
            <>
              {showDeadline && !!dstr && <Text style={{ fontSize: 13, color: colors.text2, marginTop: 2 }}>{dstr}</Text>}
              {linked && (
                <Text style={{ fontSize: 12, color: colors.teal, marginTop: 2, fontWeight: '600' }} numberOfLines={1}>
                  🔗 {log ? log.name : 'Linked log'} · {windowLabel(g)}
                </Text>
              )}
            </>
          )}
          {!!g.note && (
            <Text style={{ fontSize: 13, color: colors.text2, marginTop: 2, fontStyle: 'italic' }} numberOfLines={1}>{g.note}</Text>
          )}
        </View>
        <View style={{ alignItems: 'center' }}>
          {!recurring && showDeadline && (
            done ? (
              // A done goal shouldn't count down — show the ✓ complete state.
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: colors.teal }}>✓</Text>
                <Text style={{ fontSize: 9, color: colors.teal, textTransform: 'uppercase', fontWeight: '700' }}>done</Text>
              </View>
            ) : (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: dayCountColor(colors, d) }}>{d}</Text>
                <Text style={{ fontSize: 9, color: colors.text3, textTransform: 'uppercase' }}>days</Text>
              </View>
            )
          )}
          <FavStar active={g.fav} onToggle={() => toggleFav(g.id)} />
        </View>
      </TouchableOpacity>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            {recurring ? (
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.teal }}>
                {prog} of {pt} {periodLabel(kind)}
              </Text>
            ) : linked ? (
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.teal }}>
                {prog.toLocaleString()} {g.unit}
              </Text>
            ) : (
              <TouchableOpacity onPress={() => router.push({ pathname: '/modals/exact-edit', params: { id: g.id } })} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.teal }}>
                  {g.current.toLocaleString()} {g.unit}
                </Text>
              </TouchableOpacity>
            )}
            <Text style={{ fontSize: 12, color: colors.text2 }}>
              {recurring ? `${pt} / ${periodNoun(kind)}` : `${g.target.toLocaleString()} ${g.unit}`}
            </Text>
          </View>
          <View style={{ height: 6, backgroundColor: colors.track, borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${gp}%` as DimensionValue, backgroundColor: colors.teal, borderRadius: 3 }} />
          </View>
        </View>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.teal }}>{gp}%</Text>
        {/* Manual counters: one-shot unlinked → nudgeGoal; recurring manual → incrementGoalPeriod */}
        {!linked && (recurring || !done) && (
          <View style={{ flexDirection: 'row', gap: 5 }}>
            <TouchableOpacity onPress={() => (recurring ? incPeriod(g.id, -1) : nudgeGoal(g.id, -1))}
              style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.text2, fontWeight: '700', fontSize: 18 }}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => (recurring ? incPeriod(g.id, 1) : nudgeGoal(g.id, 1))}
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
