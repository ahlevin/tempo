import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useStore } from '../../store/useStore';
import { HeroCarousel } from '../../components/HeroCarousel';
import { QuoteCard } from '../../components/QuoteCard';
import { DateWeatherBar } from '../../components/DateWeatherBar';
import { MemoryCard } from '../../components/MemoryCard';
import { EventCard } from '../../components/EventCard';
import { GoalCard } from '../../components/GoalCard';
import { AddChooser } from '../../components/AddChooser';
import { UpcomingMemoryRow } from '../../components/UpcomingMemoryRow';
import { Event, Memory } from '../../store/types';
import { CATEGORIES } from '../../constants/data';
import { catColor } from '../../constants/colors';
import { nextOccurrence, nextAnnual, daysUntil } from '../../utils/dates';

// Home-screen filter pills: All, the 7 event categories, the 3 recurring memory
// types, and Goals. Selecting a category shows those events; a memory-type shows
// those memories; Goals shows goals.
const FILTERS: { id: string; label: string; emoji: string }[] = [
  { id: 'all', label: 'All', emoji: '' },
  ...CATEGORIES.map(c => ({ id: c.id, label: c.short, emoji: c.emoji })),
  { id: 'birthday',    label: 'Birthdays',     emoji: '🎂' },
  { id: 'anniversary', label: 'Anniversaries', emoji: '💍' },
  { id: 'memorial',    label: 'Memorials',     emoji: '🕊️' },
  { id: 'goal',        label: 'Goals',         emoji: '🎯' },
];

// A row in the "Upcoming" list: either an event or a recurring
// birthday/anniversary memory. Sorted together by days-until-next-occurrence.
type UpcomingItem = { kind: 'event'; data: Event } | { kind: 'memory'; data: Memory };
const upcomingDays = (it: UpcomingItem) =>
  it.kind === 'event' ? daysUntil(nextOccurrence(it.data)) : daysUntil(nextAnnual(it.data.originDate));

