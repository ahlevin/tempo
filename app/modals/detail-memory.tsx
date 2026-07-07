import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '../../store/useStore';
import { useTheme } from '../../contexts/ThemeContext';
import { catColor, catBg, dayCountColor } from '../../constants/colors';
import { nextAnnual, daysUntil, yearsMonthsDays, ordinal, fmtFull, fmtShortNoYear, fmtMonthDay } from '../../utils/dates';
import { DetailScreen, DetailCard, DetailHeader, StatRow, Section, Field, remindersText, LinksSection } from '../../components/DetailView';

const TYPE_META: Record<'birthday' | 'anniversary' | 'memorial', { emoji: string; label: string }> = {
  birthday:    { emoji: '🎂', label: 'Birthday' },
  anniversary: { emoji: '💍', label: 'Anniversary' },
  memorial:    { emoji: '🕊️', label: 'Memorial' },
};

export default function MemoryDetailModal() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const memories = useStore(s => s.memories);
  const m = memories.find(x => x.id === id);
  if (!m) { router.back(); return null; }
  // Life logs have their own richer detail view (entries list + add).
  if (m.type === 'lifelog') { router.replace({ pathname: '/modals/lifelog-detail', params: { id: m.id } }); return null; }

  const meta = TYPE_META[m.type];
  const accent = m.type === 'memorial' ? catColor(colors, 'memorial')
    : (colors.isDark ? catColor(colors, m.type) : colors.accent);
  const nb   = nextAnnual(m.originDate);
  const days = daysUntil(nb);
  const r    = yearsMonthsDays(m.originDate);
  const nextFull = fmtFull(nb);

  // "Turning 34" / "34th anniversary" / "Remembering · 34 years" (suppressed when
  // the year is unknown — then we show the month/day only).
  const num = r.y + 1;
  const milestone = m.yearUnknown ? fmtMonthDay(m.originDate)
    : m.type === 'birthday' ? `Turning ${num}`
    : m.type === 'memorial' ? `Remembering · ${num} years`
    : `${ordinal(num)} anniversary`;
  const ageLabel = m.type === 'birthday' ? 'Age' : m.type === 'memorial' ? 'Years since' : 'Years together';
  const ageValue = m.type === 'birthday' ? `${r.y} years old`
    : m.type === 'memorial' ? `${r.y} years` : `${r.y} ${r.y === 1 ? 'year' : 'years'}`;

  return (
    <DetailScreen onEdit={() => router.push({ pathname: '/modals/edit-memory', params: { id: m.id } })}>
      <DetailCard>
        <DetailHeader emoji={m.emoji} tint={catBg(colors, m.type)} title={m.name}
          subtitle={`${meta.emoji} ${meta.label} · ${milestone}`} subtitleColor={accent} />
        <StatRow label="Next" context={nextFull} value={days} valueColor={dayCountColor(colors, days)}
          valueCaption={days === 1 ? 'day away' : 'days away'} />

        {!m.yearUnknown && (
          <Section label={ageLabel}>
            <Field label="" value={ageValue} />
          </Section>
        )}
        <Section label="Next occurrence">
          <Field label={m.type === 'birthday' ? 'Next birthday' : m.type === 'memorial' ? 'Next remembrance' : 'Next anniversary'}
            value={(m.yearUnknown ? fmtShortNoYear(nb) : nextFull) || '—'} />
          <Field label="Original date" value={(m.yearUnknown ? fmtMonthDay(m.originDate) : fmtFull(m.originDate)) || '—'} />
        </Section>
        <Section label="Reminders">
          <Field label="Alerts" value={remindersText(m.alerts)} />
        </Section>
        {!!m.note.trim() && (
          <Section label="Note">
            <Field label="" value={m.note.trim()} />
          </Section>
        )}
        <LinksSection links={m.links} />
        <View style={{ height: 4 }} />
      </DetailCard>
    </DetailScreen>
  );
}
