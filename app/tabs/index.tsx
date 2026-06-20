import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useStore } from '../../store/useStore';
import { HeroCarousel } from '../../components/HeroCarousel';
import { QuoteCard } from '../../components/QuoteCard';
import { DateWeatherBar } from '../../components/DateWeatherBar';
import { nextOccurrence, daysUntil, pctElapsed, urgencyColor } from '../../utils/dates';

export default function HomeScreen() {
  const events      = useStore(s => s.events);
  const goals       = useStore(s => s.goals);
  const memories    = useStore(s => s.memories);
  const prefs       = useStore(s => s.prefs);
  const toggleEventFav = useStore(s => s.toggleEventFav);
  const toggleGoalFav  = useStore(s => s.toggleGoalFav);
  const nudgeGoal      = useStore(s => s.nudgeGoal);
  const [filter, setFilter] = useState('all');

  const FILTERS = [
    { id:'all',         label:'All' },
    { id:'travel',      label:'✈️ Travel' },
    { id:'celebration', label:'🎉 Celebration' },
    { id:'work',        label:'💼 Work' },
    { id:'personal',    label:'❤️ Personal' },
    { id:'goal',        label:'🎯 Goals' },
  ];

  const CAT_ACCENT: Record<string,string> = {
    travel:'#3ECFB2', celebration:'#7C6AF5', work:'#F0A04B', personal:'#E8507A',
  };

  const filteredEvents = filter === 'goal' ? [] :
    events
      .filter(e => filter === 'all' || e.cat === filter)
      .sort((a,b) => daysUntil(nextOccurrence(a)) - daysUntil(nextOccurrence(b)));

  const showGoals = filter === 'all' || filter === 'goal';
  const soonest = [...events].sort((a,b) => daysUntil(a.date) - daysUntil(b.date))[0];

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:Colors.bg }} edges={['top']}>
      <View style={{ paddingHorizontal:20, paddingBottom:10 }}>
        <Text style={{ fontSize:24, fontWeight:'700', color:Colors.text1, letterSpacing:-0.5 }}>
          Tempo<Text style={{ color:Colors.accent }}>.</Text>
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
        ) : filteredEvents.map(e => {
          const nd = nextOccurrence(e);
          const d  = daysUntil(nd);
          const p  = pctElapsed(e.created, nd);
          const uc = urgencyColor(d);
          const accent = CAT_ACCENT[e.cat] || Colors.accent;
          return (
            <TouchableOpacity key={e.id} activeOpacity={0.8}
              onPress={() => router.push({ pathname:'/modals/edit-event', params:{ id:e.id } })}
              style={{ backgroundColor:Colors.surf, borderRadius:18, borderWidth:1,
                borderColor:Colors.border, padding:14, paddingLeft:16,
                marginBottom:8, flexDirection:'row', alignItems:'center', gap:12 }}>
              <View style={{ position:'absolute', left:0, top:0, bottom:0,
                width:3, backgroundColor:accent, borderRadius:2 }} />
              <View style={{ width:42, height:42, borderRadius:12,
                backgroundColor: e.cat==='travel' ? 'rgba(62,207,178,0.11)' :
                  e.cat==='celebration' ? 'rgba(124,106,245,0.11)' :
                  e.cat==='work' ? 'rgba(240,160,75,0.11)' : 'rgba(232,80,122,0.11)',
                alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontSize:20 }}>{e.emoji}</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:14, fontWeight:'600', color:Colors.text1 }}
                  numberOfLines={1}>{e.name}</Text>
                <Text style={{ fontSize:11, color:Colors.text3, marginTop:2 }}>
                  {new Date(nd+'T00:00:00').toLocaleDateString('en-US',
                    { weekday:'short', month:'short', day:'numeric', year:'numeric' })}
                </Text>
                <View style={{ height:2, backgroundColor:'rgba(255,255,255,0.06)',
                  borderRadius:1, marginTop:7, overflow:'hidden' }}>
                  <View style={{ height:'100%', width:p+'%',
                    backgroundColor:uc, borderRadius:1 }} />
                </View>
              </View>
              <View style={{ alignItems:'flex-end', gap:6 }}>
                <View style={{ alignItems:'flex-end' }}>
                  <Text style={{ fontSize:20, fontWeight:'800', color:uc }}>{d}</Text>
                  <Text style={{ fontSize:9, color:Colors.text3, textTransform:'uppercase' }}>
                    {d===1?'day':'days'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => toggleEventFav(e.id)}>
                  <Text style={{ fontSize:16 }}>{e.fav?'⭐':'☆'}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Goals */}
        {showGoals && <>
          <SectionHeader title="Goals" onAdd={() => router.push('/modals/add-goal')} />
          {goals.length === 0
            ? <EmptyState text="No goals yet. Tap + Add to create one." />
            : goals.map(g => {
              const gp   = Math.round(Math.min(100,(g.current/g.target)*100));
              const d    = daysUntil(g.date);
              const done = g.current >= g.target;
              return (
                <View key={g.id} style={{ backgroundColor:Colors.surf, borderRadius:18,
                  borderWidth:1, borderColor:'rgba(62,207,178,0.2)',
                  padding:14, paddingLeft:16, marginBottom:8 }}>
                  <View style={{ position:'absolute', left:0, top:0, bottom:0,
                    width:3, backgroundColor:Colors.teal, borderRadius:2 }} />
                  <View style={{ flexDirection:'row', alignItems:'center', gap:12, marginBottom:10 }}>
                    <View style={{ width:42, height:42, borderRadius:12,
                      backgroundColor:'rgba(62,207,178,0.11)',
                      alignItems:'center', justifyContent:'center' }}>
                      <Text style={{ fontSize:20 }}>{g.emoji}</Text>
                    </View>
                    <View style={{ flex:1 }}>
                      <Text style={{ fontSize:14, fontWeight:'600', color:Colors.text1 }}
                        numberOfLines={1}>{g.name}</Text>
                      <Text style={{ fontSize:11, color:Colors.text3, marginTop:2 }}>
                        {new Date(g.date+'T00:00:00').toLocaleDateString('en-US',
                          { weekday:'short', month:'short', day:'numeric', year:'numeric' })}
                      </Text>
                    </View>
                    <View style={{ alignItems:'flex-end', gap:4 }}>
                      <Text style={{ fontSize:18, fontWeight:'800', color:Colors.teal }}>{d}</Text>
                      <Text style={{ fontSize:9, color:Colors.text3, textTransform:'uppercase' }}>days</Text>
                      <View style={{ flexDirection:'row', gap:6 }}>
                        <TouchableOpacity onPress={() => toggleGoalFav(g.id)}>
                          <Text style={{ fontSize:15 }}>{g.fav?'⭐':'☆'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() =>
                          router.push({ pathname:'/modals/edit-goal', params:{ id:g.id } })}>
                          <Text style={{ fontSize:15, color:Colors.text3 }}>✏️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                    <View style={{ flex:1 }}>
                      <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
                        <Text style={{ fontSize:12, fontWeight:'700', color:Colors.teal }}>
                          {g.current.toLocaleString()} {g.unit}
                        </Text>
                        <Text style={{ fontSize:12, color:Colors.text3 }}>
                          {g.target.toLocaleString()} {g.unit}
                        </Text>
                      </View>
                      <View style={{ height:6, backgroundColor:'rgba(255,255,255,0.07)',
                        borderRadius:3, overflow:'hidden' }}>
                        <View style={{ height:'100%', width:gp+'%',
                          backgroundColor:Colors.teal, borderRadius:3 }} />
                      </View>
                    </View>
                    <Text style={{ fontSize:11, fontWeight:'700', color:Colors.teal }}>{gp}%</Text>
                    {!done && (
                      <View style={{ flexDirection:'row', gap:5 }}>
                        <TouchableOpacity onPress={() => nudgeGoal(g.id, -1)}
                          style={{ width:30, height:30, borderRadius:15,
                            backgroundColor:'rgba(255,255,255,0.08)',
                            alignItems:'center', justifyContent:'center' }}>
                          <Text style={{ color:Colors.text2, fontWeight:'700', fontSize:18 }}>−</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => nudgeGoal(g.id, 1)}
                          style={{ width:30, height:30, borderRadius:15,
                            backgroundColor:'rgba(62,207,178,0.18)',
                            alignItems:'center', justifyContent:'center' }}>
                          <Text style={{ color:Colors.teal, fontWeight:'700', fontSize:18 }}>+</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
        </>}

        {/* Milestones */}
        <SectionHeader title="Milestones" />
        {soonest ? (() => {
          const days = daysUntil(soonest.date);
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
          : memories.map(m => {
            const TYPE_COLOR: Record<string,string> = {
              birthday:Colors.rose, anniversary:Colors.accent,
              lifelog:Colors.teal,  milestone:Colors.amber,
            };
            const color  = TYPE_COLOR[m.type] || Colors.accent;
            const o      = new Date(m.originDate + 'T00:00:00');
            const years  = new Date().getFullYear() - o.getFullYear();
            const count  = m.entries.length;
            return (
              <TouchableOpacity key={m.id} activeOpacity={0.8}
                onPress={() => router.push({ pathname:'/modals/edit-memory', params:{ id:m.id } })}
                style={{ backgroundColor:Colors.surf, borderRadius:18, borderWidth:1,
                  borderColor: m.type==='birthday' ? 'rgba(232,80,122,0.28)' :
                    m.type==='anniversary' ? 'rgba(124,106,245,0.28)' :
                    m.type==='lifelog' ? 'rgba(62,207,178,0.28)' : 'rgba(240,160,75,0.28)',
                  marginBottom:10, overflow:'hidden' }}>
                <View style={{ height:3, backgroundColor:color }} />
                <View style={{ flexDirection:'row', alignItems:'center', gap:12, padding:14 }}>
                  <View style={{ width:44, height:44, borderRadius:13,
                    backgroundColor: m.type==='birthday' ? 'rgba(232,80,122,0.12)' :
                      m.type==='anniversary' ? 'rgba(124,106,245,0.12)' :
                      m.type==='lifelog' ? 'rgba(62,207,178,0.11)' : 'rgba(240,160,75,0.11)',
                    alignItems:'center', justifyContent:'center' }}>
                    <Text style={{ fontSize:22 }}>{m.emoji}</Text>
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontSize:14, fontWeight:'700', color:Colors.text1 }}>{m.name}</Text>
                    <Text style={{ fontSize:11, color:Colors.text3, marginTop:2 }}>
                      {o.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })}
                    </Text>
                  </View>
                  <View style={{ alignItems:'flex-end' }}>
                    <Text style={{ fontSize:20, fontWeight:'800', color, letterSpacing:-1 }}>
                      {m.type==='lifelog' ? count : years}
                    </Text>
                    <Text style={{ fontSize:9, color:Colors.text3, textTransform:'uppercase' }}>
                      {m.type==='lifelog' ? (count===1?'time':'times') : 'years'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

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
