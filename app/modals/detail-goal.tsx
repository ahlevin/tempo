import { useEffect } from 'react';
import { View, Text, TouchableOpacity, DimensionValue } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '../../store/useStore';
import { useTheme } from '../../contexts/ThemeContext';
import { dayCountColor } from '../../constants/colors';
import { daysUntil, fmtDateTimeFull, fmtShort } from '../../utils/dates';
import { DetailScreen, DetailCard, DetailHeader, StatRow, Section, Field, remindersText, LinksSection } from '../../components/DetailView';
import { DateTimeField } from '../../components/DateTimeField';
import { isLinkedGoal, goalDerivedProgress, goalDone, linkedLog, windowLabel, isRecurringGoal, hasDeadline,
  goalKind, valueScore, valueReached, valuePct, sortedAttempts, questChildren, questProgress, isGoalComplete } from '../../utils/goals';
import { currentPeriodProgress, goalStreak, goalPeriodKind, goalPeriodTarget, periodLabel, periodNoun } from '../../utils/recurring';
import { formatValue } from '../../utils/values';

export default function GoalDetailModal() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const goals = useStore(s => s.goals);
  const memories = useStore(s => s.memories);
  const attempts = useStore(s => s.goalAttempts);
  const setMilestoneDone = useStore(s => s.setMilestoneDone);
  const g = goals.find(x => x.id === id);
  useEffect(() => { if (!g) router.dismissTo('/tabs/goals'); }, [g]);
  if (!g) return null;

  const teal = colors.teal;
  const gk = goalKind(g);
  const edit = () => router.push({ pathname: '/modals/edit-goal', params: { id: g.id } });

  // ── VALUE ──────────────────────────────────────────────────────────────────
  if (gk === 'value') {
    const score = valueScore(g, attempts);
    const reached = valueReached(g, score);
    const pct = valuePct(g, score);
    const rows = sortedAttempts(g, attempts);
    const aggLabel = g.agg === 'sum' ? 'total' : g.agg === 'latest' ? 'latest' : 'best';
    return (
      <DetailScreen onEdit={edit}>
        <DetailCard>
          <DetailHeader emoji={g.emoji} tint={colors.isDark ? 'rgba(62,207,178,0.14)' : colors.tint}
            title={g.name} subtitle={`📈 Value goal · ${reached ? 'Reached ✓' : `target ${formatValue(g.targetValue ?? 0, g.unit)}`}`} subtitleColor={teal} />

          <StatRow label={aggLabel} context={`target ${formatValue(g.targetValue ?? 0, g.unit)}`}
            value={score != null ? formatValue(score, g.unit) : '—'}
            valueColor={reached ? teal : colors.text1} valueCaption={reached ? 'reached ✓' : (g.direction === 'lower' ? 'lower is better' : 'higher is better')} />

          <Section label="Progress">
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
              <Text style={{ fontSize: 26, fontWeight: '800', color: teal, fontVariant: ['tabular-nums'] }}>{score != null ? formatValue(score, g.unit) : '—'}</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text2 }}>/ {formatValue(g.targetValue ?? 0, g.unit)}</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: teal, marginLeft: 'auto' }}>{pct}%</Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.track, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${pct}%` as DimensionValue, backgroundColor: teal, borderRadius: 4 }} />
            </View>
            <TouchableOpacity onPress={() => router.push({ pathname: '/modals/log-attempt', params: { id: g.id } })}
              style={{ marginTop: 14, backgroundColor: colors.teal, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.isDark ? '#0A0A0F' : '#fff', fontWeight: '700', fontSize: 14 }}>＋ Log attempt</Text>
            </TouchableOpacity>
          </Section>

          <Section label={`Attempts · ${rows.length}`}>
            {rows.length === 0 ? (
              <Text style={{ fontSize: 13, color: colors.text3 }}>No attempts yet.</Text>
            ) : rows.map((a, i) => (
              <TouchableOpacity key={a.id} onPress={() => router.push({ pathname: '/modals/log-attempt', params: { id: g.id, attempt: a.id } })}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text1, fontVariant: ['tabular-nums'] }}>{formatValue(a.value, g.unit)}</Text>
                <Text style={{ fontSize: 13, color: colors.text2 }}>{fmtShort(a.occurredAt)}{a.note ? `  ·  ${a.note}` : ''}</Text>
              </TouchableOpacity>
            ))}
          </Section>

          <Footer g={g} recurring={false} />
        </DetailCard>
      </DetailScreen>
    );
  }

  // ── MILESTONE ──────────────────────────────────────────────────────────────
  if (gk === 'milestone') {
    const done = !!g.completedAt;
    const showDeadline = hasDeadline(g);
    const days = daysUntil(g.date);
    return (
      <DetailScreen onEdit={edit}>
        <DetailCard>
          <DetailHeader emoji={g.emoji} tint={colors.isDark ? 'rgba(62,207,178,0.14)' : colors.tint}
            title={g.name} subtitle={`🏁 Milestone · ${done ? 'Done' : 'Not yet'}`} subtitleColor={teal} />
          {showDeadline && !done && (
            <StatRow label="Target date" context={fmtDateTimeFull(`${g.date}T00:00:00`, true)}
              value={days} valueColor={dayCountColor(colors, days)} valueCaption={days === 1 ? 'day left' : 'days left'} />
          )}
          <Section label="Status">
            <TouchableOpacity onPress={() => setMilestoneDone(g.id, !done)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5,
                borderColor: done ? colors.teal : colors.border, backgroundColor: done ? (colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint) : colors.glass }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: done ? colors.teal : colors.border,
                backgroundColor: done ? colors.teal : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {done && <Text style={{ color: colors.isDark ? '#0A0A0F' : '#fff', fontSize: 16, fontWeight: '800' }}>✓</Text>}
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: done ? colors.teal : colors.text1 }}>
                {done ? `Completed ${fmtShort(g.completedAt!)}` : 'Mark complete'}
              </Text>
            </TouchableOpacity>
            {done && (
              <View style={{ marginTop: 12 }}>
                <DateTimeField mode="date" label="Completion date"
                  value={(g.completedAt ?? '').slice(0, 10)}
                  onChange={d => setMilestoneDone(g.id, true, d)} />
              </View>
            )}
          </Section>
          <Footer g={g} recurring={false} />
        </DetailCard>
      </DetailScreen>
    );
  }

  // ── QUEST ──────────────────────────────────────────────────────────────────
  if (gk === 'quest') {
    const children = questChildren(g, goals);
    const { done, total } = questProgress(g, goals, memories, attempts);
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return (
      <DetailScreen onEdit={edit}>
        <DetailCard>
          <DetailHeader emoji={g.emoji} tint={colors.isDark ? 'rgba(62,207,178,0.14)' : colors.tint}
            title={g.name} subtitle={`🧭 Quest · ${done} of ${total} · ${pct}%`} subtitleColor={teal} />
          <StatRow label="Milestones" context={`${pct}% complete`} value={`${done}/${total}`} valueColor={teal} valueCaption="done" />
          <Section label={`Milestones · ${total}`}>
            {children.length === 0 ? (
              <Text style={{ fontSize: 13, color: colors.text3 }}>No milestones yet — add them from Edit.</Text>
            ) : children.map((c, i) => {
              const cdone = isGoalComplete(c, goals, memories, attempts);
              return (
                <TouchableOpacity key={c.id} onPress={() => router.push({ pathname: '/modals/detail-goal', params: { id: c.id } })}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
                    borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
                  <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: cdone ? colors.teal : colors.border,
                    backgroundColor: cdone ? colors.teal : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {cdone && <Text style={{ color: colors.isDark ? '#0A0A0F' : '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text>}
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text1 }} numberOfLines={1}>{c.emoji} {c.name}</Text>
                  <Text style={{ fontSize: 15, color: colors.text3 }}>›</Text>
                </TouchableOpacity>
              );
            })}
          </Section>
          <Footer g={g} recurring={false} />
        </DetailCard>
      </DetailScreen>
    );
  }

  // ── COUNT / COLLECTION / STREAK — unchanged from before ──────────────────────
  const days = daysUntil(g.date);
  const linked = isLinkedGoal(g);
  const recurring = isRecurringGoal(g);
  const log  = linked ? linkedLog(g, memories) : undefined;
  const showDeadline = hasDeadline(g);
  const pk   = goalPeriodKind(g);
  const pt   = goalPeriodTarget(g);
  const prog = recurring ? currentPeriodProgress(g, memories) : (linked ? goalDerivedProgress(g, memories) : g.current);
  const denom = recurring ? pt : g.target;
  const pct  = denom > 0 ? Math.round(Math.min(100, (prog / denom) * 100)) : 0;
  const done = recurring ? prog >= pt : (linked ? goalDone(g, memories) : g.current >= g.target);
  const streak = recurring ? goalStreak(g, memories) : null;
  const deadline = fmtDateTimeFull(`${g.date}T00:00:00`, true);
  const subtitle = recurring
    ? `🔁 ${pk === 'day' ? 'Daily' : pk === 'week' ? 'Weekly' : 'Monthly'} goal · ${done ? `met ${periodLabel(pk)}` : `${pct}% ${periodLabel(pk)}`}`
    : `🎯 Goal · ${done ? 'Complete' : `${pct}% complete`}`;

  return (
    <DetailScreen onEdit={edit}>
      <DetailCard>
        <DetailHeader emoji={g.emoji} tint={colors.isDark ? 'rgba(62,207,178,0.14)' : colors.tint}
          title={g.name} subtitle={subtitle} subtitleColor={teal} />

        {recurring ? (
          <StatRow label="Current streak" context={`best ${streak!.best} · ${streak!.total} total`}
            value={streak!.current} valueColor={teal} valueCaption={`${periodNoun(pk)} streak`} />
        ) : showDeadline ? (
          <StatRow label="Target date" context={deadline}
            value={done ? '✓' : days}
            valueColor={done ? teal : dayCountColor(colors, days)}
            valueCaption={done ? 'complete' : (days === 1 ? 'day left' : 'days left')} />
        ) : null}

        <Section label={recurring ? `Progress ${periodLabel(pk)}` : 'Progress'}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: teal, fontVariant: ['tabular-nums'] }}>{prog.toLocaleString()}</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text2 }}>
              of {denom.toLocaleString()} {recurring ? `per ${periodNoun(pk)}` : g.unit}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: teal, marginLeft: 'auto' }}>{pct}%</Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.track, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${pct}%` as DimensionValue, backgroundColor: teal, borderRadius: 4 }} />
          </View>
          {linked && (
            <Text style={{ fontSize: 12, color: colors.text2, marginTop: 8 }}>
              🔗 Derived from {log ? log.name : 'a life log'}{recurring ? ` · entries dated ${periodLabel(pk)}` : ` · ${windowLabel(g)}`} — updates automatically.
            </Text>
          )}
          {recurring && !linked && (
            <Text style={{ fontSize: 12, color: colors.text2, marginTop: 8 }}>
              Manual counter · resets each {periodNoun(pk)}. Tap +/− on the goal card.
            </Text>
          )}
        </Section>

        {recurring && (
          <Section label="Streak">
            <Field label="Current" value={`${streak!.current} ${periodNoun(pk)}${streak!.current === 1 ? '' : 's'} in a row`} />
            <Field label="Best" value={`${streak!.best} ${periodNoun(pk)}${streak!.best === 1 ? '' : 's'}`} />
            <Field label={`Total ${periodNoun(pk)}s met`} value={`${streak!.total}`} />
          </Section>
        )}

        <Footer g={g} recurring={recurring} />
      </DetailCard>
    </DetailScreen>
  );
}

// Reminders + Note + Links + Created/Completed dates — shared across all kinds.
function Footer({ g, recurring }: { g: import('../../store/types').Goal; recurring: boolean }) {
  return (
    <>
      <Section label="Reminders">
        <Field label="Alerts" value={remindersText(g.alerts)} />
      </Section>
      {!!g.note.trim() && (
        <Section label="Note">
          <Field label="" value={g.note.trim()} />
        </Section>
      )}
      <LinksSection links={g.links} />
      {!!fmtShort(g.created) && (
        <Section label="Dates">
          <Field label="Created" value={fmtShort(g.created)} />
          {!recurring && !!g.completedAt && !!fmtShort(g.completedAt) && (
            <Field label="Completed" value={fmtShort(g.completedAt)} />
          )}
        </Section>
      )}
      <View style={{ height: 4 }} />
    </>
  );
}
