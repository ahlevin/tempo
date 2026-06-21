import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useStore } from '../../store/useStore';
import { HeroCarousel } from '../../components/HeroCarousel';
import { QuoteCard } from '../../components/QuoteCard';
import { DateWeatherBar } from '../../components/DateWeatherBar';
import { MemoryCard } from '../../components/MemoryCard';
import { EventCard } from '../../components/EventCard';
import { GoalCard } from '../../components/GoalCard';
import { nextOccurrence, daysUntil } from '../../utils/dates';

export default function HomeScreen() {
  const events      = useStore(s => s.events);
  const goals       = useStore(s => s.goals);
  const memories    = useStore(s => s.memories);
  const prefs       = useStore(s => s.prefs);
  const [filter, setFilter] = useState('all');

  const FILTERS = [
    { id:'all',         label:'All' },
    { id:'travel',      label:'✈️ Travel' },
    { id:'celebration', label:'🎉 Celebration' },
    { id:'work',        label:'💼 Work' },
    { id:'personal',    label:'❤️ Personal' },
    { id:'goal',        label:'🎯 Goals' },
  ];

  const filteredEvents = filter === 'goal' ? [] :
    events
      .filter(e => filter === 'all' || e.cat === filter)
      .sort((a,b) => daysUntil(nextOccurrence(a)) - daysUntil(nextOccurrence(b)));

  const showGoals = filter === 'all' || filter === 'goal';
  const soonest = [...events].sort((a,b) => daysUntil(a.start) - daysUntil(b.start))[0];

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:Colors.bg }} edges={['top']}>
      <View style={{ paddingHorizontal:20, paddingBottom:10 }}>
        <Text style={{ fontSize:24, fontWeight:'700', color:Colors.text1, letterSpacing:-0.5 }}>
          sayZay<Text style={{ color:Colors.accent }}>.</Text>
        </Text>
        <Text style={{ fontSize:12, color:Colors.text3, marginTop:2 }}>
          Countdowns &amp; Memories
        </Text>
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

        {/* Filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ marginBottom:16 }} contentContainerStyle={{ gap:8 }}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f.id} onPress={() => setFilter(f.id)}
              style={{ paddingVertical:7, paddingHorizontal:14, borderRadius:20, borderWidth:1,
                borderColor: filter===f.id ? 'rgba(124,106,245,0.4)' : Colors.border,
                backgroundColor: filter===f.id ? 'rgba(124,106,245,0.2)' : Colors.glass }}>
              <Text style={{ fontSize:12, fontWeight:'600',
                color: filter===f.id ? Colors.accent : Colors.text2 }}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Events */}
        <SectionHeader title="Upcoming" onAdd={() => router.push('/modals/add-event')} />
        {filteredEvents.length === 0 && filter !== 'goal' ? (
          <EmptyState text="No events yet. Tap + Add to create one." />
        ) : filteredEvents.map(e => <EventCard key={e.id} event={e} />)}

        {/* Goals */}
        {showGoals && <>
          <SectionHeader title="Goals" onAdd={() => router.push('/modals/add-goal')} />
          {goals.length === 0
            ? <EmptyState text="No goals yet. Tap + Add to create one." />
            : goals.map(g => <GoalCard key={g.id} goal={g} />)}
        </>}

        {/* Milestones */}
        <SectionHeader title="Milestones" />
        {soonest ? (() => {
          const days = daysUntil(soonest.start);
          return (
            <View style={{ gap:8 }}>
              {[
                { label:'1 week to go',  thr:7,  icon:'🔥' },
                { label:'1 month to go', thr:30, icon:'📅' },
                { label:'3 months out',  thr:90, icon:'🗓️' },
              ].map((s,i) => {
                const dt    = days - s.thr;
                const badge = dt < 0 ? '✓ Passed' : 'In ' + dt + 'd';
                const color = dt < 0 ? Colors.rose : dt <= 10 ? Colors.amber : Colors.teal;
                const bg    = dt < 0 ? 'rgba(232,80,122,0.15)' :
                  dt <= 10 ? 'rgba(240,160,75,0.12)' : 'rgba(62,207,178,0.1)';
                return (
                  <View key={i} style={{ flexDirection:'row', alignItems:'center', gap:11,
                    padding:11, backgroundColor:Colors.surf, borderRadius:14,
                    borderWidth:1, borderColor:Colors.border }}>
                    <Text style={{ fontSize:16 }}>{s.icon}</Text>
                    <View style={{ flex:1 }}>
                      <Text style={{ fontSize:13, fontWeight:'600', color:Colors.text1 }}>{s.label}</Text>
                      <Text style={{ fontSize:11, color:Colors.text3 }}>
                        for {soonest.emoji} {soonest.name}
                      </Text>
                    </View>
                    <View style={{ backgroundColor:bg, borderRadius:20,
                      paddingVertical:3, paddingHorizontal:9 }}>
                      <Text style={{ fontSize:11, fontWeight:'700', color }}>{badge}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })() : <EmptyState text="Add events to see milestones." />}

        {/* Memories */}
        <SectionHeader title="Memories & Life Log" onAdd={() => router.push('/modals/add-memory')} />
        {memories.length === 0
          ? <EmptyState text="No memories yet. Tap + Add to create one." />
          : memories.map(m => <MemoryCard key={m.id} memory={m} />)}

        {/* Integrations */}
        <SectionHeader title="Integrations" />
        {[
          { icon:'📅', title:'Connect Your Calendar', sub:'Sync with Google, Apple & Outlook' },
          { icon:'📲', title:'Home Screen Widgets',   sub:'Glanceable countdowns at a glance' },
        ].map((card,i) => (
          <View key={i} style={{ flexDirection:'row', alignItems:'center', gap:14,
            backgroundColor:'rgba(62,207,178,0.08)', borderWidth:1,
            borderColor:'rgba(62,207,178,0.18)', borderRadius:18, padding:14, marginBottom:9 }}>
            <Text style={{ fontSize:24 }}>{card.icon}</Text>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:14, fontWeight:'700', color:Colors.text1 }}>{card.title}</Text>
              <Text style={{ fontSize:12, color:Colors.text2, marginTop:2 }}>{card.sub}</Text>
            </View>
            <View style={{ backgroundColor:'rgba(62,207,178,0.14)', borderWidth:1,
              borderColor:'rgba(62,207,178,0.28)', borderRadius:20,
              paddingVertical:5, paddingHorizontal:10 }}>
              <Text style={{ fontSize:12, fontWeight:'600', color:Colors.teal }}>Soon</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity onPress={() => router.push('/modals/add-event')}
        style={{ position:'absolute', bottom:90, right:20, width:54, height:54,
          borderRadius:27, backgroundColor:Colors.accent,
          alignItems:'center', justifyContent:'center',
          shadowColor:Colors.accent, shadowOffset:{width:0,height:8},
          shadowOpacity:0.45, shadowRadius:16, elevation:8 }}>
        <Text style={{ fontSize:28, color:'#fff', lineHeight:32 }}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function SectionHeader({ title, onAdd }: { title:string; onAdd?:()=>void }) {
  return (
    <View style={{ flexDirection:'row', alignItems:'baseline', justifyContent:'space-between',
      marginTop:22, marginBottom:10, marginHorizontal:4 }}>
      <Text style={{ fontSize:18, fontWeight:'700', color:Colors.text1, letterSpacing:-0.3 }}>{title}</Text>
      {onAdd && (
        <TouchableOpacity onPress={onAdd}>
          <Text style={{ fontSize:13, color:Colors.accent, fontWeight:'500' }}>+ Add</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function EmptyState({ text }: { text:string }) {
  return (
    <View style={{ alignItems:'center', paddingVertical:22 }}>
      <Text style={{ color:Colors.text3, fontSize:14, textAlign:'center' }}>{text}</Text>
    </View>
  );
}