export default function HomeScreen() {
  const { colors } = useTheme();
  const events      = useStore(s => s.events);
  const goals       = useStore(s => s.goals);
  const memories    = useStore(s => s.memories);
  const prefs       = useStore(s => s.prefs);
  const [filter, setFilter] = useState('all');
  const [chooserOpen, setChooserOpen] = useState(false);

  const isCat     = CATEGORIES.some(c => c.id === filter);
  const isMemType = filter === 'birthday' || filter === 'anniversary' || filter === 'memorial';
  const isGoal    = filter === 'goal';
  const isAll     = filter === 'all';

  // Upcoming list: 'all' interleaves events + recurring memories; a category pill
  // narrows to those events; a memory-type pill narrows to those memories. All
  // sorted by soonest next occurrence.
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
  upcoming.sort((a, b) => upcomingDays(a) - upcomingDays(b));

  // Section visibility. Goals + the full Memories/Life-Log list only appear under
  // "All" (or the Goals pill); a specific pill shows just its matching Upcoming list.
  const showUpcoming = isAll || isCat || isMemType;
  const showGoals    = isAll || isGoal;
  const showMemories = isAll;
  const upcomingTitle = isAll ? 'Upcoming' : (FILTERS.find(f => f.id === filter)?.label ?? 'Upcoming');

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

        {/* Upcoming (events + recurring memories, filtered) */}
        {showUpcoming && <>
          <SectionHeader title={upcomingTitle} onAdd={() => setChooserOpen(true)} />
          {upcoming.length === 0 ? (
            <EmptyPrompt icon="⏳" text="Nothing here yet — tap to start counting down to something."
              onPress={() => setChooserOpen(true)} />
          ) : upcoming.map(it => it.kind === 'event'
              ? <EventCard key={`e-${it.data.id}`} event={it.data} />
              : <UpcomingMemoryRow key={`m-${it.data.id}`} memory={it.data} />)}
        </>}

        {/* Goals */}
        {showGoals && <>
          <SectionHeader title="Goals" onAdd={() => router.push('/modals/add-goal')} />
          {goals.length === 0
            ? <EmptyPrompt icon="🎯" text="No goals yet — tap to set something you're working toward."
                onPress={() => router.push('/modals/add-goal')} />
            : goals.map(g => <GoalCard key={g.id} goal={g} />)}
        </>}

        {/* Memories (full cards incl. Life Log) — only under "All" */}
        {showMemories && <>
          <SectionHeader title="Memories & Life Log" onAdd={() => router.push('/modals/add-memory')} />
          {memories.length === 0
            ? <EmptyPrompt icon="📸" text="No memories yet — tap to remember a birthday, anniversary, or life log."
                onPress={() => router.push('/modals/add-memory')} />
            : memories.map(m => <MemoryCard key={m.id} memory={m} />)}
        </>}

        {/* Integrations */}
        <SectionHeader title="Integrations" />
        {[
          { icon:'📅', title:'Connect Your Calendar', sub:'Sync with Google, Apple & Outlook' },
          { icon:'📲', title:'Home Screen Widgets',   sub:'Glanceable countdowns at a glance' },
        ].map((card,i) => (
          <View key={i} style={{ flexDirection:'row', alignItems:'center', gap:14,
            backgroundColor: colors.isDark ? 'rgba(62,207,178,0.08)' : colors.surf2, borderWidth:1,
            borderColor: colors.isDark ? 'rgba(62,207,178,0.18)' : colors.border,
            borderRadius:18, padding:14, marginBottom:9 }}>
            <Text style={{ fontSize:24 }}>{card.icon}</Text>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:14, fontWeight:'700', color:colors.text1 }}>{card.title}</Text>
              <Text style={{ fontSize:12, color:colors.text2, marginTop:2 }}>{card.sub}</Text>
            </View>
            <View style={{ backgroundColor: colors.isDark ? 'rgba(62,207,178,0.14)' : colors.tint, borderWidth:1,
              borderColor: colors.isDark ? 'rgba(62,207,178,0.28)' : colors.border, borderRadius:20,
              paddingVertical:5, paddingHorizontal:10 }}>
              <Text style={{ fontSize:12, fontWeight:'600', color:colors.teal }}>Soon</Text>
            </View>
          </View>
        ))}
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

function SectionHeader({ title, onAdd }: { title:string; onAdd?:()=>void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection:'row', alignItems:'baseline', justifyContent:'space-between',
      marginTop:22, marginBottom:10, marginHorizontal:4 }}>
      <Text style={{ fontSize:18, fontWeight:'700', color:colors.text1, letterSpacing:-0.3 }}>{title}</Text>
      {onAdd && (
        <TouchableOpacity onPress={onAdd}>
          <Text style={{ fontSize:13, color:colors.accent, fontWeight:'500' }}>+ Add</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}


function EmptyPrompt({ icon, text, onPress }: { icon:string; text:string; onPress:()=>void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={{ alignItems:'center', paddingVertical:26, paddingHorizontal:20,
        backgroundColor:colors.glass, borderRadius:18, borderWidth:1,
        borderColor:colors.border, borderStyle:'dashed' }}>
      <Text style={{ fontSize:30, marginBottom:10 }}>{icon}</Text>
      <Text style={{ color:colors.text2, fontSize:14, textAlign:'center', lineHeight:20 }}>{text}</Text>
      <View style={{ marginTop:12, backgroundColor: colors.isDark ? 'rgba(124,106,245,0.15)' : colors.tint, borderWidth:1,
        borderColor: colors.isDark ? 'rgba(124,106,245,0.3)' : colors.border, borderRadius:20, paddingVertical:7, paddingHorizontal:16 }}>
        <Text style={{ color:colors.accent, fontSize:13, fontWeight:'700' }}>+ Add</Text>
      </View>
    </TouchableOpacity>
  );
}
