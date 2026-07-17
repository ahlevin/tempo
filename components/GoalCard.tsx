import { useEffect, useRef, useState } from 'react';
import { DimensionValue, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { lightCardShadow, dayCountColor } from '../constants/colors';
import { useStore } from '../store/useStore';
import { Goal } from '../store/types';
import { daysUntil, fmtShort } from '../utils/dates';
import { openGoalDetail } from '../utils/nav';
import { isLinkedGoal, goalDerivedProgress, goalDone, linkedLog, windowLabel, isRecurringGoal, hasDeadline,
  goalKind, valueScore, valueReached, valuePct, questProgress } from '../utils/goals';
import { currentPeriodProgress, goalStreak, goalPeriodKind, goalPeriodTarget, periodLabel, periodNoun } from '../utils/recurring';
import { formatValue } from '../utils/values';
import { Confetti } from './Confetti';
import { SwipeableRow } from './SwipeableRow';
import { FavStar } from './FavStar';
import { AlertBadge } from './AlertBadge';
import { LinkBadge } from './LinkBadge';

export function GoalCard({ goal: g }: { goal: Goal }) {
  const { colors } = useTheme();
  const memories   = useStore(s => s.memories);
  const goals      = useStore(s => s.goals);
  const attempts   = useStore(s => s.goalAttempts);
  const toggleFav  = useStore(s => s.toggleGoalFav);
  const nudgeGoal  = useStore(s => s.nudgeGoal);
  const incPeriod  = useStore(s => s.incrementGoalPeriod);
  const setMilestoneDone = useStore(s => s.setMilestoneDone);
  const deleteGoal = useStore(s => s.deleteGoal);
  const edit = () => openGoalDetail(g.id);

  const gk = goalKind(g);
  const standard = gk === 'count' || gk === 'collection' || gk === 'streak';
  const recurring = isRecurringGoal(g);
  const linked = isLinkedGoal(g);
  const log  = linked ? linkedLog(g, memories) : undefined;
  const showDeadline = hasDeadline(g);
  const d = daysUntil(g.date);

  // Standard (count/collection/streak) progress.
  const pk   = goalPeriodKind(g);
  const pt   = goalPeriodTarget(g);
  const prog = recurring ? currentPeriodProgress(g, memories) : (linked ? goalDerivedProgress(g, memories) : g.current);
  const denom = recurring ? pt : g.target;
  const gp   = denom > 0 ? Math.round(Math.min(100, (prog / denom) * 100)) : 0;
  const streak = recurring ? goalStreak(g, memories) : null;
  // Value.
  const score = gk === 'value' ? valueScore(g, attempts) : null;
  const reached = gk === 'value' ? valueReached(g, score) : false;
  const vpct = gk === 'value' ? valuePct(g, score) : 0;
  // Quest.
  const quest = gk === 'quest' ? questProgress(g, goals, memories, attempts) : { done: 0, total: 0 };
  const qpct = quest.total ? Math.round((quest.done / quest.total) * 100) : 0;
  // Milestone.
  const msDone = !!g.completedAt;

  // Unified completion (drives the ✓ badge + confetti).
  const done = gk === 'value' ? reached
    : gk === 'milestone' ? msDone
    : gk === 'quest' ? (quest.total > 0 && quest.done === quest.total)
    : recurring ? prog >= pt : (linked ? goalDone(g, memories) : g.current >= g.target);
  const doneLabel = gk === 'value' ? '✓ Reached!'
    : gk === 'milestone' ? '✓ Done!'
    : recurring ? `✓ ${periodLabel(pk)}!` : '✓ Complete!';

  // Confetti on the done transition (hooks run unconditionally — kind can change).
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
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: standard || gk === 'value' || gk === 'quest' ? 10 : 0 }}>
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.isDark ? 'rgba(62,207,178,0.11)' : colors.tint, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20 }}>{g.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text1, maxWidth: '74%' }} numberOfLines={1}>{g.name}</Text>
            {done && (
              <View style={{ backgroundColor: colors.isDark ? 'rgba(62,207,178,0.18)' : colors.tint, borderRadius: 8, paddingVertical: 2, paddingHorizontal: 7 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.teal }}>{doneLabel}</Text>
              </View>
            )}
            <AlertBadge count={g.alerts?.length} />
            <LinkBadge count={g.links?.length} />
          </View>

          {/* Subtitle line per kind */}
          {standard && recurring && (
            <>
              <Text style={{ fontSize: 13, color: colors.text2, marginTop: 2 }} numberOfLines={1}>
                🔁 {pk === 'day' ? 'Daily' : pk === 'week' ? 'Weekly' : 'Monthly'} · {linked ? (log ? log.name : 'Linked log') : 'Manual'}
              </Text>
              {!!streak && (
                <Text style={{ fontSize: 12, color: colors.teal, marginTop: 2, fontWeight: '600' }} numberOfLines={1}>
                  🔥 {streak.current} {periodNoun(pk)} streak · best {streak.best} · {streak.total} total
                </Text>
              )}
            </>
          )}
          {standard && !recurring && (
            <>
              {showDeadline && (() => {
                const line = done ? (g.completedAt && fmtShort(g.completedAt) ? `Completed ${fmtShort(g.completedAt)}` : dstr) : dstr;
                return !!line && <Text style={{ fontSize: 13, color: colors.text2, marginTop: 2 }}>{line}</Text>;
              })()}
              {linked && (
                <Text style={{ fontSize: 12, color: colors.teal, marginTop: 2, fontWeight: '600' }} numberOfLines={1}>
                  🔗 {log ? log.name : 'Linked log'} · {windowLabel(g)}
                </Text>
              )}
            </>
          )}
          {gk === 'value' && (
            <Text style={{ fontSize: 13, color: colors.text2, marginTop: 2 }} numberOfLines={1}>
              📈 {score != null ? formatValue(score, g.unit) : '—'} / {formatValue(g.targetValue ?? 0, g.unit)}
            </Text>
          )}
          {gk === 'milestone' && (
            <Text style={{ fontSize: 13, color: msDone ? colors.teal : colors.text2, marginTop: 2 }} numberOfLines={1}>
              {msDone ? `🏁 Completed ${fmtShort(g.completedAt!)}` : `🏁 Milestone${showDeadline && !!dstr ? ` · ${dstr}` : ''}`}
            </Text>
          )}
          {gk === 'quest' && (
            <Text style={{ fontSize: 13, color: colors.text2, marginTop: 2 }} numberOfLines={1}>🧭 {quest.done} of {quest.total} milestones</Text>
          )}
          {!!g.note && (
            <Text style={{ fontSize: 13, color: colors.text2, marginTop: 2, fontStyle: 'italic' }} numberOfLines={1}>{g.note}</Text>
          )}
        </View>

        {/* Right-side indicator per kind */}
        <View style={{ alignItems: 'center' }}>
          {gk === 'milestone' ? (
            <TouchableOpacity onPress={() => setMilestoneDone(g.id, !msDone)}
              style={{ width: 30, height: 30, borderRadius: 8, borderWidth: 2, marginBottom: 6,
                borderColor: msDone ? colors.teal : colors.border, backgroundColor: msDone ? colors.teal : 'transparent',
                alignItems: 'center', justifyContent: 'center' }}>
              {msDone && <Text style={{ color: colors.isDark ? '#0A0A0F' : '#fff', fontSize: 16, fontWeight: '800' }}>✓</Text>}
            </TouchableOpacity>
          ) : standard && !recurring && showDeadline ? (
            done ? (
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
          ) : (gk === 'value' || gk === 'quest') && done ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.teal }}>✓</Text>
              <Text style={{ fontSize: 9, color: colors.teal, textTransform: 'uppercase', fontWeight: '700' }}>done</Text>
            </View>
          ) : null}
          <FavStar active={g.fav} onToggle={() => toggleFav(g.id)} />
        </View>
      </TouchableOpacity>

      {/* Second (progress) row — standard, value, quest. Milestone has none. */}
      {standard && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              {recurring ? (
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.teal }}>{prog} of {pt} {periodLabel(pk)}</Text>
              ) : linked ? (
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.teal }}>{prog.toLocaleString()} {g.unit}</Text>
              ) : (
                <TouchableOpacity onPress={() => router.push({ pathname: '/modals/exact-edit', params: { id: g.id } })} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.teal }}>{g.current.toLocaleString()} {g.unit}</Text>
                </TouchableOpacity>
              )}
              <Text style={{ fontSize: 12, color: colors.text2 }}>{recurring ? `${pt} / ${periodNoun(pk)}` : `${g.target.toLocaleString()} ${g.unit}`}</Text>
            </View>
            <View style={{ height: 6, backgroundColor: colors.track, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${gp}%` as DimensionValue, backgroundColor: colors.teal, borderRadius: 3 }} />
            </View>
          </View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.teal }}>{gp}%</Text>
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
      )}
      {(gk === 'value' || gk === 'quest') && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, height: 6, backgroundColor: colors.track, borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${gk === 'value' ? vpct : qpct}%` as DimensionValue, backgroundColor: colors.teal, borderRadius: 3 }} />
          </View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.teal }}>{gk === 'value' ? vpct : qpct}%</Text>
        </View>
      )}
    </View>
    </SwipeableRow>
  );
}
