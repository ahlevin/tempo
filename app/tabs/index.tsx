import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useStore } from '../../store/useStore';
import { HeroCarousel } from '../../components/HeroCarousel';
import { QuoteCard } from '../../components/QuoteCard';
import { DateWeatherBar } from '../../components/DateWeatherBar';
import { EventCard } from '../../components/EventCard';
import { AddChooser } from '../../components/AddChooser';
import { UpcomingMemoryRow } from '../../components/UpcomingMemoryRow';
import { HolidayRow } from '../../components/HolidayRow';
import { UpcomingLogRow } from '../../components/UpcomingLogRow';
import { SectionHeader, EmptyPrompt } from '../../components/SectionUI';
import { Event, Memory } from '../../store/types';
import { CATEGORIES } from '../../constants/data';
import { catColor } from '../../constants/colors';
import { visibleHolidays, HolidayItem } from '../../constants/holidays';
import { upcomingLogItems, UpcomingLogItem } from '../../utils/lifelog';
import { nextOccurrence, nextAnnual, daysUntil } from '../../utils/dates';

// Countdowns filter pills: All, the 7 event categories, and the 3 recurring
// memory types. (Goals and Life Logs live in their own tabs now.)
const FILTERS: { id: string; label: string; emoji: string }[] = [
  { id: 'all', label: 'All', emoji: '' },
  ...CATEGORIES.map(c => ({ id: c.id, label: c.short, emoji: c.emoji })),
  { id: 'birthday',    label: 'Birthdays',     emoji: '🎂' },
  { id: 'anniversary', label: 'Anniversaries', emoji: '💍' },
  { id: 'memorial',    label: 'Memorials',     emoji: '🕊️' },
];

// A row in the "Upcoming" list: an event, a recurring memory, or a visible
// holiday. Sorted together by days-until-next-occurrence.
type UpcomingItem =
  | { kind: 'event'; data: Event }
  | { kind: 'memory'; data: Memory }
  | { kind: 'holiday'; data: HolidayItem }
  | { kind: 'logentry'; data: UpcomingLogItem };
const upcomingDays = (it: UpcomingItem) =>
  it.kind === 'event' ? daysUntil(nextOccurrence(it.data))
  : it.kind === 'memory' ? daysUntil(nextAnnual(it.data.originDate))
  : it.data.days;

