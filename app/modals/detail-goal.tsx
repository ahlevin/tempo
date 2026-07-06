import { View, Text, DimensionValue } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '../../store/useStore';
import { useTheme } from '../../contexts/ThemeContext';
import { catColor, dayCountColor } from '../../constants/colors';
import { daysUntil, fmtDateTimeFull } from '../../utils/dates';
import { DetailScreen, DetailCard, DetailHeader, StatRow, Section, Field, remindersText } from '../../components/DetailView';

export default function GoalDetailModal() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const goals = useStore(s => s.goals);
  const g = goals.find(x => x.id === id);
  if (!g) { router.back(); return null; }

  const teal = colors.teal;
  const days = daysUntil(g.date);
  const pct  = Math.round(Math.min(100, (g.current / g.target) * 100));
  const done = g.current >= g.target;
  const deadline = fmtDateTimeFull(`${g.date}T00:00:00`, true);
  const subtitle = `🎯 Goal · ${done ? 'Complete' : `${pct}% complete`}`;

  return (
    <DetailScreen onEdit={() => router.push({ pathname: '/modals/edit-goal', params: { id: g.id } })}>
      <DetailCard>
        <DetailHeader emoji={g.emoji} tint={colors.isDark ? 'rgba(62,207,178,0.14)' : colors.tint}
          title={g.name} subtitle={subtitle} subtitleColor={teal} />
        <StatRow label="Deadline" context={deadline} value={days} valueColor={dayCountColor(colors, days)}
          valueCaption={days === 1 ? 'day left' : 'days left'} />

        <Section label="Progress">
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: teal, fontVariant: ['tabular-nums'] }}>{g.current.toLocaleString()}</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text2 }}>of {g.target.toLocaleString()} {g.unit}</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: teal, marginLeft: 'auto' }}>{pct}%</Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.track, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${pct}%` as DimensionValue, backgroundColor: teal, borderRadius: 4 }} />
          </View>
        </Section>
        <Section label="Deadline">
          <Field label="Target date" value={deadline || '—'} />
        </Section>
        <Section label="Reminders">
          <Field label="Alerts" value={remindersText(g.alerts)} />
        </Section>
        {!!g.note.trim() && (
          <Section label="Note">
            <Field label="" value={g.note.trim()} />
          </Section>
        )}
        <View style={{ height: 4 }} />
      </DetailCard>
    </DetailScreen>
  );
}
