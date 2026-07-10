import { View, Text, DimensionValue } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '../../store/useStore';
import { useTheme } from '../../contexts/ThemeContext';
import { dayCountColor } from '../../constants/colors';
import { daysUntil, fmtDateTimeFull } from '../../utils/dates';
import { DetailScreen, DetailCard, DetailHeader, StatRow, Section, Field, remindersText, LinksSection } from '../../components/DetailView';
import { isLinkedGoal, goalDerivedProgress, goalDone, linkedLog, windowLabel, isRecurringGoal, hasDeadline } from '../../utils/goals';
import { currentPeriodProgress, goalStreak, goalPeriodKind, goalPeriodTarget, periodLabel, periodNoun } from '../../utils/recurring';

export default function GoalDetailModal() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const goals = useStore(s => s.goals);
  const memories = useStore(s => s.memories);
  const g = goals.find(x => x.id === id);
  if (!g) { router.back(); return null; }

  const teal = colors.teal;
  const days = daysUntil(g.date);
  const linked = isLinkedGoal(g);
  const recurring = isRecurringGoal(g);
  const log  = linked ? linkedLog(g, memories) : undefined;
  const showDeadline = hasDeadline(g);

  const kind = goalPeriodKind(g);
  const pt   = goalPeriodTarget(g);
  const prog = recurring ? currentPeriodProgress(g, memories) : (linked ? goalDerivedProgress(g, memories) : g.current);
  const denom = recurring ? pt : g.target;
  const pct  = denom > 0 ? Math.round(Math.min(100, (prog / denom) * 100)) : 0;
  const done = recurring ? prog >= pt : (linked ? goalDone(g, memories) : g.current >= g.target);
  const streak = recurring ? goalStreak(g, memories) : null;
  const deadline = fmtDateTimeFull(`${g.date}T00:00:00`, true);
  const subtitle = recurring
    ? `🔁 ${kind === 'day' ? 'Daily' : kind === 'week' ? 'Weekly' : 'Monthly'} goal · ${done ? `met ${periodLabel(kind)}` : `${pct}% ${periodLabel(kind)}`}`
    : `🎯 Goal · ${done ? 'Complete' : `${pct}% complete`}`;

  return (
    <DetailScreen onEdit={() => router.push({ pathname: '/modals/edit-goal', params: { id: g.id } })}>
      <DetailCard>
        <DetailHeader emoji={g.emoji} tint={colors.isDark ? 'rgba(62,207,178,0.14)' : colors.tint}
          title={g.name} subtitle={subtitle} subtitleColor={teal} />

        {recurring ? (
          <StatRow label="Current streak" context={`best ${streak!.best} · ${streak!.total} total`}
            value={streak!.current} valueColor={teal} valueCaption={`${periodNoun(kind)} streak`} />
        ) : showDeadline ? (
          <StatRow label="Deadline" context={deadline} value={days} valueColor={dayCountColor(colors, days)}
            valueCaption={days === 1 ? 'day left' : 'days left'} />
        ) : null}

        <Section label={recurring ? `Progress ${periodLabel(kind)}` : 'Progress'}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: teal, fontVariant: ['tabular-nums'] }}>{prog.toLocaleString()}</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text2 }}>
              of {denom.toLocaleString()} {recurring ? `per ${periodNoun(kind)}` : g.unit}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: teal, marginLeft: 'auto' }}>{pct}%</Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.track, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${pct}%` as DimensionValue, backgroundColor: teal, borderRadius: 4 }} />
          </View>
          {linked && (
            <Text style={{ fontSize: 12, color: colors.text2, marginTop: 8 }}>
              🔗 Derived from {log ? log.name : 'a life log'}{recurring ? ` · entries dated ${periodLabel(kind)}` : ` · ${windowLabel(g)}`} — updates automatically.
            </Text>
          )}
          {recurring && !linked && (
            <Text style={{ fontSize: 12, color: colors.text2, marginTop: 8 }}>
              Manual counter · resets each {periodNoun(kind)}. Tap +/− on the goal card.
            </Text>
          )}
        </Section>

        {recurring ? (
          <Section label="Streak">
            <Field label="Current" value={`${streak!.current} ${periodNoun(kind)}${streak!.current === 1 ? '' : 's'} in a row`} />
            <Field label="Best" value={`${streak!.best} ${periodNoun(kind)}${streak!.best === 1 ? '' : 's'}`} />
            <Field label={`Total ${periodNoun(kind)}s met`} value={`${streak!.total}`} />
          </Section>
        ) : showDeadline ? (
          <Section label="Deadline">
            <Field label="Target date" value={deadline || '—'} />
          </Section>
        ) : null}

        <Section label="Reminders">
          <Field label="Alerts" value={remindersText(g.alerts)} />
        </Section>
        {!!g.note.trim() && (
          <Section label="Note">
            <Field label="" value={g.note.trim()} />
          </Section>
        )}
        <LinksSection links={g.links} />
        <View style={{ height: 4 }} />
      </DetailCard>
    </DetailScreen>
  );
}