export default function HomeScreen() {
  const { colors } = useTheme();
  const events      = useStore(s => s.events);
  const memories    = useStore(s => s.memories);
  const prefs       = useStore(s => s.prefs);
  const [filter, setFilter] = useState('all');
  const [chooserOpen, setChooserOpen] = useState(false);

  const isCat     = CATEGORIES.some(c => c.id === filter);
  const isMemType = filter === 'birthday' || filter === 'anniversary' || filter === 'memorial';
  const isAll     = filter === 'all';

  // Countdowns list: 'all' interleaves events + recurring memories + holidays; a
  // category pill narrows to those events; a memory-type pill narrows to those
  // memories. All sorted by soonest next occurrence.
  const upcoming: UpcomingItem[] = [];
  if (isAll || isCat) {
    events
      .filter(e => isAll || e.cat === filter)
      .forEach(e => upcoming.push({ kind: 'event', data: e }));
  }
  if (isAll) {
    memories
      .filter(m => m.type === 'birthday' || m.type === 'anniversary' || m.type === 'memorial')
      .forEach(m => upcoming.push({ kind: 'memory', data: m }));
  } else if (isMemType) {
    memories
      .filter(m => m.type === filter)
      .forEach(m => upcoming.push({ kind: 'memory', data: m }));
  }
  // Visible holidays (derived, never stored) show under "All" and the Holidays pill.
  if (isAll || filter === 'holidays') {
    visibleHolidays(prefs.holidays).forEach(h => upcoming.push({ kind: 'holiday', data: h }));
  }
  // Future-dated life-log entries surface as countdowns until their date passes
  // (derived from the entry date — no stored event, auto-transitions to completed).
  if (isAll) {
    upcomingLogItems(memories).forEach(it => upcoming.push({ kind: 'logentry', data: it }));
  }
  upcoming.sort((a, b) => upcomingDays(a) - upcomingDays(b));

  const listTitle = isAll ? 'Upcoming' : (FILTERS.find(f => f.id === filter)?.label ?? 'Upcoming');

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.bg }} edges={['top']}>
      <View style={{ paddingHorizontal:20, paddingBottom:10 }}>
        {/* Light "Yacht Club": the wordmark sits on a solid navy block so the
            brand reads against the cool off-white. Dark keeps the plain header. */}
        <View style={colors.isDark ? undefined : {
          backgroundColor:'#002C54', borderRadius:16,
          paddingHorizontal:16, paddingVertical:12, marginTop:4 }}>
          <Text style={{ fontSize:24, fontWeight:'700',
            color: colors.isDark ? colors.text1 : '#FFFFFF', letterSpacing:-0.5 }}>
            sayZay<Text style={{ color: colors.isDark ? colors.accent : '#ACBEBE' }}>.</Text>
          </Text>
          <Text style={{ fontSize:12, color: colors.isDark ? colors.text3 : '#9FB3C8', marginTop:2 }}>
            Countdowns &amp; Memories
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal:16, paddingBottom:120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Date + Weather */}
        <DateWeatherBar />

        {/* Hero Carousel */}
        <HeroCarousel />

        {/* Quote of the Day */}
        <QuoteCard type={prefs.quotePref} />

        {/* Filter pills — long, horizontally scrollable. Selected pill uses the
            item's own accent color. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ marginBottom:16 }} contentContainerStyle={{ gap:8 }}>
          {FILTERS.map(f => {
            const sel = filter === f.id;
            const pc  = catColor(colors, f.id); // item color (theme accent for 'all')
            return (
              <TouchableOpacity key={f.id} onPress={() => setFilter(f.id)}
                style={{ paddingVertical:7, paddingHorizontal:14, borderRadius:20, borderWidth:1,
                  borderColor: sel ? pc : colors.border,
                  backgroundColor: sel
                    ? (colors.isDark ? colors.glass : pc)
                    : (colors.isDark ? colors.glass : colors.surf) }}>
                <Text style={{ fontSize:12, fontWeight:'600',
                  color: sel
                    ? (colors.isDark ? pc : '#FFFFFF')
                    : (colors.isDark ? colors.text2 : colors.text1) }}>
                  {f.emoji ? `${f.emoji} ${f.label}` : f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Countdowns: events + birthdays/anniversaries/memorials + holidays */}
        <SectionHeader title={listTitle} onAdd={() => setChooserOpen(true)} />
        {upcoming.length === 0 ? (
          <EmptyPrompt icon="⏳" text="Nothing here yet — tap to start counting down to something."
            onPress={() => setChooserOpen(true)} />
        ) : upcoming.map(it => it.kind === 'event'
            ? <EventCard key={`e-${it.data.id}`} event={it.data} />
            : it.kind === 'memory'
            ? <UpcomingMemoryRow key={`m-${it.data.id}`} memory={it.data} />
            : it.kind === 'holiday'
            ? <HolidayRow key={`h-${it.data.id}`} item={it.data} />
            : <UpcomingLogRow key={`l-${it.data.memId}-${it.data.index}`} item={it.data} />)}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity onPress={() => setChooserOpen(true)}
        style={{ position:'absolute', bottom:90, right:20, width:54, height:54,
          borderRadius:27, backgroundColor: colors.isDark ? colors.accent : colors.rose,
          alignItems:'center', justifyContent:'center',
          shadowColor: colors.isDark ? colors.accent : colors.rose, shadowOffset:{width:0,height:8},
          shadowOpacity:0.45, shadowRadius:16, elevation:8 }}>
        <Text style={{ fontSize:28, color:'#fff', lineHeight:32 }}>+</Text>
      </TouchableOpacity>

      <AddChooser visible={chooserOpen} onClose={() => setChooserOpen(false)} />
    </SafeAreaView>
  );
}
